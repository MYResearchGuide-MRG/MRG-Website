import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const source = readFileSync(
  new URL("./project-registry-model.ts", import.meta.url),
  "utf8"
)
const { splitError, applyProjectSplits, readProjectSplits } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
)
const parent = {
  id: "suspension",
  code: "I-2",
  title: "Suspension study",
  mentor: "Mentor",
  team: ["One", "Two", "Three"].map((name) => ({
    name,
    code: "I-2",
    school: "School",
    programme: "Programme",
  })),
}
const other = { ...parent, id: "other", code: "I-1" }
const projects = [other, parent]
const split = {
  parentId: parent.id,
  teams: [
    {
      id: "suspension-a",
      code: "I-2A",
      title: "Team A study",
      memberIndices: [0, 2],
    },
    {
      id: "suspension-b",
      code: "I-2B",
      title: "Team B study",
      memberIndices: [1],
    },
  ],
}
test("a two-and-one split creates independent pages and keeps the source catalogue intact", () => {
  assert.equal(splitError(split, projects, []), null)
  const result = applyProjectSplits(projects, [split])
  assert.deepEqual(
    result.map((board) => board.code),
    ["I-1", "I-2A", "I-2B"]
  )
  assert.deepEqual(
    result[1].team.map((student) => student.name),
    ["One", "Three"]
  )
  assert.deepEqual(
    result[2].team.map((student) => student.name),
    ["Two"]
  )
  assert.equal(result[1].mentor, "Mentor")
  assert.notEqual(result[1].id, result[2].id)
  assert.equal(parent.team.length, 3)
  assert.equal(parent.team[0].code, "I-2")
})
test("split must include every student once and leave no empty teams", () => {
  for (const assignments of [
    [[0], [1]],
    [
      [0, 1],
      [1, 2],
    ],
    [[0, 1, 2], []],
    [[0, 1], [4]],
    [[0, 1], [1.5]],
  ]) {
    assert.ok(
      splitError(
        {
          ...split,
          teams: split.teams.map((team, i) => ({
            ...team,
            memberIndices: assignments[i],
          })),
        },
        projects,
        []
      )
    )
  }
})
test("reject duplicate pages, codes, repeated splits and missing titles", () => {
  assert.ok(splitError(split, projects, [split]))
  for (const change of [
    { id: "other" },
    { id: "suspension-a" },
    { code: "I-2A" },
    { title: " " },
  ]) {
    assert.ok(
      splitError(
        { ...split, teams: [split.teams[0], { ...split.teams[1], ...change }] },
        projects,
        []
      )
    )
  }
})
test("saved splits survive reload and corrupt records cannot retire valid projects", () => {
  const restored = readProjectSplits(
    JSON.stringify({
      version: 1,
      splits: [null, split, split, { parentId: "other" }],
    }),
    projects
  )
  assert.deepEqual(restored, [split])
  assert.deepEqual(
    applyProjectSplits(projects, restored).map((board) => board.code),
    ["I-1", "I-2A", "I-2B"]
  )
  assert.deepEqual(readProjectSplits("bad json", projects), [])
})
