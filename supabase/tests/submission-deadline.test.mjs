import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"
import { test } from "node:test"

test("database deadline blocks student project and profile writes but preserves reading and committee corrections",async()=>{
  const db=new PGlite()
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`)
  for(const name of ["202611040001_myssp_access.sql","202611040003_roster_and_trash.sql","202611050001_participant_details.sql","202611050002_cohorts_and_projects.sql","202611060002_self_profile.sql","202611070002_submission_deadline.sql"])
    await db.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),"utf8"))
  const admin="00000000-0000-0000-0000-000000000001",student="00000000-0000-0000-0000-000000000002"
  await db.exec(`insert into auth.users values('${admin}','admin@example.test'),('${student}','student@example.test');
    insert into myssp_admins values('${admin}');
    insert into myssp_projects(id,code,payload,editing_enabled) values('one','A-1','{"year":2026,"team":[]}',true);
    insert into myssp_participants(user_id,name,email,project_id) values('${student}','Student','student@example.test','one');`)
  const schedule=(await db.query("select * from myssp_submission_deadlines() where year=2026")).rows[0]
  assert.equal(new Date(schedule.closes_at).toISOString(),"2026-11-20T16:00:00.000Z")
  const id=(await db.query("select id from myssp_participants")).rows[0].id
  const content={projectId:"one",version:1,overviewFormat:"markdown",title:"Title",summary:"Abstract",question:"",method:"",findings:"",slides:"",paper:"",video:"",teamMembers:[{id,name:"Student",school:"School",bio:"",photo:""}]}
  async function as(role,user="") {await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);set role ${role};`)}
  const save=revision=>db.query("select myssp_save_submission($1,$2,$3)",["one",content,revision])
  await db.exec("update myssp_cohorts set submission_closes_at=clock_timestamp()+interval '1 hour' where year=2026")
  await as("authenticated",student)
  await save(0)
  await db.query("select myssp_update_own_profile($1,$2)",["Student updated",""])
  await as("postgres")
  await db.exec("update myssp_cohorts set submission_closes_at=clock_timestamp()-interval '1 second' where year=2026")
  const revision=(await db.query("select revision from myssp_submissions")).rows[0].revision
  await as("authenticated",student)
  await assert.rejects(()=>save(revision),/deadline has passed/)
  await assert.rejects(()=>db.query("select myssp_update_own_profile($1,$2)",["Bypass",""]),/deadline has passed/)
  await assert.rejects(()=>db.query("select myssp_save_submission_before_deadline($1,$2,$3)",["one",content,revision]),/permission denied/)
  await assert.rejects(()=>db.query("select myssp_update_own_profile_before_deadline($1,$2)",["Bypass",""]),/permission denied/)
  await assert.rejects(()=>db.exec("update myssp_cohorts set submission_closes_at=null"))
  assert.equal((await db.query("select count(*)::int n from myssp_projects")).rows[0].n,1)
  assert.equal((await db.query("select count(*)::int n from myssp_submissions")).rows[0].n,1)
  assert.equal((await db.query("select name from myssp_participants")).rows[0].name,"Student updated")
  await as("authenticated",admin)
  await db.exec("update myssp_projects set editing_enabled=true where id='one'")
  await as("authenticated",student)
  await assert.rejects(()=>save(revision),/deadline has passed/)
  await as("authenticated",admin)
  await db.query("select myssp_update_participant($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[id,"Committee correction","School","one",false,"Student updated","School","one",false,"Student updated"])
  assert.equal((await db.query("select name from myssp_participants")).rows[0].name,"Committee correction")
  await as("postgres")
  await db.exec("insert into myssp_cohorts(year,name) values(2027,'MYSSP 2027')")
  assert.equal((await db.query("select closes_at from myssp_submission_deadlines() where year=2027")).rows[0].closes_at,null)
  await as("anon")
  assert.equal((await db.query("select count(*)::int n from myssp_submissions")).rows[0].n,0)
  await db.close()
})
