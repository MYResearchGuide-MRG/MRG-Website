// Pure judging helpers shared by the committee panel and its tests.
import {
  judgingSections,
  judgeTypeLabel,
  maxTotalFor,
  scoreKeys,
  scoreKeysFor,
  SCORE_MAX,
  specialAwardKeys,
  type JudgeKind,
  type ScoreKey,
  type SpecialAward,
} from "./form"
import { importRecords } from "../admin/access-model"

export type CommitteeJudge = {
  id: string
  userId: string | null
  cohortYear: number
  name: string
  email: string
  affiliation: string
  kind: JudgeKind
  /** Which special award a special judge marks; null for main judges. */
  specialAward: SpecialAward | null
  /** Judges who miss Demo Day review the research only. */
  attendsDemoDay: boolean
  revoked: boolean
  invitedAt: number | null
  deletedAt: string | null
}
export type JudgeInput = Pick<
  CommitteeJudge,
  | "name"
  | "email"
  | "affiliation"
  | "kind"
  | "specialAward"
  | "attendsDemoDay"
  | "revoked"
  | "cohortYear"
>
export type JudgeImportRow = JudgeInput & { line: number; error: string }

export const judgeCsvTemplate =
  "name,email,affiliation,judge_type,attends_demo_day\r\nDr. Example,judge@example.com,Example University,main,yes\r\nDr. Sponsor,sponsor@example.com,MathWorks,mathworks,yes\r\n"

export function parseJudgeCsv(
  text: string,
  cohortYear: number,
  existing: readonly CommitteeJudge[]
): JudgeImportRow[] {
  const records = importRecords(text)
  const headers =
    records[0]?.cells.map((cell) =>
      cell.toLowerCase().replace(/[\s_-]+/g, "")
    ) || []
  const required = ["name", "email", "affiliation", "judgetype"]
  if (!required.every((key) => headers.includes(key))) {
    return text.trim()
      ? [
          {
            line: 1,
            name: "",
            email: "",
            affiliation: "",
            kind: "main",
            specialAward: null,
            attendsDemoDay: true,
            revoked: false,
            cohortYear,
            error:
              "Use the template headers: name,email,affiliation,judge_type.",
          },
        ]
      : []
  }
  const seen = new Set(existing.map((judge) => judge.email.toLowerCase()))
  // Optional column, so older CSVs without it still import.
  const hasAttendance = headers.includes("attendsdemoday")
  return records.slice(1).map((record) => {
    const value = (key: string) =>
      record.cells[headers.indexOf(key)]?.trim() || ""
    const attendance = hasAttendance
      ? value("attendsdemoday").toLowerCase()
      : ""
    const kindValue = value("judgetype")
      .toLowerCase()
      .replace(/[^a-z]+/g, "")
      .replace(/^specialaward(judge)?/, "")
    const award = specialAwardKeys.find((key) => key === kindValue) ?? null
    const row: JudgeImportRow = {
      line: record.line,
      name: value("name"),
      email: value("email").toLowerCase(),
      affiliation: value("affiliation"),
      kind: award ? "special" : "main",
      specialAward: award,
      attendsDemoDay: !["no", "n", "false", "0"].includes(attendance),
      revoked: false,
      cohortYear,
      error: "",
    }
    if (record.malformed || record.cells.length !== headers.length)
      row.error = "Check this CSV row and its quotation marks."
    else if (!award && !["main", "mainjudge"].includes(kindValue))
      row.error = "Judge type must be main, utar, mabecs or mathworks."
    else if (
      attendance &&
      !["yes", "y", "true", "1", "no", "n", "false", "0"].includes(attendance)
    )
      row.error = "Attends Demo Day must be yes or no."
    else row.error = judgeInputError(row, existing)
    if (!row.error && seen.has(row.email))
      row.error =
        "This email appears more than once or is already in the judge list."
    seen.add(row.email)
    return row
  })
}
export type JudgingSwitches = {
  /** null follows general judging until a committee member overrides it. */
  researchMarking?: boolean | null
  researchClosesAt?: string | null
  judgingOpen: boolean
  feedbackReleased: boolean
}
export function researchMarkingOpen(
  settings: JudgingSwitches,
  now = Date.now()
) {
  return (
    !settings.feedbackReleased &&
    (settings.researchMarking ?? settings.judgingOpen) &&
    (!settings.researchClosesAt || now < Date.parse(settings.researchClosesAt))
  )
}

export function researchDeadlineLabel(value: string) {
  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date(value)) + " MYT"
  )
}

export const closedSwitches: JudgingSwitches = {
  judgingOpen: false,
  feedbackReleased: false,
}

/**
 * Special awards have independent judges and must not alter the main ranking.
 * An award's results average every active judge of that award; a deleted
 * judge who held it before doesn't mix into the averages.
 */
export function judgesForAward(
  judges: readonly CommitteeJudge[],
  award: string
) {
  return judges.filter((judge) =>
    award === "main"
      ? judge.kind === "main"
      : judge.kind === "special" &&
        judge.specialAward === award &&
        !judge.deletedAt
  )
}

/** One judge's review as the committee sees it. */
export type CommitteeReview = Record<ScoreKey, number | null> & {
  judgeId: string
  projectId: string
  researchRemarks: string
  presentationRemarks: string
  /** From a judge who did not attend Demo Day: research scores only. */
  researchOnly: boolean
  submittedAt: string | null
  updatedAt: string
}

export const MAX_TOTAL = scoreKeys.length * SCORE_MAX

