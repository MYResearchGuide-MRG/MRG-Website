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
  "202611230001_lineup_starts_judging.sql",
  "202611240001_judge_demo_day_attendance.sql",
  "202611250001_research_marking_window.sql",
  "202611260001_special_award_types.sql",
  "202611260002_purge_judges.sql",
  "202611260003_several_judges_per_award.sql",
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
    for (const file of [
      '202611210005_judging_save_versions.sql',
      '202611210002_manage_submission_deadlines.sql',
      '202611210003_submission_review_queue.sql',
      '202611280001_nonretryable_revision_conflicts.sql',
    ]) await db.exec(readFileSync(new URL('../migrations/'+file, import.meta.url), 'utf8'))
    const handlers = await db.query(`select prosrc from pg_proc
      where pronamespace = 'public'::regnamespace and proname in
      ('myssp_save_judge_review_v2', 'myssp_set_research_judging_window',
       'myssp_save_submission_review', 'myssp_set_submission_deadline')`)
    assert.equal(handlers.rows.length, 4)
    for (const {prosrc} of handlers.rows) {
      assert.match(prosrc, /'PT409'/)
      assert.doesNotMatch(prosrc, /'40001'/)
    }
    await as('authenticated',student)
    await assert.rejects(()=>db.query("select myssp_save_judge_review_v2('one',$1,false,null)",[full(3,'No access')]),/Judge access required/)
    await as('authenticated',userA)
    await assert.rejects(()=>db.query("select myssp_save_judge_feedback('one',$1,false)",[full(3,'Bypass')]),/permission denied/)
    const first=(await db.query("select myssp_save_judge_review_v2('one',$1,false,null) as review",[full(3,'First')])).rows[0].review
    const results=await Promise.allSettled(Array.from({length:50},(_,i)=>db.query("select myssp_save_judge_review_v2('one',$1,false,$2)",[full(4,'Burst '+i),first.updatedAt])))
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
    assert.equal(results.filter(r=>r.status==='rejected' && r.reason.code==='PT409').length,49)
    await as('authenticated',admin)
    await db.query('select myssp_set_judging_state(2026,false,false)')
    await as('authenticated',userA)
    await assert.rejects(()=>db.query("select myssp_save_judge_review_v2('one',$1,false,null)",[full(1,'Closed')]),/changed|closed/)
  } finally {databases.splice(databases.indexOf(db),1);await db.close()}
})

