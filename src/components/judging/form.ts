// Demo Day judging form, copied from the committee's Google Form.
// Score keys are database columns in myssp_judge_feedback
// (supabase/migrations/202611140001_judging.sql). Keep the two in step.

export type ScoreKey =
  | "data_collection"
  | "analysis"
  | "findings_validity"
  | "structure"
  | "clarity"
  | "qa_depth"
  | "visual_aids"
  | "time_management"

export type Criterion = { key: ScoreKey; label: string }
export type FormSection = {
  /** Presentation sections are left out for judges who do not attend Demo Day. */
  part: "research" | "presentation"
  title: string
  /** Short reminder for judges; the full brief is on the Google Form. */
  description: string
  criteria: Criterion[]
}

export const SCORE_MIN = 1
export const SCORE_MAX = 5
export const REMARKS_MAX = 5000
/** Official Judging Rubrics; its sections 1 and 2 match the two scoring sections. */
export const RUBRIC_URL =
  "https://docs.google.com/document/d/1n3VA7un4CZ7THHeRjW_6qN6YSI0C3-lmlL3f3mR8Tz4/edit?tab=t.0"

export const scoreLabels: Record<number, string> = {
  1: "Needs major improvement",
  2: "Needs improvement",
  3: "Meets expectations",
  4: "Strong",
  5: "Exceptional",
}

export const judgingSections: FormSection[] = [
  {
    part: "research",
    title: "Research Execution & Quality",
    description:
      "The quality and rigour of the team's execution: how well the research was carried out, how well the data was handled, and how well the findings come together.",
    criteria: [
      { key: "data_collection", label: "Data Collection and Execution" },
      { key: "analysis", label: "Analysis and Interpretation" },
      { key: "findings_validity", label: "Quality and Validity of Findings" },
    ],
  },
  {
    part: "presentation",
    title: "Live Presentation & Q&A",
    description:
      "How effectively the team communicates their research. All team members are expected to present, and judges may direct questions to any member.",
    criteria: [
      { key: "structure", label: "Structure and Content Coverage" },
      { key: "clarity", label: "Clarity of Explanation" },
      { key: "qa_depth", label: "Q&A + Depth of Understanding" },
      { key: "visual_aids", label: "Visual Aids" },
      { key: "time_management", label: "Time Management" },
    ],
  },
]

export const sectionRemarks = [
  {
    part: "research",
    key: "researchRemarks",
    label: "Review of Research Execution & Quality",
    hint: "What was done well, what could be improved, or anything specific about the team’s research execution. This review stays private until the committee releases it anonymously to the team.",
  },
  {
    part: "presentation",
    key: "presentationRemarks",
    label: "Review of Live Presentation & Q&A",
    hint: "What was done well, what could be improved, or anything specific about the presentation and Q&A. This review stays private until the committee releases it anonymously to the team.",
  },
] as const
export type SectionRemarksKey = (typeof sectionRemarks)[number]["key"]

export const scoreKeys: ScoreKey[] = judgingSections.flatMap((section) =>
  section.criteria.map((criterion) => criterion.key)
)

/** A research-only review comes from a judge who did not attend Demo Day. */
export function sectionsFor(researchOnly: boolean): FormSection[] {
  return researchOnly
    ? judgingSections.filter((section) => section.part === "research")
    : judgingSections
}
export function scoreKeysFor(researchOnly: boolean): ScoreKey[] {
  return sectionsFor(researchOnly).flatMap((section) =>
    section.criteria.map((criterion) => criterion.key)
  )
}
export function remarksFor(researchOnly: boolean) {
  return sectionRemarks.filter(
    (remark) => !researchOnly || remark.part === "research"
  )
}
/** Highest possible total: 40 for a full review, 15 for research only. */
export function maxTotalFor(researchOnly: boolean): number {
  return scoreKeysFor(researchOnly).length * SCORE_MAX
}
export const presentationKeys: ScoreKey[] = judgingSections
  .filter((section) => section.part === "presentation")
  .flatMap((section) => section.criteria.map((criterion) => criterion.key))

export type Scores = Record<ScoreKey, number | null>
export type FeedbackAnswers = Scores & Record<SectionRemarksKey, string>

export function emptyAnswers(): FeedbackAnswers {
  return {
    ...(Object.fromEntries(scoreKeys.map((key) => [key, null])) as Scores),
    researchRemarks: "",
    presentationRemarks: "",
  }
}

export function validScore(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= SCORE_MIN &&
    (value as number) <= SCORE_MAX
  )
}

/** Clears presentation answers, which a research-only review never keeps. */
export function withoutPresentation<T extends FeedbackAnswers>(answers: T): T {
  return {
    ...answers,
    ...Object.fromEntries(presentationKeys.map((key) => [key, null])),
    presentationRemarks: "",
  }
}

/** Labels of everything still needed before the review can be submitted. */
export function missingAnswers(
  answers: FeedbackAnswers,
  researchOnly = false
): string[] {
  const missing = sectionsFor(researchOnly).flatMap((section) =>
    section.criteria
      .filter((c) => !validScore(answers[c.key]))
      .map((c) => c.label)
  )
  remarksFor(researchOnly).forEach(({ key, label }) => {
    if (!answers[key].trim()) missing.push(label)
  })
  return missing
}

export type JudgeKind = "main" | "special"
export const judgeKindLabels: Record<JudgeKind, string> = {
  main: "Main judge",
  special: "Special award judge",
}

/** Each special award has its own judge and its own results. */
export const specialAwards = {
  utar: "UTAR",
  mabecs: "MABECS",
  mathworks: "MathWorks",
} as const
export type SpecialAward = keyof typeof specialAwards
export const specialAwardKeys = Object.keys(specialAwards) as SpecialAward[]

/** What the committee picks for a judge: main, or one of the special awards. */
export type JudgeType = "main" | SpecialAward
export const judgeTypes: JudgeType[] = ["main", ...specialAwardKeys]
export const judgeTypeLabels: Record<JudgeType, string> = {
  main: "Main judge",
  utar: "Special award: UTAR",
  mabecs: "Special award: MABECS",
  mathworks: "Special award: MathWorks",
}

export function judgeTypeOf(judge: {
  kind?: JudgeKind
  specialAward?: SpecialAward | null
}): JudgeType | "special" {
  if (judge.kind !== "special") return "main"
  return judge.specialAward ?? "special"
}

/** Label for a judge's type; a special judge saved before awards existed has none. */
export function judgeTypeLabel(judge: {
  kind?: JudgeKind
  specialAward?: SpecialAward | null
}) {
  const type = judgeTypeOf(judge)
  return type === "special"
    ? "Special award: award not set"
    : judgeTypeLabels[type]
}

/** Short badge text, e.g. "MathWorks award". */
export function specialAwardBadge(award: SpecialAward | null | undefined) {
  return award ? `${specialAwards[award]} award` : "Special award"
}

/**
 * One submitted review as a team sees it: every score and the remark, labelled
 * only by judge type. A research-only review has null presentation scores.
 */
export type TeamReview = Record<ScoreKey, number | null> &
  Record<SectionRemarksKey, string> & {
    kind: JudgeKind
    /** Missing from feedback released before attendance existed. */
    researchOnly?: boolean
  }

/** What a team receives after release: each submitted review, anonymous and in random order. */
export type ReleasedFeedback =
  { released: false } | { released: true; reviews: TeamReview[] }
