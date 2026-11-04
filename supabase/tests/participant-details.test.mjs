import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const admin='00000000-0000-0000-0000-000000000001'
const student='00000000-0000-0000-0000-000000000002'
const migration=name=>readFileSync(new URL(`../migrations/${name}.sql`,import.meta.url),'utf8')

test('committee profile edits sync the team, preserve work and reject unauthorised or stale edits',async()=>{
  const db=new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`)
    await db.exec(migration('202611040001_myssp_access'))
    await db.exec(`insert into auth.users values('${admin}'),('${student}'); insert into myssp_admins values('${admin}');
      insert into myssp_projects(id,code,payload) values('one','A-1','{}'),('two','A-2','{}');`)
    await db.exec(migration('202611040003_roster_and_trash'))
    await db.exec(migration('202611050001_participant_details'))
    const profile={name:'Alex Student',school:'College',bio:'Keep this bio',photo:'data:image/jpeg;base64,YQ=='}
    const person=(await db.query(`insert into myssp_participants(user_id,name,email,project_id,display_profile)
      values($1,'Alex','alex@example.com','one',$2) returning id`,[student,profile])).rows[0].id
    await db.query('insert into myssp_submissions(project_id,content) values($1,$2)',['one',{projectId:'one',version:1,overviewFormat:'markdown',title:'Project title',summary:'Keep this research',question:'',method:'Method',findings:'',slides:'',paper:'',video:'',savedAt:null,teamMembers:[{id:person,...profile}]}])
    async function as(role,id=''){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role}`)}
    const edit=(name='Alex Chen',school='New college',project='one',oldName='Alex',oldSchool='College',oldProject='one',oldProfile='Alex Student')=>db.query(
      'select myssp_update_participant($1,$2,$3,$4,false,$5,$6,$7,false,$8)',[person,name,school,project,oldName,oldSchool,oldProject,oldProfile])
    const team=async id=>(await db.query('select payload from myssp_projects where id=$1',[id])).rows[0].payload.team
    await as('anon'); await assert.rejects(()=>edit())
    await as('authenticated',student); await assert.rejects(()=>edit())
    await assert.rejects(()=>db.exec("update myssp_participants set name='Changed'"))
    await as('authenticated',admin)
    await assert.rejects(()=>edit(''))
    await assert.rejects(()=>edit('x'.repeat(101)))
    await assert.rejects(()=>edit('Valid','x'.repeat(201)))
    await assert.rejects(()=>edit('Valid','College','missing'))
    await edit()
    const member=(await team('one'))[0]
    assert.equal(member.name,'Alex Chen'); assert.equal(member.school,'New college')
    assert.equal(member.bio,profile.bio); assert.equal(member.photo,profile.photo)
    const submission=(await db.query("select content from myssp_submissions where project_id='one'")).rows[0].content
    assert.equal(submission.summary,'Keep this research')
    assert.equal(submission.teamMembers[0].name,'Alex Chen')
    await assert.rejects(()=>edit()) // a second administrator's stale form
    await assert.rejects(()=>edit('Alex Chen','New college','two','Alex Chen','New college','one','Stale profile'))
    await edit('Alex Chen','New college','two','Alex Chen','New college','one','Alex Chen')
    assert.deepEqual(await team('one'),[])
    assert.equal((await team('two'))[0].photo,profile.photo)
    assert.equal((await db.query('select user_id,email from myssp_participants where id=$1',[person])).rows[0].user_id,student)
    await db.query('select myssp_set_deleted($1,$2,true,null)',['participant',person])
    await assert.rejects(()=>edit('Alex Chen','New college','two','Alex Chen','New college','two','Alex Chen'))
  } finally { await db.close() }
})
