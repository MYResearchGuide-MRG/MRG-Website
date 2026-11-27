import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

// judge-model imports form.ts and the CSV parser; load them as data modules with imports rewritten.
const form = readFileSync(new URL("./form.ts", import.meta.url), "utf8")
const formUrl = `data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(form))}`
const access = readFileSync(
  new URL("../admin/access-model.ts", import.meta.url),
  "utf8"
)
const accessUrl = `data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(access))}`
const model = readFileSync(new URL("./judge-model.ts", import.meta.url), "utf8")
  .replace(`from "./form"`, `from "${formUrl}"`)
  .replace(`from "../admin/access-model"`, `from "${accessUrl}"`)
const {
  feedbackCsv,
  judgeInputError,
  judgesForAward,
  MAX_TOTAL,
  parseJudgeCsv,
  presentationCsv,
  presentationResult,
  presentationTotal,
  projectResult,
  rankResults,
  reviewTotal,
  researchMarkingOpen,
} = await import(
  `data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(model))}`
)

test("research marking stops exactly at the Malaysia deadline", () => {
  const researchClosesAt = "2026-11-28T16:00:00+08:00"
  const end = Date.parse("2026-11-28T08:00:00Z")
  const settings = {
    judgingOpen: false,
    feedbackReleased: false,
    researchMarking: true,
    researchClosesAt,
  }
  assert.equal(researchMarkingOpen(settings, end - 1), true)
  assert.equal(researchMarkingOpen(settings, end), false)
  assert.equal(researchMarkingOpen(settings, end + 1), false)
  assert.equal(
    researchMarkingOpen({ ...settings, feedbackReleased: true }, end - 1),
    false
  )
  assert.equal(
    researchMarkingOpen({ ...settings, researchMarking: null }, end - 1),
    false
  )
})

const keys = [
  "data_collection",
  "analysis",
  "findings_validity",
  "structure",
  "clarity",
  "qa_depth",
  "visual_aids",
  "time_management",
]
const review = (judgeId, projectId, score, extra = {}) => ({
  ...Object.fromEntries(keys.map((key) => [key, score])),
  judgeId,
  projectId,
  remarks: "",
  submittedAt: "2026-11-28T10:00:00Z",
  updatedAt: "2026-11-28T10:00:00Z",
  ...extra,
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
  assert.deepEqual(projectResult("p2", reviews), {
    projectId: "p2",
    submitted: 0,
    drafts: 0,
    averages: null,
    averageTotal: null,
    maxTotal: 40,
  })
  assert.equal(reviewTotal(review("a", "p1", null)), null)
})

test("ranking puts the highest average first and shares ties", () => {
  const ranks = rankResults([
    { projectId: "x", averageTotal: 30 },
    { projectId: "y", averageTotal: 35 },
    { projectId: "z", averageTotal: 30 },
    { projectId: "w", averageTotal: null },
  ])
  assert.deepEqual(
    [...ranks.entries()],
    [
      ["y", 1],
      ["x", 2],
      ["z", 2],
    ]
  )
})

test("Best Presentation averages submitted presentation subtotals from attending main and special judges", () => {
  const judges = [
    { id: "m", kind: "main", attendsDemoDay: true },
    { id: "s", kind: "special", specialAward: "utar", attendsDemoDay: true },
    { id: "remote", kind: "main", attendsDemoDay: false },
    {
      id: "removed",
      kind: "special",
      attendsDemoDay: true,
      deletedAt: "2026-11-24",
    },
  ]
  const ids = judgesForAward(judges, "presentation").map((j) => j.id)
  assert.deepEqual(ids, ["m", "s"])
  const marks = [
    review("m", "a", 5, {
      data_collection: 1,
      analysis: 1,
      findings_validity: 1,
    }),
    review("s", "a", 3, { data_collection: 5 }),
    review("m", "b", 4),
    review("s", "b", 1, { submittedAt: null }),
    review("m", "c", 5, { researchOnly: true }),
    review("s", "c", 5, { clarity: null }),
    review("m", "d", 3),
    review("remote", "c", 5),
    review("removed", "c", 5),
  ].filter((r) => ids.includes(r.judgeId))
  const lineup = ["a", "b", "c", "d"].map((id) => ({
    id,
    code: id,
    title: "Team " + id,
  }))
  const results = lineup.map(({ id }) => presentationResult(id, marks))
  assert.deepEqual(
    results.map((r) => [r.averageTotal, r.submitted, r.maxTotal]),
    [
      [20, 2, 25],
      [20, 1, 25],
      [null, 0, 25],
      [15, 1, 25],
    ]
  )
  const ranks = rankResults(results)
  assert.deepEqual(
    [...ranks],
    [
      ["a", 1],
      ["b", 1],
      ["d", 3],
    ]
  )
  assert.equal(
    presentationTotal(review("m", "c", 5, { researchOnly: true })),
    null
  )
  assert.equal(presentationTotal(review("s", "c", 5, { clarity: 6 })), null)
  assert.match(
    presentationCsv(lineup, results, ranks),
    /1,a,Team a,2,20,25,1\r\n/
  )
  assert.match(presentationCsv(lineup, results, ranks), /3,c,Team c,0,,25,\r\n/)
  marks[0].submittedAt = null
  assert.equal(presentationResult("a", marks).averageTotal, 15)
})

