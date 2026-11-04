import {
  projects,
  projectCodes,
  trackOrder,
  type Track,
} from "@/data/competition-data"
import { SELECTED } from "@/data/selected"
import { validAdditionalMaterials, type AdditionalMaterial } from "./materials"

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
export const programmeYears = [
  ...new Set(boards.map((board) => board.year)),
].sort((a, b) => b - a)
export const demoBoard = boards[0]

export type TeamMemberProfile = {
  id: string
  name: string
  school: string
  bio: string
  photo: string
}

// Stable profile IDs do not change when a student edits their display name.
// These are display records, not authentication/team-membership records.
export function teamProfiles(board: Board): TeamMemberProfile[] {
  return board.team.map((person, index) => ({
    id: `${board.id}:member-${index + 1}`,
    name: person.name,
    school: person.school,
    bio: "",
    photo: "",
  }))
}

export type Draft = {
  version: 1
  readonly projectId: string
  title: string
  coverImage?: string
  coverAlt?: string
  teamMembers?: TeamMemberProfile[]
  summary: string
  // Legacy formats remain readable; all new edits and saves use Markdown.
  overviewFormat?: "plain" | "markdown"
  question: string
  method: string
  findings: string
  slides: string
  paper: string
  video: string
  additionalMaterials?: AdditionalMaterial[]
  savedAt: string | null
}
export const draftKey = "myssp-projectboard-preview:draft:v1"

export function projectDraftKey(board: Board): string {
  return board.id === demoBoard.id ? draftKey : `${draftKey}:${board.id}`
}

export function newDraft(board: Board = demoBoard): Draft {
  return {
    version: 1,
    projectId: board.id,
    title: board.title,
    coverImage: "",
    coverAlt: "",
    teamMembers: teamProfiles(board),
    summary: board.description,
    overviewFormat: "markdown",
    question: "",
    method: board.tasks.map((task) => `- ${task}`).join("\n"),
    findings: "",
    slides: "",
    paper: "",
    video: "",
    additionalMaterials: [],
    savedAt: null,
  }
}

export function isDraft(
  value: unknown,
  board: Board = demoBoard
): value is Draft {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    v.projectId === board.id &&
    (v.coverImage === undefined || validCoverImage(v.coverImage)) &&
    (v.coverAlt === undefined ||
      (typeof v.coverAlt === "string" && v.coverAlt.length <= 200)) &&
    (v.teamMembers === undefined || validTeamProfiles(v.teamMembers, board)) &&
    (v.additionalMaterials === undefined ||
      validAdditionalMaterials(v.additionalMaterials)) &&
    (v.overviewFormat === undefined ||
      v.overviewFormat === "plain" ||
      v.overviewFormat === "markdown") &&
    [
      "title",
      "summary",
      "question",
      "method",
      "findings",
      "slides",
      "paper",
      "video",
    ].every((key) => typeof v[key] === "string") &&
    (v.savedAt === null ||
      (typeof v.savedAt === "string" && Number.isFinite(Date.parse(v.savedAt))))
  )
}

export function validTeamProfiles(
  value: unknown,
  board: Board
): value is TeamMemberProfile[] {
  const assigned = teamProfiles(board)
  return (
    Array.isArray(value) &&
    value.length === assigned.length &&
    value.every((member: unknown, index) => {
      if (!member || typeof member !== "object") return false
      const m = member as Record<string, unknown>
      return (
        m.id === assigned[index].id &&
        typeof m.name === "string" &&
        m.name.trim().length > 0 &&
        m.name.length <= 100 &&
        typeof m.school === "string" &&
        m.school.length <= 200 &&
        typeof m.bio === "string" &&
        m.bio.length <= 500 &&
        validCoverImage(m.photo) &&
        m.photo.length <= 350_000
      )
    })
  )
}

export function validCoverImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value === "" ||
      (value.length <= 1_500_000 &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value)))
  )
}

export function loadDraft(board: Board = demoBoard): Draft {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(projectDraftKey(board)) || "null"
    )
    // Keep older source text intact, including over-limit drafts. The editor
    // asks the participant to shorten them before saving; never discard work.
    return isDraft(value, board)
      ? { ...value, overviewFormat: "markdown" }
      : newDraft(board)
  } catch {
    return newDraft(board)
  }
}
