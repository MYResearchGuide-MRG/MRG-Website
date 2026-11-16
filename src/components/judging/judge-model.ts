// Pure judging helpers shared by the committee panel and its tests.
import { judgingSections, judgeKindLabels, scoreKeys, SCORE_MAX, type JudgeKind, type ScoreKey } from "./form"

export type CommitteeJudge = {
  id: string
  userId: string | null
  cohortYear: number
  name: string
  email: string
  affiliation: string
  kind: JudgeKind
  revoked: boolean
  invitedAt: number | null
  deletedAt: string | null
}
export type JudgeInput = Pick<CommitteeJudge, "name" | "email" | "affiliation" | "kind" | "revoked" | "cohortYear">
export type JudgingSwitches = { judgingOpen: boolean; feedbackReleased: boolean }
export const closedSwitches: JudgingSwitches = { judgingOpen: false, feedbackReleased: false }

/** One judge's review as the committee sees it. */
export type CommitteeReview = Record<ScoreKey, number | null> & {
  judgeId: string
  projectId: string
  remarks: string
  submittedAt: string | null
  updatedAt: string
}

export const MAX_TOTAL = scoreKeys.length * SCORE_MAX

export function judgeInputError(input: JudgeInput, existing: readonly CommitteeJudge[], editingId?: string): string {
  if (!input.name.trim() || input.name.trim().length > 100) return "Enter a judge name of up to 100 characters."
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email) || email.length > 254) return "Enter a valid email address."
  if (input.affiliation.trim().length > 180) return "Keep the affiliation under 180 characters."
  const duplicate = existing.find(judge => judge.id !== editingId && judge.email === email)
  if (duplicate) return duplicate.deletedAt ? "This judge is in Deleted judges. Restore their account instead." : "This email is already in the judge list."
  return ""
}

export function reviewTotal(review: CommitteeReview): number | null {
  let total = 0
  for (const key of scoreKeys) {
    const score = review[key]
    if (score === null) return null
    total += score
  }
  return total
}

const round = (value: number) => Math.round(value * 10) / 10

export type ProjectResult = {
  projectId: string
  submitted: number
  drafts: number
  averages: Record<ScoreKey, number> | null
  /** Mean of each judge's total out of MAX_TOTAL. */
  averageTotal: number | null
}

/** Only submitted reviews count towards scores. */
export function projectResult(projectId: string, reviews: readonly CommitteeReview[]): ProjectResult {
  const mine = reviews.filter(review => review.projectId === projectId)
  const submitted = mine.filter(review => review.submittedAt)
  if (!submitted.length) return { projectId, submitted: 0, drafts: mine.length, averages: null, averageTotal: null }
  const averages = Object.fromEntries(scoreKeys.map(key => [
    key, round(submitted.reduce((sum, review) => sum + (review[key] ?? 0), 0) / submitted.length),
  ])) as Record<ScoreKey, number>
  const totals = submitted.map(reviewTotal).filter((total): total is number => total !== null)
  return {
    projectId, submitted: submitted.length, drafts: mine.length - submitted.length, averages,
    averageTotal: totals.length ? round(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
  }
}

/** Ranks by average total, highest first; ties share a rank. Unscored projects have none. */
export function rankResults(results: readonly ProjectResult[]): Map<string, number> {
  const scored = results.filter(result => result.averageTotal !== null)
    .sort((a, b) => b.averageTotal! - a.averageTotal!)
  const ranks = new Map<string, number>()
  scored.forEach((result, index) => {
    const previous = scored[index - 1]
    ranks.set(result.projectId, previous && previous.averageTotal === result.averageTotal ? ranks.get(previous.projectId)! : index + 1)
  })
  return ranks
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value)
  // Leading formula characters are neutralised so a remark cannot run as a spreadsheet formula.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

export const criterionLabels: Record<ScoreKey, string> = Object.fromEntries(
  judgingSections.flatMap(section => section.criteria.map(criterion => [criterion.key, criterion.label]))
) as Record<ScoreKey, string>

/** One row per review, in lineup order then judge name. */
export function feedbackCsv(
  lineup: readonly { id: string; code: string; title: string }[],
  judges: readonly CommitteeJudge[],
  reviews: readonly CommitteeReview[],
): string {
  const header = ["Position", "Project code", "Project title", "Judge", "Judge email", "Judge type", "Status",
    ...scoreKeys.map(key => criterionLabels[key]), `Total (/${MAX_TOTAL})`, "Remarks", "Submitted at"]
  const rows: (string | number | null)[][] = []
  lineup.forEach((project, index) => {
    const projectReviews = reviews.filter(review => review.projectId === project.id)
      .map(review => ({ review, judge: judges.find(judge => judge.id === review.judgeId) }))
      .sort((a, b) => (a.judge?.name || "").localeCompare(b.judge?.name || ""))
    for (const { review, judge } of projectReviews) rows.push([
      index + 1, project.code, project.title, judge?.name || "Unknown judge", judge?.email || "",
      judge ? judgeKindLabels[judge.kind ?? "main"] : "",
      review.submittedAt ? "Submitted" : "Draft",
      ...scoreKeys.map(key => review[key]), reviewTotal(review), review.remarks, review.submittedAt,
    ])
  })
  return [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n"
}