test("presentation ranking stays exact across 100 projects and 50 judges with mixed submission states", () => {
  const reviews = []
  const reference = []
  for (let p = 0; p < 100; p++) {
    const scores = []
    for (let j = 0; j < 50; j++) {
      const score = ((j + p) % 5) + 1
      const researchOnly = j % 7 === 0
      const draft = (p + j) % 6 === 0
      const clarity = ((2 * j + p) % 5) + 1
      reviews.push(
        review(String(j), String(p), score, {
          clarity,
          researchOnly,
          submittedAt: draft ? null : "2026-11-28",
        })
      )
      if (!researchOnly && !draft) scores.push(4 * score + clarity)
    }
    reference.push(scores.reduce((a, b) => a + b, 0) / scores.length)
  }
  const results = reference.map((expected, i) => {
    const result = presentationResult(String(i), reviews)
    assert.equal(result.averageTotal, expected)
    return result
  })
  const ranks = rankResults(results)
  reference.forEach((score, i) =>
    assert.equal(
      ranks.get(String(i)),
      1 + reference.filter((other) => other > score).length
    )
  )
})

test("main and special awards stay independent and rankings use unrounded totals", () => {
  const judges = [
    { id: "main", kind: "main", specialAward: null },
    { id: "special-a", kind: "special", specialAward: "utar" },
    { id: "special-b", kind: "special", specialAward: "mathworks" },
  ]
  assert.deepEqual(
    judgesForAward(judges, "main").map((j) => j.id),
    ["main"]
  )
  assert.deepEqual(
    judgesForAward(judges, "utar").map((j) => j.id),
    ["special-a"]
  )
  assert.deepEqual(
    judgesForAward(judges, "mathworks").map((j) => j.id),
    ["special-b"]
  )
  assert.deepEqual(judgesForAward(judges, "mabecs"), [])
  // A deleted award judge doesn't mix into their replacement's results.
  assert.deepEqual(
    judgesForAward(
      [
        ...judges,
        {
          id: "old-utar",
          kind: "special",
          specialAward: "utar",
          deletedAt: "2026-01-01",
        },
      ],
      "utar"
    ).map((j) => j.id),
    ["special-a"]
  )
  assert.deepEqual(judgesForAward(judges, "missing"), [])
  // Two UTAR judges are averaged together, apart from the other awards.
  const twoUtar = [
    ...judges,
    { id: "special-c", kind: "special", specialAward: "utar" },
  ]
  const utarIds = judgesForAward(twoUtar, "utar").map((j) => j.id)
  assert.deepEqual(utarIds, ["special-a", "special-c"])
  const awardReviews = [
    review("main", "one", 1),
    review("special-a", "one", 2),
    review("special-b", "one", 5),
    review("special-c", "one", 4),
  ]
  const utarResult = projectResult(
    "one",
    awardReviews.filter((r) => utarIds.includes(r.judgeId))
  )
  assert.equal(utarResult.submitted, 2)
  assert.equal(utarResult.averages.clarity, 3)
  const rows = Array.from({ length: 21 }, (_, i) =>
    review(String(i), "one", 4, { clarity: i === 0 ? 5 : 4 })
  )
  const one = projectResult("one", rows)
  const two = projectResult("two", [review("main", "two", 4)])
  assert.ok(one.averageTotal > two.averageTotal)
  assert.equal(one.averageTotal.toFixed(1), two.averageTotal.toFixed(1))
  const ranks = rankResults([two, one])
  assert.equal(ranks.get("one"), 1)
  assert.equal(ranks.get("two"), 2)
})

test("judge details are validated before saving", () => {
  const input = {
    name: "Prof. A",
    email: "a@uni.edu",
    affiliation: "",
    revoked: false,
    cohortYear: 2026,
  }
  assert.equal(judgeInputError(input, []), "")
  assert.match(judgeInputError({ ...input, email: "nope" }, []), /valid email/)
  assert.match(
    judgeInputError(input, [{ id: "1", email: "a@uni.edu", deletedAt: null }]),
    /already in the judge list/
  )
  assert.match(
    judgeInputError(input, [
      { id: "1", email: "a@uni.edu", deletedAt: "2026-01-01" },
    ]),
    /Restore/
  )
  assert.equal(
    judgeInputError(
      input,
      [{ id: "1", email: "a@uni.edu", deletedAt: null }],
      "1"
    ),
    ""
  )
})

