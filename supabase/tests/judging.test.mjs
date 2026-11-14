import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"
import { test } from "node:test"

const migrations = [
  "202611040001_myssp_access.sql",
  "202611040003_roster_and_trash.sql",
  "202611050001_participant_details.sql",
  "202611050002_cohorts_and_projects.sql",
  "202611070001_mentor_access.sql",
  "202611070003_mentor_account_management.sql",
  "202611140001_judging.sql",
]

const admin = "00000000-0000-0000-0000-000000000001"
const judgeA = "00000000-0000-0000-0000-00000000000a"
const judgeB = "00000000-0000-0000-0000-00000000000b"
const student = "00000000-0000-0000-0000-000000000005"
const otherStudent = "00000000-0000-0000-0000-000000000006"

const full = (score, remarks) => ({
  data_collection: score, analysis: score, findings_validity: score, structure: score,
  clarity: score, qa_depth: score, visual_aids: score, time_management: score, remarks,
})

async function setup() {
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`)
  for (const name of migrations)
    await db.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"))
  await db.exec(`insert into auth.users values('${admin}','admin@example.test'),
      ('${student}','s@example.test'),('${otherStudent}','o@example.test');
    insert into myssp_admins values('${admin}');
    insert into myssp_projects(id,code,payload) values
      ('one','A-1','{"year":2026,"team":[]}'),('two','A-2','{"year":2026,"team":[]}'),
      ('gone','A-3','{"year":2026,"team":[]}'),('extra','A-4','{"year":2026,"team":[]}');
    insert into myssp_cohorts(year,name) values(2027,'MYSSP 2027');
    insert into myssp_projects(id,code,payload) values('next','B-1','{"year":2027,"team":[]}');
    insert into myssp_mentors(name,email) values('Mentor','mentor@example.test');
    update myssp_projects set deleted_at=now() where id='gone';
    insert into myssp_participants(user_id,name,email,project_id) values
      ('${student}','Student','s@example.test','one'),('${otherStudent}','Other','o@example.test','two');`)
  const as = async (role, id = "") =>
    db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`)
  return { db, as }
}

