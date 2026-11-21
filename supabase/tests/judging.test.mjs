import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"
import { test, afterEach } from "node:test"
const databases=[]
afterEach(async()=>{await Promise.all(databases.splice(0).map(db=>db.close()))})

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
  clarity: score, qa_depth: score, visual_aids: score, time_management: score,
  research_remarks: remarks, presentation_remarks: remarks,
})

test('versioned judge saves reject stale writes and a burst cannot overwrite the winning edit',async()=>{
  const {db,as,userA}=await openJudging()
  try {
    await db.exec('reset role')
    await db.exec(readFileSync(new URL('../migrations/202611210005_judging_save_versions.sql',import.meta.url),'utf8'))
    await as('authenticated',student)
    await assert.rejects(()=>db.query("select myssp_save_judge_review_v2('one',$1,false,null)",[full(3,'No access')]),/Judge access required/)
    await as('authenticated',userA)
    await assert.rejects(()=>db.query("select myssp_save_judge_feedback('one',$1,false)",[full(3,'Bypass')]),/permission denied/)
    const first=(await db.query("select myssp_save_judge_review_v2('one',$1,false,null) as review",[full(3,'First')])).rows[0].review
    const results=await Promise.allSettled(Array.from({length:50},(_,i)=>db.query("select myssp_save_judge_review_v2('one',$1,false,$2)",[full(4,'Burst '+i),first.updatedAt])))
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
    assert.equal(results.filter(r=>r.status==='rejected' && r.reason.code==='40001').length,49)
    await as('authenticated',admin)
    await db.query('select myssp_set_judging_state(2026,false,false)')
    await as('authenticated',userA)
    await assert.rejects(()=>db.query("select myssp_save_judge_review_v2('one',$1,false,null)",[full(1,'Closed')]),/changed|closed/)
  } finally {databases.splice(databases.indexOf(db),1);await db.close()}
})

async function setup() {
  const db = new PGlite()
  databases.push(db)
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
  await assert.rejects(() => db.query("select myssp_set_judging_lineup(2099,$1)", [[]]), /Cohort not found/)
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
  // Judging needs a lineup to open.
  await db.query("select myssp_set_judging_lineup(2027,$1)", [[]])
  await assert.rejects(() => db.query("select myssp_set_judging_state(2027,true,false)"), /Set the lineup/)
  await db.query("select myssp_set_judging_lineup(2027,$1)", [["next"]])
  await db.query("select myssp_set_judging_state(2026,true,false)")
  // While judging is open, the lineup is locked.
  await assert.rejects(() => db.query("select myssp_set_judging_lineup(2026,$1)", [["one", "two"]]), /Close judging before changing the lineup/)
  // Feedback is released only once judging is closed, so it can't change after release.
  await assert.rejects(() => db.query("select myssp_set_judging_state(2026,true,true)"), /Close judging before releasing/)
  await db.query("select myssp_set_judging_state(2026,true,false)")

  await as("authenticated", judgeA)
  // Draft can be partial; submit needs everything.
  const draft = await db.query("select myssp_save_judge_feedback('one',$1,false) as s", [{ clarity: 4, research_remarks: "" }])
  assert.equal(draft.rows[0].s, null)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,true)", [{ clarity: 4 }]), /Answer every score/)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ clarity: 6 }]), /1 to 5/)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ clarity: 2.5 }]), /1 to 5/)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ judge_id: "x" }]), /Unknown field/)
  // The client's camelCase names are not database fields.
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ researchRemarks: "x" }]), /Unknown field/)
  for (const project of ["gone", "extra", "next"])
    await assert.rejects(() => db.query(`select myssp_save_judge_feedback('${project}',$1,false)`, [{}]), /not in your lineup/)
  const submitted = await db.query("select myssp_save_judge_feedback('one',$1,true) as s", [full(2, "Struggled on sample size.")])
  assert.ok(submitted.rows[0].s)
  // A submitted review is final.
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [full(3, "Changed my mind.")]), /already submitted/)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,true)", [full(3, "Changed my mind.")]), /already submitted/)
  assert.equal((await db.query("select data_collection from myssp_judge_feedback where project_id='one'")).rows[0].data_collection, 2)

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
  // Closing judging unlocks the lineup again.
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_lineup(2026,$1)", [["two", "one"]])

  // Paused judges lose access immediately.
  await as("authenticated", admin)
  await db.query("select myssp_save_judge($1,2026,$2,$3,$4,$5)", [ids.a, "Judge a", "a@judge.test", "Uni", true])
  await as("authenticated", judgeA)
  assert.equal(await count("myssp_projects"), 0)
  assert.equal(await count("myssp_judge_feedback"), 0)
  assert.equal(await count("myssp_judging_lineup"), 0)
})

