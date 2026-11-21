import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('incremental reads preserve RLS, detect changes and omit unchanged photos and full submissions', async () => {
  const db=new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`)
    for (const name of ['202611040001_myssp_access.sql','202611040003_roster_and_trash.sql','202611050001_participant_details.sql',
      '202611050002_cohorts_and_projects.sql','202611060001_research_fields.sql','202611060002_self_profile.sql',
      '202611060003_admin_profile.sql','202611070001_mentor_access.sql','202611070002_submission_deadline.sql',
      '202611070003_mentor_account_management.sql','202611210001_incremental_reads.sql'])
      await db.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'))
    const admin='00000000-0000-0000-0000-000000000001',student='00000000-0000-0000-0000-000000000002',mentor='00000000-0000-0000-0000-000000000003'
    await db.exec(`insert into auth.users values('${admin}','admin@example.test'),('${student}','student@example.test'),('${mentor}','mentor@example.test');
      insert into myssp_admins values('${admin}');
      insert into myssp_projects(id,code,payload,published) values
      ('one','A-1','{"year":2026,"team":[]}',false),('two','A-2','{"year":2026,"team":[]}',false),('public','B-1','{"year":2026,"team":[]}',true);
      insert into myssp_participants(user_id,name,email,project_id) values('${student}','Student','student@example.test','one');
      insert into myssp_mentors(user_id,name,email) values('${mentor}','Mentor','mentor@example.test');
      insert into myssp_mentor_projects select id,'two' from myssp_mentors;
      update myssp_cohorts set submission_closes_at=clock_timestamp()-interval '1 second' where year=2026;`)
    const photo='data:image/jpeg;base64,'+'A'.repeat(160000)
    await db.query("update myssp_projects set payload=payload||jsonb_build_object('cover', $1::text) where id='one'",[photo])
    const memberId=(await db.query("select id from myssp_participants")).rows[0].id
    const body={projectId:'one',version:1,overviewFormat:'markdown',title:'Student title',summary:'Abstract',question:'',method:'',findings:'',slides:'',paper:'',video:'',coverImage:photo,
      teamMembers:[{id:memberId,name:'Student',school:'School',bio:'',photo:''}]}
    await db.query('insert into myssp_submissions(project_id,content) values($1,$2)',['one',body])
    const as=async(role,id='')=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role};`)
    const read=async(known={})=>(await db.query('select myssp_backend_snapshot($1) as data',[known])).rows[0].data
    const known=s=>({projects:Object.fromEntries(s.projects.map(r=>[r.id,r.version])),people:Object.fromEntries(s.people.map(r=>[r.id,r.version]))})
    await as('anon')
    let snapshot=await read()
    assert.deepEqual(snapshot.projects.map(p=>p.id),['public'])
    assert.deepEqual(snapshot.people,[])
    assert.deepEqual(snapshot.submissions,[])
    await as('authenticated',student)
    snapshot=await read()
    assert.deepEqual(snapshot.projects.map(p=>p.id),['one','public'])
    assert.equal(snapshot.people.length,1)
    assert.equal(snapshot.submissions[0].title,'Student title')
    assert.equal(snapshot.submissions[0].hasCover,true)
    assert.ok(!JSON.stringify(snapshot.submissions).includes('data:image'))
    assert.equal(snapshot.submissions[0].content,undefined)
    const unchanged=await read(known(snapshot))
    assert.ok(unchanged.projects.every(p=>p.record===null))
    assert.ok(unchanged.people.every(p=>p.record===null))
    assert.ok(JSON.stringify(unchanged).length<JSON.stringify(snapshot).length/20)
    // Knowing another user's cache token cannot make a private row visible.
    await as('authenticated',admin)
    const adminSnapshot=await read()
    assert.equal(adminSnapshot.projects.length,3)
    await as('anon')
    assert.deepEqual((await read(known(adminSnapshot))).projects.map(p=>p.id),['public'])
    await as('authenticated',mentor)
    assert.deepEqual((await read()).projects.map(p=>p.id),['two','public'])
    // Updating access changes the version and returns only that changed record.
    await as('authenticated',admin)
    await db.exec("update myssp_projects set editing_enabled=true where id='one'")
    const changed=await read(known(adminSnapshot))
    assert.ok(changed.projects.find(p=>p.id==='one').record)
    assert.ok(changed.projects.filter(p=>p.id!=='one').every(p=>p.record===null))
    await db.exec("update myssp_participants set revoked=true")
    await as('authenticated',student)
    snapshot=await read(known(snapshot))
    assert.deepEqual(snapshot.projects.map(p=>p.id),['public'])
    assert.deepEqual(snapshot.submissions,[])
    assert.deepEqual(snapshot.people,[])
    // This read-only optimisation must not unlock submissions after the deadline.
    await as('authenticated',admin)
    await db.exec("update myssp_participants set revoked=false")
    await as('authenticated',student)
    await assert.rejects(()=>db.query('select myssp_save_submission($1,$2,$3)',['one',body,1]),/deadline has passed/)
    await assert.rejects(()=>db.exec("update myssp_projects set cache_version=gen_random_uuid()"),/permission denied/)
  } finally { await db.close() }
})