test("judges read only their cohort's lineup, save their own feedback, and only while judging is open", async () => {
  const { db, as } = await setup()
  const count = async table => (await db.query(`select count(*)::int as n from ${table}`)).rows[0].n

  await as("authenticated", judgeA)
  await assert.rejects(() => db.query("select myssp_save_judge($1,2026,$2,$3,$4,$5)", [null, "X", "x@judge.test", "", false]), /Admin required/)

  await as("authenticated", admin)
  await assert.rejects(() => db.query("select myssp_save_judge($1,2026,$2,$3,$4,$5)", [null, "Student", "s@example.test", "", false]), /participant/)
  await assert.rejects(() => db.query("select myssp_save_judge($1,2026,$2,$3,$4,$5)", [null, "Mentor", "mentor@example.test", "", false]), /mentor/)
  await assert.rejects(() => db.query("select myssp_save_judge($1,1999,$2,$3,$4,$5)", [null, "Old", "old@judge.test", "", false]), /Cohort not found/)
  const ids = {}
  for (const [key, email] of [["a", "a@judge.test"], ["b", "b@judge.test"]])
    ids[key] = (await db.query("select myssp_save_judge($1,2026,$2,$3,$4,$5) as id", [null, `Judge ${key}`, email, "Uni", false])).rows[0].id
  await assert.rejects(() => db.query("select myssp_save_judge($1,2026,$2,$3,$4,$5)", [null, "Dup", "a@judge.test", "", false]), /already belongs to a judge/)
  // Accounts are linked by the invitation function; simulate it here.
  await db.exec(`reset role; insert into auth.users values('${judgeA}','a@judge.test'),('${judgeB}','b@judge.test');
    update myssp_judges set user_id='${judgeA}' where email='a@judge.test';
    update myssp_judges set user_id='${judgeB}' where email='b@judge.test';`)

  // Before a lineup exists, judges see no projects.
  await as("anon")
  assert.equal(await count("myssp_projects"), 0)
  await as("authenticated", judgeA)
  assert.equal(await count("myssp_projects"), 0)
  assert.equal(await count("myssp_judges"), 1)

  // Lineup: admin only, active projects in this cohort only.
  await assert.rejects(() => db.query("select myssp_set_judging_lineup(2026,$1)", [["two", "one"]]), /Admin required/)
  await as("authenticated", admin)
  await assert.rejects(() => db.query("select myssp_set_judging_lineup(2026,$1)", [["two", "gone"]]), /active projects/)
  await assert.rejects(() => db.query("select myssp_set_judging_lineup(2026,$1)", [["two", "two"]]), /Invalid lineup/)
  await assert.rejects(() => db.query("select myssp_set_judging_lineup(2026,$1)", [["two", "next"]]), /active projects/)
  await db.query("select myssp_set_judging_lineup(2026,$1)", [["two", "one"]])
  await db.query("select myssp_set_judging_lineup(2027,$1)", [["next"]])
  await as("authenticated", judgeA)
  assert.deepEqual((await db.query("select project_id from myssp_judging_lineup order by position")).rows.map(r => r.project_id), ["two", "one"])
  // Unpublished lineup projects are visible; non-lineup and other-cohort projects are not.
  assert.deepEqual((await db.query("select id from myssp_projects order by id")).rows.map(r => r.id), ["one", "two"])
  await as("authenticated", student)
  assert.equal(await count("myssp_judging_lineup"), 0)

  // Closed by default.
  await as("authenticated", judgeA)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ clarity: 4 }]), /Judging is closed/)
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_state(2026,true,false)")

  await as("authenticated", judgeA)
  // Draft can be partial; submit needs everything.
  const draft = await db.query("select myssp_save_judge_feedback('one',$1,false) as s", [{ clarity: 4, remarks: "" }])
  assert.equal(draft.rows[0].s, null)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,true)", [{ clarity: 4 }]), /Answer every score/)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ clarity: 6 }]), /1 to 5/)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ clarity: 2.5 }]), /1 to 5/)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ judge_id: "x" }]), /Unknown field/)
  for (const project of ["gone", "extra", "next"])
    await assert.rejects(() => db.query(`select myssp_save_judge_feedback('${project}',$1,false)`, [{}]), /not in your lineup/)
  const submitted = await db.query("select myssp_save_judge_feedback('one',$1,true) as s", [full(2, "Struggled on sample size.")])
  assert.ok(submitted.rows[0].s)
  // Editing after submit is allowed but cannot become incomplete.
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ ...full(3, ""), remarks: "" }]), /Answer every score/)
  await db.query("select myssp_save_judge_feedback('one',$1,false)", [full(3, "Struggled on sample size.")])

  await as("authenticated", judgeB)
  await db.query("select myssp_save_judge_feedback('one',$1,true)", [full(5, "Great work!")])
  await db.query("select myssp_save_judge_feedback('two',$1,false)", [{ clarity: 1 }])
  // A judge sees only their own reviews.
  assert.equal(await count("myssp_judge_feedback"), 2)
  assert.equal((await db.query("select count(*)::int as n from myssp_judge_feedback where judge_id<>$1", [ids.b])).rows[0].n, 0)
  await assert.rejects(() => db.query("insert into myssp_judge_feedback(judge_id,project_id) values($1,'two')", [ids.a]))

  // Admin sees all, closing judging stops writes.
  await as("authenticated", admin)
  assert.equal(await count("myssp_judge_feedback"), 3)
  await db.query("select myssp_set_judging_state(2026,false,false)")
  await as("authenticated", judgeA)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [full(4, "Late")]), /Judging is closed/)

  // Paused judges lose access immediately.
  await as("authenticated", admin)
  await db.query("select myssp_save_judge($1,2026,$2,$3,$4,$5)", [ids.a, "Judge a", "a@judge.test", "Uni", true])
  await as("authenticated", judgeA)
  assert.equal(await count("myssp_projects"), 0)
  assert.equal(await count("myssp_judge_feedback"), 0)
  assert.equal(await count("myssp_judging_lineup"), 0)
})