test("teams see every submitted review in full, labelled by judge type, only after release", async () => {
  const { db, as } = await setup()
  await as("authenticated", admin)
  const a = (await db.query("select myssp_save_judge($1,2026,'A','a2@judge.test','',false) as id", [null])).rows[0].id
  const b = (await db.query("select myssp_save_judge($1,2026,'B','b2@judge.test','',false,'special') as id", [null])).rows[0].id
  await assert.rejects(() => db.query("select myssp_save_judge($1,2026,'D','d2@judge.test','',false,'guest')", [null]), /Invalid judge details/)
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
  await db.query("select myssp_save_judge_feedback('one',$1,false)", [{ clarity: 1, research_remarks: "Unsubmitted draft" }])

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
  const byRemark = reviews => Object.fromEntries(reviews.map(review => [review.researchRemarks, review]))
  assert.equal(released.released, true)
  assert.equal(released.reviews.length, 2)
  assert.deepEqual(byRemark(released.reviews)["Remark A"], { kind: "main", data_collection: 2, analysis: 2, findings_validity: 2, structure: 2, clarity: 2, qa_depth: 2, visual_aids: 2, time_management: 2, researchRemarks: "Remark A", presentationRemarks: "Remark A" })
  assert.deepEqual(byRemark(released.reviews)["Remark B"], { kind: "special", data_collection: 5, analysis: 5, findings_validity: 5, structure: 5, clarity: 4, qa_depth: 5, visual_aids: 5, time_management: 5, researchRemarks: "Remark B", presentationRemarks: "Remark B" })
  assert.ok(!("averages" in released))
  for (const id of [a, b, "A", "B"]) assert.ok(!JSON.stringify(released).includes(`"${id}"`))

  // Another team's feedback is off limits.
  await assert.rejects(() => feedback(otherStudent, "one"), /Not allowed/)
  assert.deepEqual(await feedback(otherStudent, "two"), { released: true, reviews: [] })

  // Deleting a judge's account in a later year keeps their review for the team.
  await as("authenticated", admin)
  await db.query("select myssp_set_judge_deleted($1,true)", [b])
  const afterDelete = await feedback(student)
  assert.deepEqual(afterDelete.reviews.map(review => review.researchRemarks).sort(), ["Remark A", "Remark B"])
  await db.exec("reset role")
  await assert.rejects(() => db.query("delete from myssp_judges where id=$1", [b]), /foreign key/)

  // Only the committee can discard a review, e.g. a test submission.
  await as("authenticated", student)
  await assert.rejects(() => db.query("select myssp_discard_judge_feedback($1,'one')", [a]), /Admin required/)
  await as("authenticated", admin)
  await db.query("select myssp_discard_judge_feedback($1,'one')", [a])
  await assert.rejects(() => db.query("select myssp_discard_judge_feedback($1,'one')", [a]), /Review not found/)
  assert.deepEqual((await feedback(student)).reviews.map(review => review.researchRemarks), ["Remark B"])
})

// Shared fixture for the tests below: judges A (main) and B (special) in 2026,
// both linked to logins, lineup one,two, judging open.
async function openJudging() {
  const ctx = await setup()
  const { db, as } = ctx
  const userA = "00000000-0000-0000-0000-0000000000d1", userB = "00000000-0000-0000-0000-0000000000d2"
  await as("authenticated", admin)
  const a = (await db.query("select myssp_save_judge($1,2026,'A','a3@judge.test','',false) as id", [null])).rows[0].id
  const b = (await db.query("select myssp_save_judge($1,2026,'B','b3@judge.test','',false,'special') as id", [null])).rows[0].id
  await db.exec(`reset role;
    insert into auth.users values('${userA}','a3@judge.test'),('${userB}','b3@judge.test');
    update myssp_judges set user_id='${userA}' where id='${a}';
    update myssp_judges set user_id='${userB}' where id='${b}';`)
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_lineup(2026,$1)", [["one", "two"]])
  await db.query("select myssp_set_judging_state(2026,true,false)")
  return { ...ctx, a, b, userA, userB }
}
const submittedAt = async (db, judge, project) =>
  (await db.query("select submitted_at from myssp_judge_feedback where judge_id=$1 and project_id=$2", [judge, project])).rows[0]?.submitted_at ?? null