async function setup({ automaticMarking = true, through } = {}) {
  const db = new PGlite()
  databases.push(db)
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`)
  const applied = through ? migrations.slice(0, migrations.indexOf(through) + 1)
    : automaticMarking ? migrations : migrations.slice(0, migrations.indexOf("202611230001_lineup_starts_judging.sql"))
  for (const name of applied)
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

  // Saving the lineup starts marking, without an extra committee switch.
  await as("authenticated", judgeA)
  await db.query("select myssp_save_judge_feedback('one',$1,false)", [{ clarity: 4 }])
  await as("authenticated", student)
  assert.deepEqual((await db.query("select myssp_project_feedback('one') as f")).rows[0].f, { released: false })
  // The committee can still stop marking explicitly.
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_state(2026,false,false)")
  await as("authenticated", judgeA)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,false)", [{ clarity: 4 }]), /Judging is closed/)
  await as("authenticated", admin)
  // Judging needs a lineup to open.
  await db.query("select myssp_set_judging_state(2027,false,false)")
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
  assert.equal((await db.query("select judging_open from myssp_cohorts where year=2026")).rows[0].judging_open, true)

  // Paused judges lose access immediately.
  await as("authenticated", admin)
  await db.query("select myssp_save_judge($1,2026,$2,$3,$4,$5)", [ids.a, "Judge a", "a@judge.test", "Uni", true])
  await as("authenticated", judgeA)
  assert.equal(await count("myssp_projects"), 0)
  assert.equal(await count("myssp_judge_feedback"), 0)
  assert.equal(await count("myssp_judging_lineup"), 0)
})

test("empty and rejected lineups do not start marking, and released feedback cannot be silently reopened", async () => {
  const { db, as } = await setup()
  const switches = async () => (await db.query("select judging_open,feedback_released from myssp_cohorts where year=2026")).rows[0]
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_lineup(2026,$1)", [[]])
  assert.deepEqual(await switches(), { judging_open: false, feedback_released: false })
  for (const ids of [["one", "missing"], ["one", "one"], ["next"], [null]])
    await assert.rejects(() => db.query("select myssp_set_judging_lineup(2026,$1)", [ids]))
  assert.deepEqual(await switches(), { judging_open: false, feedback_released: false })
  assert.equal((await db.query("select count(*)::int as n from myssp_judging_lineup")).rows[0].n, 0)
  await db.query("select myssp_set_judging_lineup(2026,$1)", [["one"]])
  assert.deepEqual(await switches(), { judging_open: true, feedback_released: false })
  assert.equal((await db.query("select published from myssp_projects where id='one'")).rows[0].published, false)
  await db.query("select myssp_set_judging_state(2026,false,true)")
  await assert.rejects(() => db.query("select myssp_set_judging_lineup(2026,$1)", [["two"]]), /Hide released feedback/)
  assert.deepEqual(await switches(), { judging_open: false, feedback_released: true })
  assert.deepEqual((await db.query("select project_id from myssp_judging_lineup")).rows.map(row => row.project_id), ["one"])
  await db.query("select myssp_set_judging_state(2026,false,false)")
  await db.query("select myssp_set_judging_lineup(2026,$1)", [["two"]])
  assert.deepEqual(await switches(), { judging_open: true, feedback_released: false })
})

test("upgrade opens only the prepared unreleased 2026 lineup and leaves publication unchanged", async () => {
  for (const released of [false, true]) {
    const { db, as } = await setup({ automaticMarking: false })
    await as("authenticated", admin)
    await db.query("select myssp_set_judging_lineup(2026,$1)", [["one"]])
    await db.query("select myssp_set_judging_lineup(2027,$1)", [["next"]])
    await db.query("select myssp_set_judging_state(2026,false,$1)", [released])
    await db.exec("reset role")
    await db.exec(readFileSync(new URL("../migrations/202611230001_lineup_starts_judging.sql", import.meta.url), "utf8"))
    assert.deepEqual((await db.query("select judging_open,feedback_released from myssp_cohorts where year=2026")).rows[0],
      { judging_open: !released, feedback_released: released })
    assert.equal((await db.query("select judging_open from myssp_cohorts where year=2027")).rows[0].judging_open, false)
    assert.equal((await db.query("select count(*)::int as n from myssp_projects where published or editing_enabled")).rows[0].n, 0)
  }
})

test("teams see every submitted review in full, labelled by judge type, only after release", async () => {
  const { db, as } = await setup()
  await as("authenticated", admin)
  const a = (await db.query("select myssp_save_judge($1,2026,'A','a2@judge.test','',false) as id", [null])).rows[0].id
  const b = (await db.query("select myssp_save_judge($1,2026,'B','b2@judge.test','',false,'special',null,'utar') as id", [null])).rows[0].id
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
  assert.deepEqual(byRemark(released.reviews)["Remark A"], { kind: "main", researchOnly: false, data_collection: 2, analysis: 2, findings_validity: 2, structure: 2, clarity: 2, qa_depth: 2, visual_aids: 2, time_management: 2, researchRemarks: "Remark A", presentationRemarks: "Remark A" })
  assert.deepEqual(byRemark(released.reviews)["Remark B"], { kind: "special", researchOnly: false, data_collection: 5, analysis: 5, findings_validity: 5, structure: 5, clarity: 4, qa_depth: 5, visual_aids: 5, time_management: 5, researchRemarks: "Remark B", presentationRemarks: "Remark B" })
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
  const b = (await db.query("select myssp_save_judge($1,2026,'B','b3@judge.test','',false,'special',null,'mabecs') as id", [null])).rows[0].id
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
  await db.query("select myssp_save_judge($1,2026,'B','b3@judge.test','',true,'special',null,'mabecs')", [b])
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

test("Demo Day rehearsal submits 13 projects for nine judges and releases nine anonymous reviews per team", async () => {
  const { db, as } = await setup()
  const projects = ["one", "two", ...Array.from({ length: 11 }, (_, i) => "rehearsal-" + i)]
  for (const id of projects.slice(2))
    await db.query("insert into myssp_projects(id,code,payload) values ($1,$1,'{\"year\":2026,\"team\":[]}')", [id])
  await db.exec(readFileSync(new URL("../migrations/202611210005_judging_save_versions.sql", import.meta.url), "utf8"))
  const awards = [null, null, null, null, null, "utar", "utar", "mabecs", "mathworks"]
  const users = []
  for (const [i, award] of awards.entries()) {
    const email = `judge-${i}@example.test`
    const user = `00000000-0000-0000-0000-${String(i + 100).padStart(12, "0")}`
    users.push(user)
    await as("authenticated", admin)
    const { rows } = await db.query(
      "select myssp_save_judge(null,2026,$1,$2,'',false,$3,$4,$5) as id",
      [`Judge ${i}`, email, award ? "special" : "main", i !== 0, award]
    )
    await db.exec("reset role")
    await db.query("insert into auth.users values ($1,$2)", [user, email])
    await db.query("update myssp_judges set user_id=$1 where id=$2", [user, rows[0].id])
  }
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_lineup(2026,$1)", [projects])
  await db.query("select myssp_set_research_judging_window(2026,true,now()+interval '1 day',false,'2026-11-28 16:00+08')")
  for (const [j, user] of users.entries()) {
    await as("authenticated", user)
    await Promise.all(projects.map((id, p) =>
      db.query("select myssp_save_judge_review_v2($1,$2,false,null)", [id, full((j + p) % 5 + 1, "Panel feedback")])
    ))
    const { rows } = await db.query("select myssp_submit_judge_reviews() as count")
    assert.equal(rows[0].count, 13)
  }
  await as("authenticated", admin)
  const summary = await db.query(`select project_id,
    count(*) filter (where submitted_at is not null)::int as submitted,
    count(structure)::int as presentations,
    sum(structure+clarity+qa_depth+visual_aids+time_management)::int as marks
    from myssp_judge_feedback group by project_id`)
  assert.equal(summary.rows.length, projects.length)
  for (const row of summary.rows) {
    const p = projects.indexOf(row.project_id)
    const expected = users.slice(1).reduce((sum, _, i) => sum + 5 * ((p + i + 1) % 5 + 1), 0)
    assert.deepEqual([row.submitted, row.presentations, row.marks], [9, 8, expected])
  }
  await as("authenticated", student)
  const feedback = async () => (await db.query("select myssp_project_feedback('one') as feedback")).rows[0].feedback
  assert.deepEqual(await feedback(), { released: false })
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_state(2026,false,true)")
  await as("authenticated", student)
  const released = await feedback()
  assert.equal(released.reviews.length, 9)
  assert.equal(released.reviews.filter(r => r.researchOnly).length, 1)
  assert.equal(released.reviews.filter(r => r.kind === "special").length, 4)
  assert.doesNotMatch(JSON.stringify(released.reviews), /@example\.test|judgeId|judge_id|Judge [0-9]/)
})

test("committee imports judges in bulk, all rows or none", async () => {
  const { db, as } = await setup()
  const rows = [
    { name: "One", email: "one@judge.test", affiliation: "Uni", cohort_year: 2026, kind: "main" },
    { name: "Two", email: "two@judge.test", affiliation: "", cohort_year: 2026, kind: "special", special_award: "mathworks" },
  ]
  await as("authenticated", student)
  await assert.rejects(() => db.query("select myssp_import_judges($1)", [rows]), /Admin required/)
  await as("authenticated", admin)
  await assert.rejects(() => db.query("select myssp_import_judges($1)", [[]]), /Import 1 to 100/)
  // A bad row rolls back the whole import.
  await assert.rejects(() => db.query("select myssp_import_judges($1)", [[...rows, { ...rows[0], email: "s@example.test" }]]), /participant/)
  assert.equal((await db.query("select count(*)::int as n from myssp_judges")).rows[0].n, 0)
  assert.equal((await db.query("select myssp_import_judges($1) as n", [rows])).rows[0].n, 2)
  assert.deepEqual((await db.query("select email, kind, special_award from myssp_judges order by email")).rows,
    [{ email: "one@judge.test", kind: "main", special_award: null }, { email: "two@judge.test", kind: "special", special_award: "mathworks" }])
})

test("a special award can have several judges and main judges have none", async () => {
  const { db, as } = await setup()
  await as("authenticated", admin)
  const save = (email, kind, award, id = null) =>
    db.query("select myssp_save_judge($1,2026,'Judge',$2,'',false,$3,null,$4) as id", [id, email, kind, award])
  await assert.rejects(() => save("x1@judge.test", "special", null), /Choose which special award/)
  await assert.rejects(() => save("x1@judge.test", "special", "nasa"), /Choose which special award/)
  await assert.rejects(() => save("x1@judge.test", "main", "utar"), /Main judges do not have/)
  const utar = (await save("u1@judge.test", "special", "utar")).rows[0].id
  // A second UTAR judge in the same cohort is allowed.
  await save("u2@judge.test", "special", "utar")
  await save("u1@judge.test", "special", "utar", utar)
  await save("u1@judge.test", "special", "mabecs", utar)
  await save("u3@judge.test", "special", "utar")
  assert.deepEqual((await db.query("select email, special_award from myssp_judges where deleted_at is null order by email")).rows,
    [{ email: "u1@judge.test", special_award: "mabecs" }, { email: "u2@judge.test", special_award: "utar" }, { email: "u3@judge.test", special_award: "utar" }])
  // The CSV import accepts several judges of one award too.
  await db.query("select myssp_import_judges($1)", [[
    { name: "W1", email: "w1@judge.test", affiliation: "", cohort_year: 2026, kind: "special", special_award: "mathworks" },
    { name: "W2", email: "w2@judge.test", affiliation: "", cohort_year: 2026, kind: "special", special_award: "mathworks" },
  ]])
  assert.equal((await db.query("select count(*)::int as n from myssp_judges where special_award='mathworks'")).rows[0].n, 2)
  // The table itself refuses an award on a main judge.
  await db.exec("reset role")
  await assert.rejects(() => db.query("update myssp_judges set kind='main' where email='u2@judge.test'"), /special_award_only_for_special/)
})

test("existing special judges get the award their details name", async () => {
  const { db } = await setup({ through: "202611250001_research_marking_window.sql" })
  await db.exec(`reset role;
    insert into myssp_cohorts(year,name) values(2028,'MYSSP 2028');
    insert into myssp_judges (cohort_year,name,email,affiliation,kind,deleted_at) values
      (2026,'Emma','emma@example.test','MABECS','special',null),
      (2026,'Krishna','krishna@example.test','Math-Works','special',null),
      (2026,'Sutarman Ali','sutarman@example.test','Independent','special',null),
      (2026,'Both','both@example.test','UTAR and MathWorks','special',null),
      (2026,'Old','old@example.test','MABECS','special',now()),
      (2026,'Main','main@example.test','UTAR','main',null),
      (2027,'Dr Chua','chua@utar.edu.my','','special',null),
      (2028,'Tunku','t@example.test','Universiti Tunku Abdul Rahman','special',null),
      (2028,'Second','s2@example.test','UTAR','special',null);`)
  await db.exec(readFileSync(new URL("../migrations/202611260001_special_award_types.sql", import.meta.url), "utf8"))
  assert.deepEqual(Object.fromEntries((await db.query("select name, special_award from myssp_judges")).rows.map(r => [r.name, r.special_award])), {
    Emma: "mabecs",
    Krishna: "mathworks",
    "Sutarman Ali": null, // "utar" inside a word is not UTAR
    Both: null, // two sponsors: the committee decides
    Old: null, // deleted judges are left for the committee
    Main: null,
    "Dr Chua": "utar", // matched from the email domain
    Tunku: null, // two UTAR judges in one cohort
    Second: null,
  })
})

test("a restored judge keeps their award even when another judge has it", async () => {
  const { db, as } = await setup()
  await as("authenticated", admin)
  const save = (email, award, id = null) =>
    db.query("select myssp_save_judge($1,2026,'Judge',$2,'',false,'special',null,$3) as id", [id, email, award])
  const first = (await save("r1@judge.test", "utar")).rows[0].id
  await db.query("select myssp_set_judge_deleted($1,true)", [first])
  await db.query("select myssp_set_judge_deleted($1,false)", [first])
  assert.equal((await db.query("select special_award from myssp_judges where id=$1", [first])).rows[0].special_award, "utar")
  await db.query("select myssp_set_judge_deleted($1,true)", [first])
  await save("r2@judge.test", "utar")
  await db.query("select myssp_set_judge_deleted($1,false)", [first])
  assert.deepEqual((await db.query("select email, special_award from myssp_judges order by email")).rows,
    [{ email: "r1@judge.test", special_award: "utar" }, { email: "r2@judge.test", special_award: "utar" }])
})

test("only the committee can permanently delete a judge in Trash, with their reviews", async () => {
  const { db, as, a, b, userA, userB } = await openJudging()
  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('one',$1,true)", [full(4, "Submitted")])
  await db.query("select myssp_save_judge_feedback('two',$1,false)", [{ clarity: 3 }])
  await as("authenticated", userB)
  await db.query("select myssp_save_judge_feedback('one',$1,true)", [full(5, "Kept")])
  await as("authenticated", admin)
  await assert.rejects(() => db.query("select myssp_purge_deleted('judge',$1)", [a]), /Move this judge to Trash first/)
  await db.query("select myssp_set_judge_deleted($1,true)", [a])
  await as("authenticated", userA)
  await assert.rejects(() => db.query("select myssp_purge_deleted('judge',$1)", [a]), /Admin required/)
  await as("authenticated", admin)
  await db.query("select myssp_purge_deleted('judge',$1)", [a])
  await db.exec("reset role")
  assert.equal((await db.query("select count(*)::int as n from myssp_judges where id=$1", [a])).rows[0].n, 0)
  assert.deepEqual((await db.query("select judge_id from myssp_judge_feedback")).rows, [{ judge_id: b }])
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

test("judges who skip Demo Day submit research-only reviews, and attendance locks once they submit", async () => {
  const { db, as, a, b, userA, userB } = await openJudging()
  const research = { data_collection: 4, analysis: 3, findings_validity: 5, research_remarks: "Solid data" }
  await as("authenticated", admin)
  await db.query("select myssp_set_research_judging_window(2026,true,now()+interval '1 day',false,'2026-11-28 16:00+08')")
  assert.equal((await db.query("select attends_demo_day from myssp_judges where id=$1", [a])).rows[0].attends_demo_day, true)
  // An earlier draft with presentation answers loses them when the judge is marked absent.
  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('one',$1,false)", [full(4, "Draft")])
  await as("authenticated", admin)
  // Omitting attendance keeps it unchanged.
  await db.query("select myssp_save_judge($1,2026,'A','a3@judge.test','',false,'main')", [a])
  assert.equal((await db.query("select attends_demo_day from myssp_judges where id=$1", [a])).rows[0].attends_demo_day, true)
  await db.query("select myssp_save_judge($1,2026,'A','a3@judge.test','',false,'main',false)", [a])
  await db.exec("reset role")
  const draft = (await db.query("select * from myssp_judge_feedback where judge_id=$1 and project_id='one'", [a])).rows[0]
  assert.equal(draft.research_only, true)
  assert.equal(draft.structure, null)
  assert.equal(draft.presentation_remarks, "")
  assert.equal(draft.data_collection, 4)

  // Research answers alone complete the review; presentation answers sent anyway are dropped.
  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('one',$1,true)", [{ ...research, structure: 5, presentation_remarks: "Ignored" }])
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('two',$1,true)", [{ data_collection: 4 }]), /Answer every score/)
  await db.exec("reset role")
  const saved = (await db.query("select * from myssp_judge_feedback where judge_id=$1 and project_id='one'", [a])).rows[0]
  assert.ok(saved.submitted_at)
  assert.equal(saved.structure, null)
  assert.equal(saved.presentation_remarks, "")

  // Attending judges still need every presentation answer.
  await as("authenticated", userB)
  await assert.rejects(() => db.query("select myssp_save_judge_feedback('one',$1,true)", [research]), /Answer every score/)

  // Attendance cannot change after a submitted review.
  await as("authenticated", admin)
  await assert.rejects(() => db.query("select myssp_save_judge($1,2026,'A','a3@judge.test','',false,'main',true)", [a]), /can no longer change/)
  // Other details can still change.
  await db.query("select myssp_save_judge($1,2026,'A2','a3@judge.test','',false,'main')", [a])

  // Closing judging auto-submits complete research-only drafts.
  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('two',$1,false)", [research])
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_state(2026,false,true)")
  await db.exec("reset role")
  assert.ok(await submittedAt(db, a, "two"))

  // Teams see which reviews had no presentation part.
  await as("authenticated", student)
  const released = (await db.query("select myssp_project_feedback('one') as f")).rows[0].f
  assert.deepEqual(released.reviews.map(review => [review.researchOnly, review.structure]), [[true, null]])

  // CSV import accepts optional attendance.
  await as("authenticated", admin)
  await db.query("select myssp_import_judges($1)", [JSON.stringify([{ name: "Remote", email: "remote@judge.test", affiliation: "", cohort_year: 2026, kind: "main", attends_demo_day: false }])])
  assert.equal((await db.query("select attends_demo_day from myssp_judges where email='remote@judge.test'")).rows[0].attends_demo_day, false)
  await assert.rejects(() => db.query("select myssp_import_judges($1)", [JSON.stringify([{ name: "Bad", email: "bad@judge.test", affiliation: "", cohort_year: 2026, attends_demo_day: "no" }])]), /true or false/)
})

test("the committee can return a submitted review to draft until feedback is released", async () => {
  const { db, as, a, userA } = await openJudging()
  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('one',$1,true)", [full(4, "Submitted")])
  await assert.rejects(() => db.query("select myssp_unsubmit_judge_feedback($1,'one')", [a]), /Admin required/)
  await as("authenticated", admin)
  await assert.rejects(() => db.query("select myssp_unsubmit_judge_feedback($1,'two')", [a]), /not found/)
  await db.query("select myssp_unsubmit_judge_feedback($1,'one')", [a])
  await db.exec("reset role")
  const row = (await db.query("select submitted_at, analysis, research_remarks from myssp_judge_feedback where judge_id=$1 and project_id='one'", [a])).rows[0]
  assert.equal(row.submitted_at, null)
  assert.equal(row.analysis, 4)
  assert.equal(row.research_remarks, "Submitted")
  // Drafts are already drafts.
  await as("authenticated", admin)
  await assert.rejects(() => db.query("select myssp_unsubmit_judge_feedback($1,'one')", [a]), /not found/)
  // The judge can edit and resubmit it.
  await as("authenticated", userA)
  await db.query("select myssp_save_judge_feedback('one',$1,true)", [full(5, "Changed")])
  // Once released, it stays put.
  await as("authenticated", admin)
  await db.query("select myssp_set_judging_state(2026,false,true)")
  await assert.rejects(() => db.query("select myssp_unsubmit_judge_feedback($1,'one')", [a]), /Hide feedback/)
})

test("research window uses its own lineup, committee controls and exclusive deadline for every judge save", async () => {
  const {db,as,a,userA,userB}=await openJudging()
  const future = new Date(Date.now()+86400000).toISOString()
  const original="2026-11-28T08:00:00Z"
  const change=(enabled,deadline,prev,previousDate)=>db.query(
    "select myssp_set_research_judging_window(2026,$1,$2,$3,$4)",[enabled,deadline,prev,previousDate])
  await as("authenticated",admin)
  await db.query("select myssp_set_judging_state(2026,false,false)")
  await db.query("select myssp_save_judge($1,2026,'A','a3@judge.test','',false,'main',false)",[a])
  await db.query("select myssp_save_judging_lineup(2026,'{}',false)")
  await assert.rejects(()=>change(true,future,false,original),/lineup/)
  await db.query("select myssp_save_judging_lineup(2026,array['one','two'],false)")
  await as("authenticated",userA)
  await assert.rejects(()=>change(true,future,false,original),/Admin required/)
  await as("authenticated",admin)
  await change(true,future,false,original)
  await assert.rejects(()=>change(false,future,false,original),/Refresh/)
  await assert.rejects(()=>db.query("select myssp_set_judging_lineup(2026,array['one'])"),/Close judging/)
  await db.exec("reset role")
  await db.exec(readFileSync(new URL("../migrations/202611210005_judging_save_versions.sql",import.meta.url),"utf8"))
  const save=(project,submit=false)=>db.query("select myssp_save_judge_review_v2($1,$2,$3,null)",[project,full(4,"Research"),submit])
  await as("authenticated",userB)
  await assert.rejects(()=>save("two"),/Judging is closed/)
  await as("authenticated",userA)
  await save("one")
  await assert.rejects(()=>save("extra"),/Judge access required/)
  await as("authenticated",admin)
  await db.query("select myssp_set_judging_state(2026,true,false)")
  await db.query("select myssp_set_judging_state(2026,false,false)")
  assert.equal(await submittedAt(db,a,"one"),null)
  await db.query("select myssp_set_judging_state(2026,true,false)")
  // An already open tab tries every write path at or after the cutoff.
  await db.exec("reset role; update myssp_cohorts set research_closes_at=clock_timestamp() where year=2026")
  await as("authenticated",userA)
  await assert.rejects(()=>save("two"),/Judging is closed/)
  await assert.rejects(()=>save("two",true),/Judging is closed/)
  await assert.rejects(()=>db.query("select myssp_submit_judge_reviews()"),/Judging is closed/)
  await as("authenticated",userB)
  await save("two")
  await as("authenticated",admin)
  await db.query("select myssp_set_judging_state(2026,false,true)")
  assert.ok(await submittedAt(db,a,"one"))
  const {rows:[settings]}=await db.query("select * from myssp_judging_windows() where year=2026")
  assert.equal(settings.research_marking,false)
  assert.equal(settings.feedback_released,true)
  await assert.rejects(()=>change(true,future,false,settings.research_closes_at),/released|Refresh/)
})
