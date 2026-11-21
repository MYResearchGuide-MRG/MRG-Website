import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'

test('committee can reopen a cohort, preserve visibility and close edits again; other roles cannot change the schedule',async()=>{
  const db=new PGlite()
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`)
    for(const name of ['202611040001_myssp_access.sql','202611040003_roster_and_trash.sql','202611050001_participant_details.sql',
      '202611050002_cohorts_and_projects.sql','202611060002_self_profile.sql','202611070001_mentor_access.sql',
      '202611070002_submission_deadline.sql','202611070003_mentor_account_management.sql','202611210002_manage_submission_deadlines.sql'])
      await db.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'))
    const admin='00000000-0000-0000-0000-000000000001',student='00000000-0000-0000-0000-000000000002',mentor='00000000-0000-0000-0000-000000000003'
    const as=async(role,id='')=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role};`)
    const deadline=async(year=2026)=>(await db.query('select closes_at from myssp_submission_deadlines() where year=$1',[year])).rows[0].closes_at
    const schedule=(next,expected,reopen=false,closeNow=false,year=2026)=>db.query('select myssp_set_submission_deadline($1,$2,$3,$4,$5) as cutoff',[year,next,expected,reopen,closeNow])
    // Merely installing the controls does not reopen the existing cohort.
    assert.equal(new Date(await deadline()).toISOString(),'2026-11-20T16:00:00.000Z')
    await db.exec(`insert into auth.users values('${admin}','admin@example.test'),('${student}','student@example.test'),('${mentor}','mentor@example.test');
      insert into myssp_admins values('${admin}');
      insert into myssp_cohorts(year,name) values(2027,'MYSSP 2027');
      insert into myssp_projects(id,code,payload,editing_enabled,published) values
      ('one','A-1','{"year":2026,"team":[]}',false,false),
      ('two','A-2','{"year":2026,"team":[]}',false,true),
      ('retired','A-3','{"year":2026,"team":[]}',false,false),
      ('future','A-1','{"year":2027,"team":[]}',false,false);
      update myssp_projects set retired=true where id='retired';
      insert into myssp_participants(user_id,name,email,project_id) values('${student}','Student','student@example.test','one');
      insert into myssp_mentors(user_id,name,email) values('${mentor}','Mentor','mentor@example.test');
      insert into myssp_mentor_projects select id,'one' from myssp_mentors;
      update myssp_cohorts set submission_closes_at=clock_timestamp()-interval '1 hour' where year=2026;`)
    const memberId=(await db.query('select id from myssp_participants')).rows[0].id
    const body={projectId:'one',version:1,overviewFormat:'markdown',title:'Final corrections',summary:'Revised abstract',question:'',method:'',findings:'',slides:'',paper:'',video:'',teamMembers:[{id:memberId,name:'Student',school:'School',bio:'',photo:''}]}
    const old=await deadline(),future=new Date(Date.now()+86400000).toISOString()
    await as('anon')
    await assert.rejects(()=>schedule(future,old,true),/permission denied/)
    await as('authenticated',student)
    await assert.rejects(()=>schedule(future,old,true),/Committee access required/)
    await assert.rejects(()=>db.query('select myssp_save_submission($1,$2,$3)',['one',body,0]),/deadline has passed/)
    await as('authenticated',mentor)
    await assert.rejects(()=>schedule(future,old,true),/Committee access required/)
    await as('authenticated',admin)
    await assert.rejects(()=>schedule(old,old),/future closing time/)
    await assert.rejects(()=>schedule(future,null,false,false,2099),/Unknown cohort/)
    await assert.rejects(()=>schedule(future,old,true,true),/Choose a closing time/)
    await schedule(future,old)
    assert.equal((await db.query("select editing_enabled from myssp_projects where id='one'")).rows[0].editing_enabled,false)
    await assert.rejects(()=>schedule(null,old,true),/deadline changed/)
    await schedule(future,future,true)
    const projects=(await db.query('select id,editing_enabled,published from myssp_projects order by id')).rows
    assert.deepEqual(projects.map(p=>[p.id,p.editing_enabled,p.published]),[
      ['future',false,false],['one',true,false],['retired',false,false],['two',true,true]])
    assert.equal(await deadline(2027),null)
    await as('authenticated',student)
    await db.query('select myssp_save_submission($1,$2,$3)',['one',body,0])
    await db.query('select myssp_update_own_profile($1,$2)',['Student corrected',''])
    await assert.rejects(()=>db.query('select myssp_save_submission($1,$2,$3)',['two',{...body,projectId:'two'},0]),/Editing not allowed/)
    await as('authenticated',admin)
    await schedule(null,future,false,true)
    const closed=await deadline()
    await as('authenticated',student)
    await assert.rejects(()=>db.query('select myssp_save_submission($1,$2,$3)',['one',body,1]),/deadline has passed/)
    await assert.rejects(()=>db.query('select myssp_update_own_profile($1,$2)',['Late edit','']),/deadline has passed/)
    // A later review round works with the same account and new per-project locks.
    await as('authenticated',admin)
    await schedule(null,closed)
    await db.exec("update myssp_projects set editing_enabled=false where id='one'")
    await as('authenticated',student)
    await assert.rejects(()=>db.query('select myssp_save_submission($1,$2,$3)',['one',body,1]),/Editing not allowed/)
    await as('authenticated',admin)
    await schedule(future,null,true)
    await db.exec('update myssp_participants set revoked=true')
    await as('authenticated',student)
    await assert.rejects(()=>db.query('select myssp_save_submission($1,$2,$3)',['one',body,1]),/Editing not allowed/)
    await as('anon')
    assert.deepEqual((await db.query('select id from myssp_projects')).rows.map(r=>r.id),['two'])
  } finally {await db.close()}
})