test("closing judging submits complete drafts from active judges only", async () => {
  const { db, as, a, b, userA, userB } = await openJudging()
  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('one',$1,false)", [full(4, "Complete draft")])
  await db.query("select myssp_save_judge_feedback('two',$1,false)", [{ clarity: 3 }])
  await as("authenticated", userB)
  await db.query("select myssp_save_judge_feedback('one',$1,false)", [full(5, "Paused judge draft")])

  await as("authenticated", admin)
  await db.query("select myssp_save_judge($1,2026,'B','b3@judge.test','',true,'special')", [b])
  await db.query("select myssp_set_judging_state(2026,false,false)")
  await db.exec("reset role")
  assert.ok(await submittedAt(db, a, "one"))
  assert.equal(await submittedAt(db, a, "two"), null)
  assert.equal(await submittedAt(db, b, "one"), null)

  // Releasing after close shows only the auto-submitted review.
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_state(2026,false,true)")
  await as("authenticated", student)
  const released = (await db.query("select myssp_project_feedback('one') as f")).rows[0].f
  assert.deepEqual(released.reviews.map(review => review.researchRemarks), ["Complete draft"])
  // Reopening judging requires hiding feedback first.
  await as("authenticated", admin)
  await assert.rejects(() => db.query("select myssp_set_judging_state(2026,true,true)"), /Close judging before releasing/)
})

test("submitting all reviews is all or nothing", async () => {
  const { db, as, a, userA } = await openJudging()
  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('one',$1,false)", [full(4, "Ready")])
  // 'two' has no review yet: nothing is submitted.
  await assert.rejects(() => db.query("select myssp_submit_judge_reviews()"), /Complete every team/)
  await db.query("select myssp_save_judge_feedback('two',$1,false)", [{ ...full(3, "Half"), presentation_remarks: " " }])
  await assert.rejects(() => db.query("select myssp_submit_judge_reviews()"), /Complete every team/)
  await db.exec("reset role")
  assert.equal(await submittedAt(db, a, "one"), null)

  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('two',$1,false)", [full(3, "Done")])
  assert.equal((await db.query("select myssp_submit_judge_reviews() as n")).rows[0].n, 2)
  await db.exec("reset role")
  assert.ok(await submittedAt(db, a, "one"))
  assert.ok(await submittedAt(db, a, "two"))

  // Not a judge, or judging closed: refused.
  await as("authenticated", student)
  await assert.rejects(() => db.query("select myssp_submit_judge_reviews()"), /Judge access required/)
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_state(2026,false,false)")
  await as("authenticated", userA)
  await assert.rejects(() => db.query("select myssp_submit_judge_reviews()"), /Judging is closed/)
})

test("committee imports judges in bulk, all rows or none", async () => {
  const { db, as } = await setup()
  const rows = [
    { name: "One", email: "one@judge.test", affiliation: "Uni", cohort_year: 2026, kind: "main" },
    { name: "Two", email: "two@judge.test", affiliation: "", cohort_year: 2026, kind: "special" },
  ]
  await as("authenticated", student)
  await assert.rejects(() => db.query("select myssp_import_judges($1)", [rows]), /Admin required/)
  await as("authenticated", admin)
  await assert.rejects(() => db.query("select myssp_import_judges($1)", [[]]), /Import 1 to 100/)
  // A bad row rolls back the whole import.
  await assert.rejects(() => db.query("select myssp_import_judges($1)", [[...rows, { ...rows[0], email: "s@example.test" }]]), /participant/)
  assert.equal((await db.query("select count(*)::int as n from myssp_judges")).rows[0].n, 0)
  assert.equal((await db.query("select myssp_import_judges($1) as n", [rows])).rows[0].n, 2)
  assert.deepEqual((await db.query("select email, kind from myssp_judges order by email")).rows,
    [{ email: "one@judge.test", kind: "main" }, { email: "two@judge.test", kind: "special" }])
})

test("mentors read released feedback for their own projects only", async () => {
  const { db, as, userA } = await openJudging()
  const mentorUser = "00000000-0000-0000-0000-0000000000e1"
  await db.exec(`reset role; insert into auth.users values('${mentorUser}','mentor@example.test');
    update myssp_mentors set user_id='${mentorUser}' where email='mentor@example.test';
    insert into myssp_mentor_projects select id,'one' from myssp_mentors where email='mentor@example.test';`)
  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('one',$1,true)", [full(4, "For the mentor")])
  await as("authenticated", mentorUser)
  assert.deepEqual((await db.query("select myssp_project_feedback('one') as f")).rows[0].f, { released: false })
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_state(2026,false,true)")
  await as("authenticated", mentorUser)
  const released = (await db.query("select myssp_project_feedback('one') as f")).rows[0].f
  assert.deepEqual(released.reviews.map(review => review.researchRemarks), ["For the mentor"])
  await assert.rejects(() => db.query("select myssp_project_feedback('two')"), /Not allowed/)
})