/** Highest possible total for this review: 40, or 15 if research only. */
export function reviewMax(review: Pick<CommitteeReview, "researchOnly">) {
  return maxTotalFor(review.researchOnly)
}

export function judgeInputError(
  input: JudgeInput,
  existing: readonly CommitteeJudge[],
  editingId?: string
): string {
  if (!input.name.trim() || input.name.trim().length > 100)
    return "Enter a judge name of up to 100 characters."
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email) || email.length > 254)
    return "Enter a valid email address."
  if (input.affiliation.trim().length > 180)
    return "Keep the affiliation under 180 characters."
  const duplicate = existing.find(
    (judge) => judge.id !== editingId && judge.email === email
  )
  if (duplicate)
    return duplicate.deletedAt
      ? "This judge is in Deleted judges. Restore their account instead."
      : "This email is already in the judge list."
  if (input.kind === "special" && !input.specialAward)
    return "Choose which special award this judge marks."
  return ""
}

export function reviewTotal(review: CommitteeReview): number | null {
  let total = 0
  for (const key of scoreKeysFor(review.researchOnly)) {
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
  /** Rounded per-criterion averages; null for a criterion nobody scored yet. */
  averages: Record<ScoreKey, number | null> | null
  /**
   * Sum of each criterion's average, out of maxTotal. Each criterion is
   * averaged over the judges who scored it, so research-only reviews count
   * towards research but not presentation. With full reviews only, this is
   * the mean of the judges' totals.
   */
  averageTotal: number | null
  /** 40, or 15 while only research-only reviews are in. */
  maxTotal: number
}

/** Only submitted reviews count towards scores. */
export function projectResult(
  projectId: string,
  reviews: readonly CommitteeReview[]
): ProjectResult {
  const mine = reviews.filter((review) => review.projectId === projectId)
  const submitted = mine.filter((review) => review.submittedAt)
  if (!submitted.length)
    return {
      projectId,
      submitted: 0,
      drafts: mine.length,
      averages: null,
      averageTotal: null,
      maxTotal: MAX_TOTAL,
    }
  const exact = new Map<ScoreKey, number>()
  for (const key of scoreKeys) {
    const scores = submitted
      .filter((review) => scoreKeysFor(review.researchOnly).includes(key))
      .map((review) => review[key])
      .filter((score): score is number => score !== null)
    if (scores.length)
      exact.set(key, scores.reduce((a, b) => a + b, 0) / scores.length)
  }
  const averages = Object.fromEntries(
    scoreKeys.map((key) => {
      const value = exact.get(key)
      return [key, value === undefined ? null : round(value)]
    })
  ) as Record<ScoreKey, number | null>
  return {
    projectId,
    submitted: submitted.length,
    drafts: mine.length - submitted.length,
    averages,
    averageTotal: exact.size
      ? [...exact.values()].reduce((a, b) => a + b, 0)
      : null,
    maxTotal: exact.size * SCORE_MAX,
  }
}

/**
 * Ranks by average total as a share of its maximum, highest first; ties share
 * a rank. Unscored projects have none. Once every review is in, all maxima are
 * equal and this is a plain ranking by total.
 */
export function rankResults(
  results: readonly Pick<
    ProjectResult,
    "projectId" | "averageTotal" | "maxTotal"
  >[]
): Map<string, number> {
  const share = (result: (typeof results)[number]) =>
    result.averageTotal! / (result.maxTotal || MAX_TOTAL)
  const scored = results
    .filter((result) => result.averageTotal !== null)
    .sort((a, b) => share(b) - share(a))
  const ranks = new Map<string, number>()
  scored.forEach((result, index) => {
    const previous = scored[index - 1]
    ranks.set(
      result.projectId,
      // Sums of averages can differ in the last bits when the scores tie.
      previous && Math.abs(share(previous) - share(result)) < 1e-9
        ? ranks.get(previous.projectId)!
        : index + 1
    )
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
  judgingSections.flatMap((section) =>
    section.criteria.map((criterion) => [criterion.key, criterion.label])
  )
) as Record<ScoreKey, string>

/** One row per review, in lineup order then judge name. */
export function feedbackCsv(
  lineup: readonly { id: string; code: string; title: string }[],
  judges: readonly CommitteeJudge[],
  reviews: readonly CommitteeReview[]
): string {
  const header = [
    "Position",
    "Project code",
    "Project title",
    "Judge",
    "Judge email",
    "Judge type",
    "Status",
    ...scoreKeys.map((key) => criterionLabels[key]),
    "Attended Demo Day",
    "Total",
    "Out of",
    "Research review",
    "Presentation review",
    "Submitted at",
  ]
  const rows: (string | number | null)[][] = []
  lineup.forEach((project, index) => {
    const projectReviews = reviews
      .filter((review) => review.projectId === project.id)
      .map((review) => ({
        review,
        judge: judges.find((judge) => judge.id === review.judgeId),
      }))
      .sort((a, b) => (a.judge?.name || "").localeCompare(b.judge?.name || ""))
    for (const { review, judge } of projectReviews)
      rows.push([
        index + 1,
        project.code,
        project.title,
        judge?.name || "Unknown judge",
        judge?.email || "",
        judge ? judgeTypeLabel(judge) : "",
        review.submittedAt ? "Submitted" : "Draft",
        ...scoreKeys.map((key) => review[key]),
        review.researchOnly ? "No" : "Yes",
        reviewTotal(review),
        reviewMax(review),
        review.researchRemarks,
        review.presentationRemarks,
        review.submittedAt,
      ])
  })
  return (
    [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  )
}
