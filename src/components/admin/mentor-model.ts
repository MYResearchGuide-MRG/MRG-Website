import { importRecords } from "./access-model"
import type { Board } from "../projectboard/data"
import type { ProjectSplit } from "./project-registry-model"

export type Mentor = {
  id: string
  userId: string | null
  name: string
  email: string
  affiliation: string
  projectIds: string[]
  revoked: boolean
  invitedAt: number | null
}

export type MentorInput = Pick<Mentor, "name" | "email" | "affiliation" | "projectIds" | "revoked">
export type MentorImportRow = MentorInput & { line: number; error: string }

export const mentorCsvTemplate =
  "name,email,affiliation,project_codes\r\nDr. Example,mentor@example.com,Example University,A-1;A-2\r\n"

// Project codes are cohort-scoped. A retired parent code names its split teams;
// an explicit team code never expands sideways to its siblings.
export function mentorProjectsForCode(code: string, boards: readonly Board[]): Board[] {
  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z]{1,5}-\d{1,4}[A-Z]{0,2}$/.test(normalized)) return []
  const exact = boards.filter(board => board.code.toUpperCase() === normalized)
  if (exact.length) return exact
  return boards.filter(board => {
    const candidate = board.code.toUpperCase()
    return candidate.startsWith(normalized) && /^[A-Z]{1,2}$/.test(candidate.slice(normalized.length))
  })
}

// Live splits copy assignments in Supabase. Resolve device-only assignments in
// the same way so a mentor invited before a split keeps access to every child.
export function resolvePreviewMentorProjects(ids: readonly string[], boards: readonly Board[], splits: readonly ProjectSplit[]): string[] {
  const active = new Set(boards.map(board => board.id))
  const visited = new Set<string>()
  const resolved = new Set<string>()
  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    if (active.has(id)) resolved.add(id)
    else splits.find(split => split.parentId === id)?.teams.forEach(team => visit(team.id))
  }
  ids.forEach(visit)
  return [...resolved]
}

export function mentorInputError(input: MentorInput, boards: readonly Board[], existing: readonly Mentor[], editingId?: string): string {
  if (!input.name.trim() || input.name.trim().length > 100) return "Enter a mentor name of up to 100 characters."
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email) || email.length > 254) return "Enter a valid email address."
  if (input.affiliation.trim().length > 180) return "Keep the affiliation under 180 characters."
  if (existing.some(mentor => mentor.id !== editingId && mentor.email === email)) return "This email is already in the mentor list."
  if (!input.projectIds.length) return "Assign at least one project."
  if (input.projectIds.length > 20) return "Assign up to 20 projects per mentor."
  if (new Set(input.projectIds).size !== input.projectIds.length || input.projectIds.some(id => !boards.some(board => board.id === id))) return "Choose valid projects without duplicates."
  return ""
}

export function parseMentorCsv(text: string, boards: readonly Board[], existing: readonly Mentor[]): MentorImportRow[] {
  const records = importRecords(text)
  const headers = records[0]?.cells.map(cell => cell.toLowerCase().replace(/[\s_-]+/g, "")) || []
  const required = ["name", "email", "affiliation", "projectcodes"]
  if (!required.every(key => headers.includes(key))) {
    return text.trim() ? [{ line: 1, name: "", email: "", affiliation: "", projectIds: [], revoked: false, error: "Use the template headers: name,email,affiliation,project_codes." }] : []
  }
  const seen = new Set(existing.map(mentor => mentor.email))
  return records.slice(1).map(record => {
    const value = (key: string) => record.cells[headers.indexOf(key)]?.trim() || ""
    const codes = value("projectcodes").split(";").map(code => code.trim()).filter(Boolean)
    const matches = codes.map(code => mentorProjectsForCode(code, boards))
    const projectIds = [...new Set(matches.flatMap(projects => projects.map(board => board.id)))]
    const unknownCodes = codes.filter((_, index) => !matches[index].length)
    const row: MentorImportRow = {
      line: record.line,
      name: value("name"), email: value("email").toLowerCase(),
      affiliation: value("affiliation") || boards.find(board => board.id === projectIds[0])?.affiliation || "",
      projectIds, revoked: false, error: "",
    }
    if (record.malformed || record.cells.length !== headers.length) row.error = "Check this CSV row and its quotation marks."
    else if (unknownCodes.length) row.error = `Unknown project code: ${unknownCodes.join(", ")}. Choose a project in this cohort.`
    else if (matches.some(projects => new Set(projects.map(board => board.year)).size > 1)) row.error = "Choose one cohort before importing project codes."
    else row.error = mentorInputError(row, boards, existing)
    if (!row.error && seen.has(row.email)) row.error = "This email appears more than once."
    seen.add(row.email)
    return row
  })
}
