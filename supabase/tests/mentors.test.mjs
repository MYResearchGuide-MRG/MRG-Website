import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('mentor access is limited to assigned private projects and is read-only', async () => {
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`)
  for (const name of ['202611040001_myssp_access.sql','202611040003_roster_and_trash.sql','202611070001_mentor_access.sql','202611070003_mentor_account_management.sql'])
    await db.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'))
  const admin='00000000-0000-0000-0000-000000000001'
  const mentor='00000000-0000-0000-0000-000000000002'
  const outsider='00000000-0000-0000-0000-000000000003'
  await db.exec(`insert into auth.users values('${admin}','admin@example.com'),('${outsider}','other@example.com');
    insert into myssp_admins values('${admin}');
    insert into myssp_projects(id,code,payload) values('one','A-1','{"team":[]}'),('two','A-2','{"team":[]}');
    insert into myssp_submissions(project_id,content) values('one',
      '{"projectId":"one","version":1,"overviewFormat":"markdown","title":"Project one","summary":"Abstract","question":"","method":"","findings":"","slides":"","paper":"","video":"","teamMembers":[]}');`)
  async function as(role,id='') { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`) }
  const count = async table => (await db.query(`select count(*)::int as n from ${table}`)).rows[0].n
  await as('anon')
  assert.equal(await count('myssp_projects'),0)
  await assert.rejects(() => count('myssp_mentors'))
  await as('authenticated',outsider)
  await assert.rejects(() => db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6)',[null,'Bad','bad@example.com','Org',['one'],false]))
  await as('authenticated',admin)
  const saved = await db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6) as id',[null,'Dr. Mentor','mentor@example.com','Example University',['one'],false])
  const mentorId = saved.rows[0].id
  await db.exec('reset role')
  await db.query('insert into auth.users(id,email) values($1,$2)',[mentor,'mentor@example.com'])
  await db.query('update myssp_mentors set user_id=$1 where id=$2',[mentor,mentorId])
  await as('authenticated',mentor)
  assert.equal(await count('myssp_projects'),1)
  assert.equal(await count('myssp_submissions'),1)
  assert.equal(await count('myssp_mentors'),1)
  assert.equal(await count('myssp_mentor_projects'),1)
  assert.equal((await db.query('select myssp_is_member($1) as allowed',['one'])).rows[0].allowed,false)
  assert.equal((await db.query("update myssp_projects set published=true where id='one' returning id")).rows.length,0)
  await assert.rejects(() => db.query('select myssp_save_submission($1,$2,$3)',['one',{projectId:'one'},1]))
  await assert.rejects(() => db.query('select myssp_import_mentors($1)',[[{name:'Other',email:'other@example.com',project_ids:['two']}]]))

  await as('authenticated',admin)
  await db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6)',[mentorId,'Dr. Mentor','mentor@example.com','Example University',['two'],false])
  await as('authenticated',mentor)
  assert.deepEqual((await db.query('select id from myssp_projects')).rows.map(row=>row.id),['two'])
  assert.equal(await count('myssp_submissions'),0)

  await as('authenticated',admin)
  await db.query('select myssp_split_project($1,$2,$3)', ['two', [
    {id:'child-a',code:'A-2A',payload:{title:'Team A',team:[]}},
    {id:'child-b',code:'A-2B',payload:{title:'Team B',team:[]}},
  ], {}])
  await as('authenticated',mentor)
  assert.equal(await count('myssp_projects'),2)
  assert.deepEqual((await db.query('select id from myssp_projects order by id')).rows.map(row=>row.id),['child-a','child-b'])
  assert.equal((await db.query('select myssp_is_mentor($1) as allowed',['two'])).rows[0].allowed,false)
  for (const project of ['child-a','child-b']) {
    assert.equal((await db.query('select myssp_is_mentor($1) as allowed',[project])).rows[0].allowed,true)
    await assert.rejects(() => db.query('select myssp_save_submission($1,$2,$3)',[project,{projectId:project},1]))
  }
  await as('authenticated',admin)
  await db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6)',[mentorId,'Dr. Mentor','mentor@example.com','Example University',['child-a','child-b'],true])
  await as('authenticated',mentor)
  assert.equal(await count('myssp_projects'),0)
  assert.equal(await count('myssp_submissions'),0)
  // Deleted mentors cannot read, invite, edit or restore themselves.
  await as('authenticated',admin)
  await db.query('select myssp_set_mentor_deleted($1,true)',[mentorId])
  await assert.rejects(() => db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6)',[mentorId,'Changed','mentor@example.com','Lab',['child-a','child-b'],false]), /Mentor not found/)
  await as('service_role')
  assert.equal((await db.query('select myssp_claim_mentor_invitation($1) as claimed',[mentorId])).rows[0].claimed,false)
  await as('authenticated',mentor)
  assert.equal(await count('myssp_mentors'),0)
  assert.equal(await count('myssp_mentor_projects'),0)
  assert.equal(await count('myssp_projects'),0)
  await assert.rejects(() => db.query('select myssp_set_mentor_deleted($1,false)',[mentorId]),/Admin required/)
  await as('authenticated',outsider)
  await assert.rejects(() => db.query('select myssp_set_mentor_deleted($1,true)',[mentorId]),/Admin required/)
  await as('authenticated',admin)
  await db.query('select myssp_set_mentor_deleted($1,false)',[mentorId])
  assert.equal((await db.query('select revoked from myssp_mentors where id=$1',[mentorId])).rows[0].revoked,true)
  assert.equal(await count('myssp_submissions'),1)
  await db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6)',[mentorId,'Dr. Mentor','mentor@example.com','Lab',['child-a','child-b'],false])
  await as('authenticated',mentor)
  assert.equal(await count('myssp_projects'),2)

  // Change a previously invited identity, preserving both split assignments.
  await db.exec('reset role')
  await db.query('update myssp_mentors set invited_at=now(),invite_requested_at=now() where id=$1',[mentorId])
  await as('authenticated',admin)
  await assert.rejects(() => db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6)',[mentorId,'Dr. Mentor','other@example.com','Lab',['child-a','child-b'],false]),/sign-in account/)
  await db.query('select myssp_save_mentor($1,$2,$3,$4,$5,$6)',[mentorId,'Dr. Mentor','Corrected@example.com','Lab',['child-a','child-b'],false])
  const changed=(await db.query('select user_id,email,invited_at,invite_requested_at from myssp_mentors where id=$1',[mentorId])).rows[0]
  assert.deepEqual(changed,{user_id:null,email:'corrected@example.com',invited_at:null,invite_requested_at:null})
  assert.deepEqual((await db.query('select project_id from myssp_mentor_projects where mentor_id=$1 order by project_id',[mentorId])).rows.map(row=>row.project_id),['child-a','child-b'])
  await as('authenticated',mentor) // stale old session is denied immediately
  assert.equal(await count('myssp_projects'),0)
  assert.equal(await count('myssp_mentors'),0)
  await as('service_role')
  await assert.rejects(() => db.query('update myssp_mentors set user_id=$1 where id=$2',[mentor,mentorId]),/Mentor details changed/)
  await db.exec('reset role')
  const replacement='00000000-0000-0000-0000-000000000004'
  await db.query('insert into auth.users values($1,$2)',[replacement,'corrected@example.com'])
  await db.query('update myssp_mentors set user_id=$1 where id=$2',[replacement,mentorId])
  await as('authenticated',replacement)
  assert.equal(await count('myssp_projects'),2)
  await as('authenticated',admin)
  await db.query('select myssp_set_mentor_deleted($1,true)',[mentorId])
  await as('authenticated',replacement)
  assert.equal(await count('myssp_projects'),0)
  await as('authenticated',admin)
  await db.query('select myssp_set_mentor_deleted($1,false)',[mentorId])
  await as('authenticated',replacement)
  assert.equal(await count('myssp_projects'),2)
  await as('authenticated',admin)
  await assert.rejects(() => db.query('select myssp_import_mentors($1)',[[
    {name:'Good',email:'good@example.com',affiliation:'Lab',project_ids:['one']},
    {name:'Bad',email:'bad@example.com',affiliation:'Lab',project_ids:['missing']},
  ]]))
  assert.equal(await count('myssp_mentors'),1)
  assert.equal((await db.query('select myssp_import_mentors($1) as added',[[
    {name:'New',email:'new@example.com',affiliation:'Lab',project_ids:['child-a','child-b']},
  ]])).rows[0].added,1)
  assert.equal(await count('myssp_mentors'),2)
  assert.deepEqual((await db.query("select project_id from myssp_mentor_projects mp join myssp_mentors m on m.id=mp.mentor_id where m.email='new@example.com' order by project_id")).rows.map(row=>row.project_id),['child-a','child-b'])
  await db.close()
})
