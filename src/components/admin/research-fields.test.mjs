import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8")
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
const fieldUrl = moduleUrl(read("./research-fields-model.ts"))
const { defaultResearchFields, researchFieldError, mergeResearchFields } =
  await import(fieldUrl)
const cohortUrl = moduleUrl(
  read("./cohort-model.ts").replace(
    '"./research-fields-model"',
    JSON.stringify(fieldUrl)
  )
)
const { suggestedCode } = await import(cohortUrl)
const dataUrl = moduleUrl(read("../../data/competition-data.ts"))
const { catalogueProjects } = await import(
  moduleUrl(
    read("../sections/project-catalogue-model.ts").replace(
      '"@/data/competition-data"',
      JSON.stringify(dataUrl)
    )
  )
)

test("research fields reject duplicates, reserved names and invalid prefixes", () => {
  const field = { name: "Engineering", prefix: "ENG" }
  assert.equal(researchFieldError(field, defaultResearchFields), null)
  assert.ok(researchFieldError({ ...field, name: "  engineering " }, [field]))
  for (const name of [
    "",
    "x",
    "All",
    "All fields",
    "X".repeat(81),
    "Bad\nfield",
  ])
    assert.ok(researchFieldError({ ...field, name }))
  for (const prefix of ["", "123", "ENG-", "ABCDEF"])
    assert.ok(researchFieldError({ ...field, prefix }))
  assert.deepEqual(mergeResearchFields([field], ["Engineering"]).at(-1), field)
})

test("new fields suggest unique project codes within each cohort", () => {
  const fields = [
    ...defaultResearchFields,
    { name: "Engineering", prefix: "ENG" },
  ]
  const boards = [
    { year: 2026, code: "ENG-1" },
    { year: 2026, code: "ENG-2" },
  ]
  assert.equal(suggestedCode("Engineering", 2026, boards, fields), "ENG-3")
  assert.equal(suggestedCode("Engineering", 2027, boards, fields), "ENG-1")
})

test("Projects includes published custom fields and cohorts without leaking hidden projects", () => {
  const board = {
    id: "new",
    code: "ENG-1",
    year: 2027,
    track: "Engineering",
    title: "New research",
  }
  assert.equal(
    catalogueProjects([board], {}).some((p) => p.id === "new"),
    false
  )
  assert.deepEqual(
    catalogueProjects([board], { new: true }).find((p) => p.id === "new"),
    board
  )
  assert.equal(
    catalogueProjects([board], { new: false }).some((p) => p.id === "new"),
    false
  )
  assert.equal(
    catalogueProjects([], {}).filter((p) => p.year === 2026).length,
    12
  )
})