test("teams see only anonymised averages and remarks, only after release", async () => {
  const { db, as } = await setup()
  await as("authenticated", admin)
  const a = (await db.query("select myssp_save_judge($1,2026,'A','a2@judge.test','',false) as id", [null])).rows[0].id
  const b = (await db.query("select myssp_save_judge($1,2026,'B','b2@judge.test','',false) as id", [null])).rows[0].id
  const c = (await db.query("select myssp_save_judge($1,2026,'C','c2@judge.test','',false) as id", [null])).rows[0].id
  await db.exec(`reset role;
    insert into auth.users values('00000000-0000-0000-0000-0000000000c1','a2@judge.test'),
      ('00000000-0000-0000-0000-0000000000c2','b2@judge.test'),('00000000-0000-0000-0000-0000000000c3','c2@judge.test');
    update myssp_judges set user_id='00000000-0000-0000-0000-0000000000c1' where id='${a}';
    update myssp_judges set user_id='00000000-0000-0000-0000-0000000000c2' where id='${b}';
    update myssp_judges set user_id='00000000-0000-0000-0000-0000000000c3' where id='${c}';
    update myssp_cohorts set judging_open=true where year=2026;
    insert into myssp_judging_lineup values('one',2026,1),('two',2026,2);`)
  await as("authenticated", "00000000-0000-0000-0000-0000000000c1")
  await db.query("select myssp_save_judge_feedback('one',$1,true)", [full(2, "Remark A")])
  await as("authenticated", "00000000-0000-0000-0000-0000000000c2")
  await db.query("select myssp_save_judge_feedback('one',$1,true)", [{ ...full(5, "Remark B"), clarity: 4 }])
  await as("authenticated", "00000000-0000-0000-0000-0000000000c3")
  await db.query("select myssp_save_judge_feedback('one',$1,false)", [{ clarity: 1, remarks: "Unsubmitted draft" }])

  const feedback = async (user, project = "one") => {
    await as("authenticated", user)
    return (await db.query("select myssp_project_feedback($1) as f", [project])).rows[0].f
  }
  // Teams cannot read the raw table at all.
  await as("authenticated", student)
  assert.equal((await db.query("select count(*)::int as n from myssp_judge_feedback")).rows[0].n, 0)
  await as("anon")
  await assert.rejects(() => db.query("select myssp_project_feedback('one')"))

  assert.deepEqual(await feedback(student), { released: false })
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_state(2026,false,true)")

  const released = await feedback(student)
  assert.equal(released.released, true)
  assert.equal(released.reviews, 2)
  assert.equal(Number(released.averages.data_collection), 3.5)
  assert.equal(Number(released.averages.clarity), 3)
  assert.deepEqual([...released.remarks].sort(), ["Remark A", "Remark B"])
  assert.ok(!JSON.stringify(released).includes(a) && !JSON.stringify(released).includes(b))

  // Another team's feedback is off limits.
  await assert.rejects(() => feedback(otherStudent, "one"), /Not allowed/)
  assert.deepEqual(await feedback(otherStudent, "two"), { released: true, reviews: 0, averages: null, remarks: [] })

  // Deleting a judge's account in a later year keeps their review for the team.
  await as("authenticated", admin)
  await db.query("select myssp_set_judge_deleted($1,true)", [b])
  const afterDelete = await feedback(student)
  assert.equal(afterDelete.reviews, 2)
  assert.deepEqual([...afterDelete.remarks].sort(), ["Remark A", "Remark B"])
  await db.exec("reset role")
  await assert.rejects(() => db.query("delete from myssp_judges where id=$1", [b]), /foreign key/)

  // Only the committee can discard a review, e.g. a test submission.
  await as("authenticated", student)
  await assert.rejects(() => db.query("select myssp_discard_judge_feedback($1,'one')", [a]), /Admin required/)
  await as("authenticated", admin)
  await db.query("select myssp_discard_judge_feedback($1,'one')", [a])
  await assert.rejects(() => db.query("select myssp_discard_judge_feedback($1,'one')", [a]), /Review not found/)
  assert.deepEqual((await feedback(student)).remarks, ["Remark B"])
})
