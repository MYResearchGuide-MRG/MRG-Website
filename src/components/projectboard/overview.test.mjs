import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const source = readFileSync(new URL("./overview.ts", import.meta.url), "utf8")
const { overviewError } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
)
const valid = { summary: "A brief abstract.", question: "", method: "", findings: "" }

test("every overview field accepts its exact limit and rejects one character beyond it", () => {
  for (const [field, limit] of Object.entries({
    summary: 1500, question: 300, method: 2000, findings: 2000,
  })) {
    assert.equal(overviewError({ ...valid, [field]: "x".repeat(limit) }), null)
    assert.match(overviewError({ ...valid, [field]: "x".repeat(limit + 1) }), /characters or fewer/)
  }
})

test("requires an abstract, permits unfinished optional sections and counts Markdown source", () => {
  assert.equal(overviewError(valid), null)
  assert.match(overviewError({ ...valid, summary: " \n " }), /Add an abstract/)
  assert.match(overviewError({ ...valid, method: null }), /valid text/)
  assert.equal(overviewError({ ...valid, question: `$${"x".repeat(298)}$` }), null)
  assert.match(overviewError({ ...valid, question: `$${"x".repeat(299)}$` }), /characters or fewer/)
})
