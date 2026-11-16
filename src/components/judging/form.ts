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
  title: string
  /** Short reminder for judges; the full brief is on the Google Form. */
  description: string
  criteria: Criterion[]
}

export const SCORE_MIN = 1
export const SCORE_MAX = 5
export const REMARKS_MAX = 5000

export const scoreLabels: Record<number, string> = {
  1: "Needs major improvement",
  2: "Needs improvement",
  3: "Meets expectations",
  4: "Strong",
  5: "Exceptional",
}

export const judgingSections: FormSection[] = [
  {
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
    title: "Live Presentation & Q&A",
    description:
      "How effectively the team communicates their research. 15 minutes in total: about 12 minutes of presentation and 3 minutes of Q&A. All members present, and questions may go to anyone.",
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
    key: "researchRemarks",
    label: "Review of Research Execution & Quality",
    hint: "What was done well, what could be improved, or anything specific about the team’s research execution. This review is confidential during judging and shown to the team anonymously after results are announced.",
  },
  {
    key: "presentationRemarks",
    label: "Review of Live Presentation & Q&A",
    hint: "What was done well, what could be improved, or anything specific about the presentation and Q&A. This review is confidential during judging and shown to the team anonymously after results are announced.",
  },
] as const
export type SectionRemarksKey = (typeof sectionRemarks)[number]["key"]

export const scoreKeys: ScoreKey[] = judgingSections.flatMap((section) =>
  section.criteria.map((criterion) => criterion.key)
)

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

/** Labels of everything still needed before the review can be submitted. */
export function missingAnswers(answers: FeedbackAnswers): string[] {
  const missing = judgingSections.flatMap((section) =>
    section.criteria
      .filter((c) => !validScore(answers[c.key]))
      .map((c) => c.label)
  )
  sectionRemarks.forEach(({ key, label }) => {
    if (!answers[key].trim()) missing.push(label)
  })
  return missing
}

export type JudgeKind = "main" | "special"
export const judgeKindLabels: Record<JudgeKind, string> = {
  main: "Main judge",
  special: "Special award judge",
}

/** One submitted review as a team sees it: every score and the remark, labelled only by judge type. */
export type TeamReview = Record<ScoreKey, number> & Record<SectionRemarksKey, string> & {
  kind: JudgeKind
}

/** What a team receives after release: each submitted review, anonymous and in random order. */
export type ReleasedFeedback =
  { released: false } | { released: true; reviews: TeamReview[] }
