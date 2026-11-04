import { projects, projectCodes, trackOrder, type Track } from "@/data/competition-data"
import { SELECTED } from "@/data/selected"

export { trackOrder }
export type { Track }

export const trackLabels: Record<Track, string> = {
  "AI & Computer Sciences": "AI & computing",
  Biology: "Biology",
  Chemistry: "Chemistry",
  Mathematics: "Mathematics",
  "Interdisciplinary & Social Sciences": "Interdisciplinary",
  Physics: "Physics",
}

const codes = projectCodes(projects)
export const awardCategories = [
  { id: "main", label: "Main award" },
  { id: "special", label: "Special award" },
] as const
export type AwardCategory = (typeof awardCategories)[number]["id"]
export type BoardAward = { category: AwardCategory; name: string }

export const boards = projects
  .filter((p) => p.status === "confirmed")
  .map((project) => ({
    ...project,
    code: codes.get(project.id)!,
    year: 2026,
    // Populate only after the committee confirms award results.
    awards: [] as BoardAward[],
    team: SELECTED.filter((student) => student.code === codes.get(project.id)),
  }))
export type Board = (typeof boards)[number]
export const programmeYears = [...new Set(boards.map((board) => board.year))].sort((a, b) => b - a)
export const demoBoard = boards[0]

export type OverviewFormat = "plain" | "markdown"
export type Draft = {
  version: 1
  projectId: string
  title: string
  summary: string
  // Optional so drafts saved before the Markdown editor remain compatible.
  overviewFormat?: OverviewFormat
  question: string
  method: string
  findings: string
  slides: string
  paper: string
  video: string
  savedAt: string | null
}
export const draftKey = "myssp-projectboard-preview:draft:v1"

export function newDraft(): Draft {
  return {
    version: 1,
    projectId: demoBoard.id,
    title: demoBoard.title,
    summary: demoBoard.description,
    overviewFormat: "plain",
    question:
      "How does the amount and position of occlusion affect a pretrained object detector's performance?",
    method: demoBoard.tasks.join("\n"),
    findings: "",
    slides: "",
    paper: "",
    video: "",
    savedAt: null,
  }
}

export function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    v.projectId === demoBoard.id &&
    (v.overviewFormat === undefined ||
      v.overviewFormat === "plain" ||
      v.overviewFormat === "markdown") &&
    ["title", "summary", "question", "method", "findings", "slides", "paper", "video"].every(
      (key) => typeof v[key] === "string"
    ) &&
    (v.savedAt === null ||
      (typeof v.savedAt === "string" && Number.isFinite(Date.parse(v.savedAt))))
  )
}

export function loadDraft(): Draft {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(draftKey) || "null")
    return isDraft(value) ? value : newDraft()
  } catch {
    return newDraft()
  }
}

export function validMaterialUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    return ["https:", "http:"].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
