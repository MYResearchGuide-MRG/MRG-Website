import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

// judge-model imports form.ts; load both as data: modules with the import rewritten.
const form = readFileSync(new URL("./form.ts", import.meta.url), "utf8")
const formUrl = `data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(form))}`
const model = readFileSync(new URL("./judge-model.ts", import.meta.url), "utf8")
  .replace(`from "./form"`, `from "${formUrl}"`)
const { feedbackCsv, judgeInputError, MAX_TOTAL, projectResult, rankResults, reviewTotal } = await import(
  `data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(model))}`
)

const keys = ["data_collection", "analysis", "findings_validity", "structure", "clarity", "qa_depth", "visual_aids", "time_management"]
const review = (judgeId, projectId, score, extra = {}) => ({
  ...Object.fromEntries(keys.map(key => [key, score])),
  judgeId, projectId, remarks: "", submittedAt: "2026-11-28T10:00:00Z", updatedAt: "2026-11-28T10:00:00Z", ...extra,
})

test("project results average submitted reviews only", () => {
  assert.equal(MAX_TOTAL, 40)
  const reviews = [
    review("a", "p1", 4),
    review("b", "p1", 5, { clarity: 3 }),
    review("c", "p1", 1, { submittedAt: null }),
  ]
  const result = projectResult("p1", reviews)
  assert.equal(result.submitted, 2)
  assert.equal(result.drafts, 1)
  assert.equal(result.averages.clarity, 3.5)
  assert.equal(result.averages.analysis, 4.5)
  assert.equal(result.averageTotal, (32 + 38) / 2)
  assert.deepEqual(projectResult("p2", reviews), { projectId: "p2", submitted: 0, drafts: 0, averages: null, averageTotal: null })
  assert.equal(reviewTotal(review("a", "p1", null)), null)
})

test("ranking puts the highest average first and shares ties", () => {
  const ranks = rankResults([
    { projectId: "x", averageTotal: 30 }, { projectId: "y", averageTotal: 35 },
    { projectId: "z", averageTotal: 30 }, { projectId: "w", averageTotal: null },
  ])
  assert.deepEqual([...ranks.entries()], [["y", 1], ["x", 2], ["z", 2]])
})

test("judge details are validated before saving", () => {
  const input = { name: "Prof. A", email: "a@uni.edu", affiliation: "", revoked: false, cohortYear: 2026 }
  assert.equal(judgeInputError(input, []), "")
  assert.match(judgeInputError({ ...input, email: "nope" }, []), /valid email/)
  assert.match(judgeInputError(input, [{ id: "1", email: "a@uni.edu", deletedAt: null }]), /already in the judge list/)
  assert.match(judgeInputError(input, [{ id: "1", email: "a@uni.edu", deletedAt: "2026-01-01" }]), /Restore/)
  assert.equal(judgeInputError(input, [{ id: "1", email: "a@uni.edu", deletedAt: null }], "1"), "")
})

test("CSV export quotes text and neutralises spreadsheet formulas", () => {
  const csv = feedbackCsv(
    [{ id: "p1", code: "A-1", title: "Trees, graphs" }],
    [{ id: "a", name: "Prof. A", email: "a@uni.edu" }],
    [review("a", "p1", 4, { remarks: '=HYPERLINK("x") said "great"\nline 2' })],
  )
  const [header, row] = csv.trim().split("\r\n")
  assert.match(header, /^Position,Project code,Project title,Judge,Judge email,Status,Data Collection and Execution,/)
  assert.match(header, /Total \(\/40\),Remarks,Submitted at$/)
  assert.ok(row.startsWith('1,A-1,"Trees, graphs",Prof. A,a@uni.edu,Submitted,4,4,4,4,4,4,4,4,32,'))
  assert.ok(row.includes(`"'=HYPERLINK(""x"") said ""great""\nline 2"`))
})
