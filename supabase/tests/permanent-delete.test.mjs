import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const admin = '00000000-0000-0000-0000-000000000001'
const student = '00000000-0000-0000-0000-000000000002'
const folder = new URL('../migrations/', import.meta.url)
const migrations = readdirSync(folder).filter(name => name.endsWith('.sql')).sort()
const input = {year:2026,code:'A-6',title:'Purge me',track:'AI & Computer Sciences',mentor:'',affiliation:'',description:''}

test('only trashed records can be permanently deleted, and only by the committee', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`)
    for (const name of migrations) await db.exec(readFileSync(new URL(name, folder), 'utf8'))
    await db.exec(`insert into auth.users values('${admin}','admin@example.test'),('${student}','student@example.test');
      insert into myssp_admins values('${admin}');`)
    const as = (role,id='') => db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role}`)
    const purge = (kind,id) => db.query('select myssp_purge_deleted($1,$2)',[kind,id])
    const trash = (kind,id) => db.query('select myssp_set_deleted($1,$2,true,null)',[kind,id])
    const count = async (table,where,args) => Number((await db.query(`select count(*) from ${table} where ${where}`,args)).rows[0].count)

    await as('authenticated',admin)
    const project = (await db.query('select myssp_save_project_brief($1) as id',[input])).rows[0].id
    const keep = (await db.query('select myssp_save_project_brief($1) as id',[{...input,code:'A-7',title:'Keep me'}])).rows[0].id
    await db.query('select myssp_import_participants($1)',[[
      {name:'Ann',email:'ann@example.test',project_id:project},
      {name:'Ben',email:'ben@example.test',project_id:keep},
      {name:'Cat',email:'cat@example.test',project_id:keep},
    ]])
    await db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6)',[null,'Mentor','mentor@example.test','University',[project],false])
    await db.exec(`reset role; update myssp_participants set user_id='${student}' where email='ben@example.test';`)
    await db.query('insert into myssp_submissions(project_id,content) values($1,$2)',[project,{projectId:project,version:1,
      overviewFormat:'markdown',title:'Purge me',summary:'Abstract',question:'',method:'',findings:'',slides:'',paper:'',video:'',savedAt:null,
      teamMembers:(await db.query("select id::text,name,'' school,'' bio,'' photo from myssp_participants where project_id=$1",[project])).rows}])
    const ben = (await db.query("select id from myssp_participants where email='ben@example.test'")).rows[0].id

    await as('authenticated',admin)
    await assert.rejects(() => purge('project',project), /Trash first/)
    await assert.rejects(() => purge('participant',ben), /Trash first/)

    await trash('project',project)
    await trash('participant',ben)
    await as('authenticated',student)
    await assert.rejects(() => purge('project',project))
    await as('anon')
    await assert.rejects(() => purge('participant',ben))

    await as('authenticated',admin)
    await purge('participant',ben)
    await purge('project',project)
    await as('postgres')
    assert.equal(await count('myssp_projects','id=$1',[project]),0)
    assert.equal(await count('myssp_submissions','project_id=$1',[project]),0)
    assert.equal(await count('myssp_participants','project_id=$1',[project]),0)
    assert.equal(await count('myssp_mentor_projects','project_id=$1',[project]),0)
    assert.equal(await count('myssp_participants','id=$1',[ben]),0)
    // Unrelated records and the auth account stay untouched.
    assert.equal(await count('myssp_participants','project_id=$1',[keep]),1)
    assert.equal((await db.query('select payload from myssp_projects where id=$1',[keep])).rows[0].payload.team.length,1)
    assert.equal(await count('auth.users','id=$1',[student]),1)
  } finally {
    await db.close()
  }
})
