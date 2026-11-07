import type { Board, Draft } from "./data"
import { materialEmbed } from "./materials"
import { overviewFields } from "./overview"

export type ChecklistSection = "heading" | "overview" | "materials" | "team"
export type ChecklistItem = { id: string; label: string; detail: string; done: boolean; section: ChecklistSection }
const normalise = (value: string) => value.trim().replace(/\s+/g, " ")
const filled = (value: string | undefined, limit: number) => Boolean(value?.trim() && value.length <= limit)
const photo = (value: string | undefined) => Boolean(value && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value))

export function submissionChecklist(board: Board, draft: Draft): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { id: "title", label: "Project title", detail: "Use your final research title.", done: filled(draft.title, 240), section: "heading" },
    { id: "cover", label: "Project image", detail: "Add a 16:9 cover image and a short image description.", done: photo(draft.coverImage) && filled(draft.coverAlt, 200), section: "heading" },
    ...overviewFields.map(({key, label, maxLength}) => ({
      id: key, label, section: "overview" as const,
      detail: key === "summary" || key === "method" ? "Replace the original project brief with your team's completed work." : "Describe your team's completed research in Markdown.",
      done: filled(draft[key], maxLength) && (key !== "summary" || normalise(draft.summary) !== normalise(board.description)) && (key !== "method" || normalise(draft.method) !== normalise(board.tasks.map(task => `- ${task}`).join("\n"))),
    })),
  ]
  for (const [index, assigned] of board.team.entries()) {
    const member = draft.teamMembers?.find(member => member.id === (assigned.memberId ?? `${board.id}:member-${index + 1}`))
    items.push({ id: `member-${index}`, label: member?.name || assigned.name, section: "team", detail: "Check name and school. Add a short bio and a profile photo.", done: Boolean(member && filled(member.name, 100) && filled(member.school, 200) && filled(member.bio, 500) && photo(member.photo)) })
  }
  if (!board.team.length) items.push({ id: "team", label: "Student team", detail: "Ask the committee to assign your team members.", done: false, section: "team" })
  for (const [key, label, detail] of [
    ["video", "Video presentation", "YouTube, 2–3 minutes, at least 1080p. Every member must appear and speak."],
    ["slides", "Presentation slides", "Canva public view link. Up to 12 pages using the official template."],
    ["paper", "Research write-up", "Final PDF on Google Drive. Anyone with the link must be able to view it."],
  ] as const) items.push({id:key,label,detail,done:Boolean(materialEmbed(key,draft[key])),section:"materials"})
  return items
}

// Change detector only, never an authentication or integrity credential.
export function submissionFingerprint(draft: Draft): string {
  const text = JSON.stringify([draft.title,draft.coverImage,draft.coverAlt,draft.summary,draft.question,draft.method,draft.findings,draft.video,draft.slides,draft.paper,draft.teamMembers])
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return `v1-${(hash >>> 0).toString(36)}`
}

export function submissionReviewed(draft: Draft) {
  return draft.reviewedFingerprint === submissionFingerprint(draft)
}
