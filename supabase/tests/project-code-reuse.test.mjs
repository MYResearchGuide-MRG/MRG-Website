import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const admin = '00000000-0000-0000-0000-000000000001'
const student = '00000000-0000-0000-0000-000000000002'
const mentor = '00000000-0000-0000-0000-000000000003'
const judge = '00000000-0000-0000-0000-000000000004'
const input = {year:2026,code:'A-6',title:'Original project',track:'AI & Computer Sciences',mentor:'',affiliation:'',description:''}
const migration = name => readFileSync(new URL(`../migrations/${name}.sql`,import.meta.url),'utf8')

test('reused codes preserve Trash history and isolate all project access by ID', async t => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`)
    for (const name of ['202611040001_myssp_access','202611040003_roster_and_trash','202611050001_participant_details',
      '202611050002_cohorts_and_projects','202611060001_research_fields','202611070001_mentor_access',
      '202611070003_mentor_account_management','202611140001_judging','202611230001_lineup_starts_judging'])
      await db.exec(migration(name))
    await db.exec(`insert into auth.users values('${admin}','admin@example.test'),('${student}','student@example.test');
      insert into myssp_admins values('${admin}');`)
    const as = (role,id='') => db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role}`)
    const save = async (details=input) => (await db.query('select myssp_save_project_brief($1) as id',[details])).rows[0].id
    const trash = (id,remove=true) => db.query("select myssp_set_deleted('project',$1,$2,null)",[id,remove])
    const row = async id => (await db.query('select * from myssp_projects where id=$1',[id])).rows[0]
    const unique = error => error.code === '23505'
    await as('authenticated',admin)
    const old = await save()
    await db.query('select myssp_import_participants($1)',[[{name:'Original student',email:'student@example.test',project_id:old}]])
    await db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6)',[null,'Mentor','mentor@example.test','University',[old],false])
    await db.query('select myssp_save_judge($1,2026,$2,$3,$4,$5)',[null,'Judge','judge@example.test','University',false])
    await db.query('select myssp_set_judging_lineup(2026,$1)',[[old]])
    await db.exec(`reset role;
      insert into auth.users values('${mentor}','mentor@example.test'),('${judge}','judge@example.test');
      update myssp_participants set user_id='${student}';
      update myssp_mentors set user_id='${mentor}';
      update myssp_judges set user_id='${judge}';`)
    const memberId = (await db.query('select id from myssp_participants where project_id=$1',[old])).rows[0].id
    await db.query('insert into myssp_submissions(project_id,content) values($1,$2)',[old,{projectId:old,version:1,overviewFormat:'markdown',
      title:'Original project',summary:'Keep this original work',question:'',method:'',findings:'',slides:'',paper:'',video:'',savedAt:null,
      teamMembers:[{id:memberId,name:'Original student',school:'',bio:'',photo:''}]}])
    await as('authenticated',admin)
    await trash(old)
    // Reproduce the reported failure before applying the migration.
    await assert.rejects(() => save(), unique)
    await db.exec('reset role')
    await db.exec(migration('202611230002_reuse_deleted_project_codes'))
    await as('authenticated',admin)
    const replacement = await save({...input,title:'Replacement project'})

    await t.test('creation reuses only deleted codes and restores reject collisions',async()=>{
      assert.notEqual(old,replacement)
      assert.ok((await row(old)).deleted_at)
      const current = await row(replacement)
      assert.equal(current.deleted_at,null)
      assert.equal(current.published,false)
      assert.equal(current.editing_enabled,false)
      assert.deepEqual(current.payload.team,[])
      assert.equal((await db.query('select count(*)::int as n from myssp_submissions where project_id=$1',[replacement])).rows[0].n,0)
      assert.equal((await db.query('select content from myssp_submissions where project_id=$1',[old])).rows[0].content.summary,'Keep this original work')
      await assert.rejects(() => save(),unique)
      await assert.rejects(() => trash(old,false),unique)
      assert.ok((await row(old)).deleted_at)
      await db.query('select myssp_create_cohort(2027,$1)',['MYSSP 2027'])
      await save({...input,year:2027})
      await trash(replacement)
      await trash(old,false)
      assert.equal((await row(old)).deleted_at,null)
      assert.equal((await row(old)).published,false)
      assert.equal((await row(old)).editing_enabled,false)
      await trash(old)
      await trash(replacement,false)
    })

    await t.test('participants, mentors, judges and public views do not inherit replacement access',async()=>{
      for (const user of [student,mentor,judge]) {
        await as('authenticated',user)
        assert.equal((await db.query('select id from myssp_projects where id=any($1)',[[old,replacement]])).rows.length,0)
        await assert.rejects(()=>save(),/Admin required/)
        await assert.rejects(()=>trash(old,false),/Admin required/)
      }
      await as('anon')
      assert.equal((await db.query('select id from myssp_projects')).rows.length,0)
      await as('authenticated',admin)
      await db.query('select myssp_import_participants($1)',[[{name:'New student',email:'new@example.test',project_id:replacement}]])
      await assert.rejects(()=>db.query('select myssp_import_participants($1)',[[{name:'Wrong',email:'wrong@example.test',project_id:old}]]),/Unknown project/)
      assert.deepEqual((await row(replacement)).payload.team.map(p=>p.name),['New student'])
      await db.query('update myssp_projects set published=true where id=$1',[replacement])
      await as('anon')
      assert.deepEqual((await db.query('select id from myssp_projects')).rows.map(p=>p.id),[replacement])
      await as('authenticated',admin)
    })

    await t.test('split creation reuses trashed child codes but reserves the retired parent',async()=>{
      const parent = await save({...input,code:'I-3'})
      const oldChild = await save({...input,code:'I-3A'})
      await trash(oldChild)
      const children = ['A','B'].map(s=>({id:`new-child-${s.toLowerCase()}`,code:`I-3${s}`,payload:{...input,code:`I-3${s}`,title:`Team ${s}`,team:[]}}))
      await db.query('select myssp_split_project($1,$2,$3)',[parent,children,{}])
      assert.equal((await row(parent)).retired,true)
      assert.ok((await row(oldChild)).deleted_at)
      assert.equal((await row('new-child-a')).parent_id,parent)
      await assert.rejects(()=>save({...input,code:'I-3'}),unique)
      await assert.rejects(()=>trash(oldChild,false),unique)
    })

    await t.test('a burst of creates allows one replacement and rejects every duplicate',async()=>{
      const previous = await save({...input,code:'A-7'})
      await trash(previous)
      const results = await Promise.allSettled(Array.from({length:25},()=>save({...input,code:'A-7'})))
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
      assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='23505').length,24)
      assert.ok((await row(previous)).deleted_at)
    })
  } finally { await db.close() }
})