test("a special award can have several judges per cohort", () => {
  const input = {
    name: "Dr. B",
    email: "b@uni.edu",
    affiliation: "",
    kind: "special",
    specialAward: null,
    revoked: false,
    cohortYear: 2026,
  }
  assert.match(judgeInputError(input, []), /Choose which special award/)
  const holder = {
    id: "1",
    name: "Dr. A",
    email: "a@uni.edu",
    kind: "special",
    specialAward: "utar",
    cohortYear: 2026,
    deletedAt: null,
  }
  const utar = { ...input, specialAward: "utar" }
  assert.equal(judgeInputError(utar, [holder]), "")
  assert.equal(judgeInputError(utar, [holder], "1"), "")
  assert.equal(
    judgeInputError({ ...input, specialAward: "mabecs" }, [holder]),
    ""
  )
})

test("judge CSV reads award types and rejects the old generic special type", () => {
  const rows = parseJudgeCsv(
    [
      "name,email,affiliation,judge_type",
      "A,a@x.edu,Uni,main",
      "B,b@x.edu,UTAR,utar",
      "C,c@x.edu,MABECS,Special award: MABECS",
      "D,d@x.edu,MathWorks,MathWorks",
      "E,e@x.edu,Other,special",
      "F,f@x.edu,MathWorks,mathworks",
    ].join("\n"),
    2026,
    []
  )
  assert.deepEqual(
    rows.map((row) => [row.kind, row.specialAward, row.error]),
    [
      ["main", null, ""],
      ["special", "utar", ""],
      ["special", "mabecs", ""],
      ["special", "mathworks", ""],
      ["main", null, "Judge type must be main, utar, mabecs or mathworks."],
      ["special", "mathworks", ""],
    ]
  )
})

test("CSV export quotes text and neutralises spreadsheet formulas", () => {
  const csv = feedbackCsv(
    [{ id: "p1", code: "A-1", title: "Trees, graphs" }],
    [
      {
        id: "a",
        name: "Prof. A",
        email: "a@uni.edu",
        kind: "special",
        specialAward: "mathworks",
      },
    ],
    [
      review("a", "p1", 4, {
        researchRemarks: '=HYPERLINK("x") said "great"\nline 2',
        presentationRemarks: "Clear and well paced.",
      }),
    ]
  )
  const [header, row] = csv.trim().split("\r\n")
  assert.match(
    header,
    /^Position,Project code,Project title,Judge,Judge email,Judge type,Status,Data Collection and Execution,/
  )
  assert.match(
    header,
    /Attended Demo Day,Total,Out of,Research review,Presentation review,Submitted at$/
  )
  assert.ok(
    row.startsWith(
      '1,A-1,"Trees, graphs",Prof. A,a@uni.edu,Special award: MathWorks,Submitted,4,4,4,4,4,4,4,4,Yes,32,40,'
    )
  )
  assert.ok(row.includes(`"'=HYPERLINK(""x"") said ""great""\nline 2"`))
})

test("research-only reviews count towards research but not presentation", () => {
  // Two judges at Demo Day and one who reviewed the research only.
  const reviews = [
    review("a", "p1", 4), // 12 research + 20 presentation
    review("b", "p1", 5), // 15 + 25
    review("c", "p1", 3, {
      researchOnly: true,
      structure: null,
      clarity: null,
      qa_depth: null,
      visual_aids: null,
      time_management: null,
    }), // 9 research
  ]
  assert.equal(reviewTotal(reviews[2]), 9)
  const result = projectResult("p1", reviews)
  assert.equal(result.averages.analysis, 4) // (4 + 5 + 3) / 3
  assert.equal(result.averages.clarity, 4.5) // (4 + 5) / 2
  assert.equal(result.maxTotal, 40)
  // Research (12 + 15 + 9) / 3 = 12, presentation (20 + 25) / 2 = 22.5.
  assert.equal(result.averageTotal, 34.5)
  // With full reviews only, the total is the mean of the judges' totals.
  assert.equal(projectResult("p1", reviews.slice(0, 2)).averageTotal, 36)

  // Before any attending judge submits, the project is scored out of 15.
  const early = projectResult("p1", [reviews[2]])
  assert.equal(early.averageTotal, 9)
  assert.equal(early.maxTotal, 15)
  // Rankings compare shares of the maximum: 9/15 = 60% is below 36/40 = 90%.
  const ranks = rankResults([
    { ...early, projectId: "early" },
    projectResult("p1", reviews.slice(0, 2)),
  ])
  assert.equal(ranks.get("p1"), 1)
  assert.equal(ranks.get("early"), 2)
})
