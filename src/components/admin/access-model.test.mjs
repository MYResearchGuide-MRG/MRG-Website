import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const source = readFileSync(
  new URL("./access-model.ts", import.meta.url),
  "utf8"
)
const {
  parseParticipants,
  issueCode,
  verifyCode,
  canEdit,
  changeAssignment,
  generateCode,
} = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
)
const projects = [
  { id: "one", code: "A-1" },
  { id: "two", code: "A-2" },
]
const person = {
  id: "p1",
  name: "Sample",
  email: "sample@example.com",
  projectId: "one",
  revision: 1,
  revoked: false,
  code: null,
  expiresAt: 0,
  usedAt: null,
  attempts: 0,
  lockedUntil: 0,
}
test("bulk import normalizes emails, supports spreadsheet tabs and applies assignments", () => {
  const result = parseParticipants(
    "FIRST@example.com\nSample\tsecond@example.com\tA-2",
    "one",
    projects,
    []
  )
  assert.equal(result[0].email, "first@example.com")
  assert.equal(result[0].projectId, "one")
  assert.equal(result[1].projectId, "two")
  assert.ok(result.every((r) => !r.error))
})
test("import catches existing emails, duplicate rows, unknown projects and malformed emails", () => {
  const result = parseParticipants(
    "sample@example.com\nx@example.com\nX@example.com\nName,bad, A-1\nName,other@example.com,Z-9",
    "one",
    projects,
    [person]
  )
  assert.ok(result[0].error)
  assert.equal(result[1].error, "")
  assert.ok(result.slice(2).every((r) => r.error))
})
test("CSV accepts BOM, quoted commas and reordered spreadsheet columns without retaining private extras", () => {
  const rows = parseParticipants('\uFEFFSelected Project,Age,Email,Name,Residence\r\nA-2,19,test@example.com,"Tan, Alex",Private location', 'one', projects, [])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].name, 'Tan, Alex')
  assert.equal(rows[0].projectId, 'two')
  assert.equal(rows[0].error, '')
  assert.ok(!JSON.stringify(rows).includes('Private location'))
})
test("CSV catches broken quoting and missing required headers", () => {
  assert.ok(parseParticipants('name,email,project_code\n"Unclosed,x@example.com,A-1', 'one', projects, [])[0].error)
  assert.ok(parseParticipants('name,email\nAlex,x@example.com', 'one', projects, [])[0].error)
  const rows = parseParticipants('name,email,project_code\r\n"Alex ""A"" Tan",x@example.com,A-1', 'one', projects, [])
  assert.equal(rows[0].name, 'Alex "A" Tan')
  assert.equal(rows[0].error, '')
})
test("codes have six unambiguous characters and remain valid across sign-ins", () => {
  for (let i = 0; i < 100; i++)
    assert.match(generateCode(), /^[A-HJ-NP-Z2-9]{6}$/)
  const invited = issueCode(person)
  const accepted = verifyCode(invited, invited.code.toLowerCase(), 2000)
  assert.ok(accepted.session)
  assert.equal(accepted.person.code, invited.code)
  assert.ok(verifyCode(accepted.person, invited.code, 3000).session)
})
test("codes do not expire but revoked members cannot sign in", () => {
  const invited = issueCode(person)
  assert.ok(verifyCode(invited, invited.code, 1000 + 365 * 86400000).session)
  assert.equal(
    verifyCode({ ...invited, revoked: true }, invited.code, 2000).session,
    null
  )
})
test("five failed attempts lock the account and reissuing does not bypass the lock", () => {
  let invited = issueCode(person)
  for (let i = 0; i < 5; i++)
    invited = verifyCode(invited, "000000", 2000).person
  assert.ok(invited.lockedUntil > 2000)
  invited = issueCode(invited)
  assert.equal(verifyCode(invited, invited.code, 4000).session, null)
})
test("sessions can edit only their assigned project and expire", () => {
  const invited = issueCode(person)
  const accepted = verifyCode(invited, invited.code, 2000)
  assert.equal(canEdit(accepted.session, accepted.person, "one", 3000), true)
  assert.equal(canEdit(accepted.session, accepted.person, "two", 3000), false)
  assert.equal(
    canEdit(
      accepted.session,
      accepted.person,
      "one",
      accepted.session.expiresAt
    ),
    false
  )
  assert.equal(canEdit(null, accepted.person, "one", 3000), false)
})
test("revoking or reassigning invalidates sessions but keeps the code", () => {
  const invited = issueCode(person)
  const accepted = verifyCode(invited, invited.code, 2000)
  const reassigned = changeAssignment(accepted.person, "two")
  assert.equal(reassigned.code, invited.code)
  assert.equal(canEdit(accepted.session, reassigned, "one", 3000), false)
  assert.equal(canEdit(accepted.session, reassigned, "two", 3000), false)
  assert.ok(verifyCode(reassigned, invited.code, 4000).session)
  const revoked = changeAssignment(accepted.person, "one", true)
  assert.equal(canEdit(accepted.session, revoked, "one", 3000), false)
  const restored = changeAssignment(revoked, "one", false)
  assert.equal(canEdit(accepted.session, restored, "one", 3000), false)
})

test("split team imports assign two users to A and one to B without cross-team access", () => {
  const choices = [{ id: "split-a", code: "I-2A" }, { id: "split-b", code: "I-2B" }]
  const rows = parseParticipants("One, one@example.com, I-2A\nTwo, two@example.com, I-2A\nThree, three@example.com, I-2B", "split-a", choices, [])
  assert.deepEqual(rows.map(row => row.projectId), ["split-a", "split-a", "split-b"])
  assert.ok(rows.every(row => !row.error))
  const old = issueCode({ ...person, projectId: "original-i2" })
  const oldLogin = verifyCode(old, old.code, 2000)
  const moved = changeAssignment(oldLogin.person, "split-a")
  assert.equal(canEdit(oldLogin.session, moved, "split-a", 3000), false)
  const fresh = verifyCode(moved, moved.code, 5000)
  assert.equal(canEdit(fresh.session, fresh.person, "split-a", 6000), true)
  assert.equal(canEdit(fresh.session, fresh.person, "split-b", 6000), false)
  assert.equal(canEdit(fresh.session, fresh.person, "original-i2", 6000), false)
})
