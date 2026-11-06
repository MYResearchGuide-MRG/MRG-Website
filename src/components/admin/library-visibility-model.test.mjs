import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const source = readFileSync(
  new URL("./library-visibility-model.ts", import.meta.url),
  "utf8"
)
const { readVisibility, canViewProject, visibleProjects } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
)
const projects = [{ id: "a" }, { id: "b" }]
test("missing, corrupt and unsupported settings leave everything hidden", () => {
  for (const raw of [
    null,
    "broken",
    "{}",
    '{"version":2,"visibleIds":["a"]}',
    '{"version":1,"visibleIds":true}',
  ]) {
    assert.deepEqual(
      visibleProjects(projects, readVisibility(raw, ["a", "b"])),
      []
    )
  }
})
test("only explicitly published known IDs appear; new projects stay hidden", () => {
  const state = readVisibility(
    '{"version":1,"visibleIds":["a","unknown",false]}',
    ["a", "b"]
  )
  assert.deepEqual(state, { a: true })
  assert.deepEqual(visibleProjects(projects, state), [{ id: "a" }])
})
test("hidden direct links are blocked except for the assigned participant", () => {
  assert.equal(canViewProject({}, "a", null), false)
  assert.equal(canViewProject({}, "a", "b"), false)
  assert.equal(canViewProject({}, "a", "a"), true)
  assert.equal(canViewProject({ a: true }, "a", null), true)
  assert.equal(canViewProject({ a: false }, "a", null), false)
  assert.equal(canViewProject({ a: false }, "a", null, true), true)
})
