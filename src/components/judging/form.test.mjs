import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const source = readFileSync(new URL("./form.ts", import.meta.url), "utf8")
const { emptyAnswers, missingAnswers, scoreKeys, validScore } = await import(
  `data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(source))}`
)
const migration = readFileSync(
  new URL("../../../supabase/migrations/202611140001_judging.sql", import.meta.url),
  "utf8"
)

test("every form score is a database column and vice versa", () => {
  assert.equal(scoreKeys.length, 8)
  const columns = [...migration.matchAll(/^\s+(\w+) smallint check/gm)].map(m => m[1])
  assert.deepEqual(columns, scoreKeys)
})

test("a review is complete only with every score and a remark", () => {
  const answers = emptyAnswers()
  assert.equal(missingAnswers(answers).length, 9)
  for (const key of scoreKeys) answers[key] = 4
  assert.deepEqual(missingAnswers(answers), ["Remarks on Overall Presentation"])
  answers.remarks = "  "
  assert.equal(missingAnswers(answers).length, 1)
  answers.remarks = "Clear and well paced."
  assert.deepEqual(missingAnswers(answers), [])
  assert.equal(validScore(0), false)
  assert.equal(validScore(2.5), false)
  assert.equal(validScore(5), true)
})
