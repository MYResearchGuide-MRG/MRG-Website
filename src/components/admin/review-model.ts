import type { ChecklistItem } from "../projectboard/submission-checklist"

export const reviewChecks = [
  {
    id: "links",
    label: "Video, slides and PDF open without requesting access",
  },
  { id: "guidelines", label: "Materials follow the submission guidelines" },
  { id: "content", label: "Research content and project image reviewed" },
  { id: "team", label: "All student names, schools, bios and photos checked" },
] as const
export type ReviewDecision = "needs_changes" | "approved"
export type CommitteeReview = {
  status: ReviewDecision
  notes: string
  checks: string[]
  version: string
  revision: number
  updatedAt: string
}
export type ReviewRow = {
  id: string
  code: string
  title: string
  year: number
  version: string
  savedAt: string | null
  checklist: ChecklistItem[]
  review: CommitteeReview | null
}
export type ReviewStatus =
  "incomplete" | "ready" | "needs_changes" | "resubmitted" | "approved"
export const reviewLabels: Record<ReviewStatus, string> = {
  incomplete: "Missing content",
  ready: "Ready for review",
  needs_changes: "Changes requested",
  resubmitted: "Needs recheck",
  approved: "Approved",
}
export const componentGroups = [
  {
    id: "title",
    label: "Title",
    match: (item: ChecklistItem) => item.id === "title",
  },
  {
    id: "cover",
    label: "Image",
    match: (item: ChecklistItem) => item.id === "cover",
  },
  {
    id: "overview",
    label: "Overview",
    match: (item: ChecklistItem) => item.section === "overview",
  },
  {
    id: "video",
    label: "Video",
    match: (item: ChecklistItem) => item.id === "video",
  },
  {
    id: "slides",
    label: "Slides",
    match: (item: ChecklistItem) => item.id === "slides",
  },
  {
    id: "paper",
    label: "PDF",
    match: (item: ChecklistItem) => item.id === "paper",
  },
  {
    id: "team",
    label: "Team",
    match: (item: ChecklistItem) => item.section === "team",
  },
] as const
export function missingItems(row: ReviewRow) {
  return row.checklist.filter((item) => !item.done)
}
export function reviewStatus(row: ReviewRow): ReviewStatus {
  if (row.review && row.review.version !== row.version) return "resubmitted"
  if (row.review) return row.review.status
  return missingItems(row).length ? "incomplete" : "ready"
}
export function reviewError(
  row: ReviewRow,
  status: ReviewDecision,
  notes: string,
  checks: string[]
) {
  if (notes.length > 3000)
    return "Keep the review note to 3,000 characters or fewer."
  if (status === "needs_changes" && !notes.trim())
    return "Tell the team what needs changing."
  if (status === "approved" && missingItems(row).length)
    return "Complete the missing content before approving this project."
  if (
    status === "approved" &&
    reviewChecks.some((check) => !checks.includes(check.id))
  )
    return "Complete all four review checks before approving."
  return null
}
export function reviewCsv(rows: ReviewRow[]) {
  const cell = (value: string) =>
    `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`
  return [
    ["project_code", "project_title", "status", "missing_components"],
    ...rows.map((row) => [
      row.code,
      row.title,
      reviewLabels[reviewStatus(row)],
      missingItems(row)
        .map((item) => `${item.label}: ${item.detail}`)
        .join("; "),
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n")
}
