import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('compact snapshots defer duplicate photos while preserving profiles, project pages, RLS and change detection',async()=>{
  const db=new PGlite()
  const admin='00000000-0000-0000-0000-000000000001',student='00000000-0000-0000-0000-000000000002',mentor='00000000-0000-0000-0000-000000000003'
  const photo='data:image/jpeg;base64,'+'A'.repeat(120000)
  const small='data:image/jpeg;base64,YQ=='
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`)
    for (const name of ['202611040001_myssp_access','202611040003_roster_and_trash','202611050001_participant_details',
      '202611050002_cohorts_and_projects','202611060001_research_fields','202611060002_self_profile','202611060003_admin_profile',
      '202611070001_mentor_access','202611070002_submission_deadline','202611070003_mentor_account_management',
      '202611210001_incremental_reads','202611230003_compact_dashboard_reads'])
      await db.exec(readFileSync(new URL(`../migrations/${name}.sql`,import.meta.url),'utf8'))
    await db.exec(`insert into auth.users values('${admin}','admin@example.test'),('${student}','student@example.test'),('${mentor}','mentor@example.test');
      insert into myssp_admins values('${admin}');
      insert into myssp_projects(id,code,payload,published,editing_enabled) values
      ('one','A-1','{"year":2026,"team":[]}',false,true),('two','A-2','{"year":2026,"team":[]}',true,false),
      ('fallback','A-3','{"year":2026,"team":[]}',false,false);
      insert into myssp_participants(user_id,name,email,project_id) values('${student}','Student','student@example.test','one'),
      (null,'Another student','other@example.test','two'),(null,'Not submitted','fallback@example.test','fallback');
      insert into myssp_mentors(user_id,name,email) values('${mentor}','Mentor','mentor@example.test');
      insert into myssp_mentor_projects select id,'one' from myssp_mentors;
      update myssp_cohorts set submission_closes_at=clock_timestamp()+interval '10 days';`)
    for (const id of ['one','two']) {
      const person=(await db.query('select id,name from myssp_participants where project_id=$1',[id])).rows[0]
      const content={projectId:id,version:1,overviewFormat:'markdown',title:id,summary:'Abstract',question:'',method:'',findings:'',slides:'',paper:'',video:'',savedAt:null,
        coverImage:small,teamMembers:[{id:person.id,name:person.name,school:'School',bio:'Research role',photo}]}
      await db.query('insert into myssp_submissions(project_id,content) values($1,$2)',[id,content])
    }
    await db.query("update myssp_participants set display_profile=jsonb_build_object('name',name,'photo',$1::text) where project_id='fallback'",[small])
    await db.exec("select myssp_sync_team('fallback')")
    const as=(role,id='')=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role}`)
    const read=async(known={})=>(await db.query('select myssp_backend_snapshot_v2($1) as data',[known])).rows[0].data
    const known=s=>({projects:Object.fromEntries(s.projects.map(p=>[p.id,p.version])),people:Object.fromEntries(s.people.map(p=>[p.id,p.version]))})
    await as('authenticated',admin)
    const legacy=(await db.query('select myssp_backend_snapshot() as data')).rows[0].data
    const compact=await read()
    assert.ok(JSON.stringify(compact).length<JSON.stringify(legacy).length/20)
    assert.equal(compact.projects.find(p=>p.id==='one').record.payload.team[0].photo,undefined)
    assert.equal(compact.projects.find(p=>p.id==='fallback').record.payload.team[0].photo,small)
    assert.ok(compact.people.every(p=>!p.record.display_profile.photo))
    assert.ok(legacy.projects.find(p=>p.id==='one').record.payload.team[0].photo)
    assert.equal((await db.query("select content from myssp_submissions where project_id='one'")).rows[0].content.teamMembers[0].photo,photo)
    const unchanged=await read(known(compact))
    assert.ok(unchanged.projects.every(p=>p.record===null))
    assert.ok(unchanged.people.every(p=>p.record===null))

    await as('authenticated',student)
    const personal=await read()
    assert.deepEqual(personal.projects.map(p=>p.id),['one','two'])
    assert.equal(personal.people.length,1)
    assert.equal(personal.people[0].record.display_profile.photo,photo)
    const original=(await db.query("select content,revision from myssp_submissions where project_id='one'")).rows[0]
    await db.query("select myssp_save_submission('one',$1,$2)",[{...original.content,summary:'Updated abstract'},original.revision])
    const afterText=await read(known(personal))
    assert.ok(afterText.projects.every(p=>p.record===null),'text edits must not invalidate project portraits')
    assert.ok(afterText.people.every(p=>p.record===null),'text edits must not invalidate participant portraits')
    assert.equal(afterText.submissions.find(s=>s.project_id==='one').revision,original.revision+1)
    await db.query('select myssp_update_own_profile($1,$2)',['New name',small])
    const afterProfile=await read(known(personal))
    assert.equal(afterProfile.people[0].record.display_profile.photo,small)
    assert.equal(afterProfile.projects.find(p=>p.id==='one').record.payload.team[0].name,'New name')
    assert.equal((await db.query("select content from myssp_submissions where project_id='one'")).rows[0].content.teamMembers[0].photo,small)

    await as('authenticated',mentor)
    assert.deepEqual((await read()).projects.map(p=>p.id),['one','two'])
    assert.deepEqual((await read()).people,[])
    await as('anon')
    assert.deepEqual((await read(known(compact))).projects.map(p=>p.id),['two'])
    assert.deepEqual((await read()).people,[])
    await as('authenticated',admin)
    await db.exec("update myssp_projects set published=false where id='two'")
    await as('anon')
    assert.deepEqual((await read(known(compact))).projects,[])
  } finally { await db.close() }
})
