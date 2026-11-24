import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire, stripTypeScriptTypes } from "node:module"
import { runInNewContext } from "node:vm"
import { test } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const read = file => readFileSync(new URL(file, import.meta.url), "utf8")
const url = source => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
const formUrl = url(read("../judging/form.ts"))
const form = await import(formUrl)
const summary = await import(url(read("./feedback-summary.ts").replace('from "../judging/form"', `from "${formUrl}"`)))
const { mainAwardSummary, reviewTotal, groupFeedback, randomizeReviews } = summary
const review = (kind, value, extra = {}) => ({ ...Object.fromEntries(form.scoreKeys.map(key => [key, value])), kind, researchRemarks: "Research comment", presentationRemarks: "Presentation comment", ...extra })

test("main award averages never include special award scores", () => {
  const result = mainAwardSummary([review("main", 4), review("main", 3), review("special", 5)])
  assert.equal(result.count, 2)
  assert.equal(result.total, 28)
  assert.deepEqual(result.sections, [10.5, 17.5])
  assert.ok(Object.values(result.criteria).every(value => value === 3.5))
  assert.equal(mainAwardSummary([review("special", 5)]), null)
})

test("empty or invalid scores cannot produce a zero or misleading average", () => {
  assert.equal(mainAwardSummary([]), null)
  assert.equal(mainAwardSummary([review("main", 0)]), null)
  assert.equal(reviewTotal(review("main", 4, { analysis: null })), null)
  assert.equal(reviewTotal(review("special", 5)), 40)
  const result = mainAwardSummary([review("main", 5), review("main", 4), review("main", 4)])
  assert.ok(Math.abs(result.total - 104 / 3) < 1e-10)
})

test("grouping retains random review order without sorting by score", () => {
  const rows = [review("special", 2), review("main", 3), review("special", 5), review("main", 4)]
  const grouped = groupFeedback(rows)
  assert.deepEqual(grouped.main, [rows[1], rows[3]])
  assert.deepEqual(grouped.special, [rows[0], rows[2]])
  const shuffled = randomizeReviews(rows, () => 0)
  assert.notDeepEqual(shuffled, rows)
  assert.deepEqual(new Set(shuffled), new Set(rows))
  assert.equal(rows[0].data_collection, 2)
})

const require = createRequire(import.meta.url)
const modules = { "../judging/form": form, "./feedback-summary": summary, "./project-feedback.css": {} }
function load(file) {
  const exports = {}
  runInNewContext(ts.transpileModule(read(file), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => modules[name] ?? require(name) })
  return exports
}
modules["./JudgeAvatar"] = load("./JudgeAvatar.tsx")
const { FeedbackResults, IndividualReview } = load("./FeedbackResults.tsx")
const render = feedback => renderToStaticMarkup(createElement(FeedbackResults, { feedback }))

test("unreleased feedback exposes neither scores nor comments even if supplied", () => {
  const html = render({ released: false, reviews: [review("main", 4, { researchRemarks: "PRIVATE_REVIEW" })] })
  assert.ok(html.includes("once the committee releases"))
  assert.equal(html.includes("PRIVATE_REVIEW"), false)
  assert.equal(html.includes("Average total"), false)
  assert.equal(html.includes('role="tab"'), false)
})

test("overall is the default and retains separate special award totals without identities", () => {
  const html = render({ released: true, reviews: [review("main", 4, { name: "PRIVATE_NAME", email: "PRIVATE_EMAIL", judgeId: "PRIVATE_ID" }), review("special", 5)] })
  assert.match(html, /data-state="active"[^>]*[^]*?>Overall<\/button>/)
  assert.ok(html.includes("32.0"))
  assert.ok(html.includes("Special award review 1"))
  assert.ok(html.includes("Individual reviews"))
  for (const identity of ["PRIVATE_NAME", "PRIVATE_EMAIL", "PRIVATE_ID"]) assert.equal(html.includes(identity), false)
  const empty = render({ released: true, reviews: [] })
  assert.ok(empty.includes("No judge feedback was recorded"))
  assert.equal(empty.includes("NaN"), false)
})

test("individual reviews display every criterion and both original comments safely", () => {
  const html = renderToStaticMarkup(createElement(IndividualReview, { review: review("special", 4, { researchRemarks: '<script>alert("x")</script>', presentationRemarks: "A specific presentation suggestion." }), number: 2 }))
  for (const section of form.judgingSections) for (const criterion of section.criteria) {
    assert.ok(html.includes(criterion.label.replaceAll("&", "&amp;")), criterion.label)
  }
  assert.equal((html.match(/class="pf-score"/g) || []).length, 8)
  assert.ok(html.includes("Special award review 2"))
  assert.ok(html.includes("A specific presentation suggestion."))
  assert.equal(html.includes("<script>"), false)
  assert.ok(html.includes("&lt;script&gt;"))
})

test("research-only reviews count towards research only and render without a presentation section", () => {
  const remote = review("main", 3, { researchOnly: true, structure: null, clarity: null, qa_depth: null, visual_aids: null, time_management: null, presentationRemarks: "" })
  assert.equal(reviewTotal(remote), 9)
  assert.equal(summary.reviewMax(remote), 15)
  const result = mainAwardSummary([review("main", 4), review("main", 5), remote])
  // Research (12 + 15 + 9) / 3 = 12, presentation (20 + 25) / 2 = 22.5.
  assert.deepEqual(result.sections, [12, 22.5])
  assert.equal(result.total, 34.5)
  assert.equal(result.maxTotal, 40)
  const alone = mainAwardSummary([remote])
  assert.equal(alone.maxTotal, 15)
  assert.deepEqual(alone.sections, [9, null])
  const html = renderToStaticMarkup(createElement(IndividualReview, { review: remote, number: 1 }))
  assert.ok(html.includes("reviewed your research"))
  assert.ok(!html.includes("Live Presentation"))
  assert.ok(html.includes("/ <!-- -->15") || html.includes("/ 15"))
})
