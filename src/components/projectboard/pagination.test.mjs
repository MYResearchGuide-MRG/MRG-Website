import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

async function importTS(file) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8")
  return import(
    `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
  )
}
const { paginate } = await importTS("./pagination.ts")
const { projectShareUrl } = await importTS("./paths.ts")

test("page boundaries show every project exactly once, never more than twelve", () => {
  for (const count of [0, 1, 12, 13, 24, 25, 121]) {
    const records = Array.from({ length: count }, (_, id) => ({ id }))
    const pages = Array.from({ length: paginate(records, 1).totalPages }, (_, i) =>
      paginate(records, i + 1)
    )
    assert.ok(pages.every((page) => page.items.length <= 12))
    assert.deepEqual(
      pages.flatMap((page) => page.items),
      records
    )
    assert.equal(pages.length, Math.max(1, Math.ceil(count / 12)))
  }
})
test("filtering to fewer projects clamps stale pages without an empty page", () => {
  assert.equal(paginate([1, 2], 8).page, 1)
  assert.deepEqual(paginate([1, 2], 8).items, [1, 2])
  assert.equal(paginate([1], -2).page, 1)
})
test("share links contain the stable project route on the current host", () => {
  assert.equal(
    projectShareUrl("object-detector-occlusion", "https://myssp.myresearchguide.org", "/"),
    "https://myssp.myresearchguide.org/#/projectboard/project/object-detector-occlusion"
  )
  assert.equal(
    projectShareUrl("project name", "http://myssp.localhost:5173", "/"),
    "http://myssp.localhost:5173/#/projectboard/project/project%20name"
  )
})
