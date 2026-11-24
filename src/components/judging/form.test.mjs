import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const source = readFileSync(new URL("./form.ts", import.meta.url), "utf8")
const { emptyAnswers, missingAnswers, scoreKeys, validScore } = await import(
  `data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(source))}`
)
const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/202611140001_judging.sql",
    import.meta.url
  ),
  "utf8"
)

test("every form score is a database column and vice versa", () => {
  assert.equal(scoreKeys.length, 8)
  const columns = [...migration.matchAll(/^\s+(\w+) smallint check/gm)].map(
    (m) => m[1]
  )
  assert.deepEqual(columns, scoreKeys)
})

test("a review is complete only with every score and both section reviews", () => {
  const answers = emptyAnswers()
  assert.equal(missingAnswers(answers).length, 10)
  for (const key of scoreKeys) answers[key] = 4
  assert.deepEqual(missingAnswers(answers), [
    "Review of Research Execution & Quality",
    "Review of Live Presentation & Q&A",
  ])
  answers.researchRemarks = "  "
  assert.equal(missingAnswers(answers).length, 2)
  answers.researchRemarks = "Strong research execution."
  answers.presentationRemarks = "Clear and well paced."
  assert.deepEqual(missingAnswers(answers), [])
  assert.equal(validScore(0), false)
  assert.equal(validScore(2.5), false)
  assert.equal(validScore(5), true)
})

test("a research-only review needs only the research scores and review", async () => {
  const { maxTotalFor, presentationKeys, withoutPresentation } = await import(
    `data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(source))}`
  )
  assert.equal(maxTotalFor(false), 40)
  assert.equal(maxTotalFor(true), 15)
  const answers = emptyAnswers()
  assert.equal(missingAnswers(answers, true).length, 4)
  answers.data_collection = 4
  answers.analysis = 4
  answers.findings_validity = 4
  answers.researchRemarks = "Well executed."
  assert.deepEqual(missingAnswers(answers, true), [])
  assert.equal(missingAnswers(answers).length, 6)
  const cleared = withoutPresentation({
    ...answers,
    clarity: 5,
    presentationRemarks: "x",
  })
  assert.ok(presentationKeys.every((key) => cleared[key] === null))
  assert.equal(cleared.presentationRemarks, "")
  assert.equal(cleared.analysis, 4)
})
