import { importRecords } from "./access-model"
import type { Board } from "../projectboard/data"

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

export function mentorInputError(input: MentorInput, boards: readonly Board[], existing: readonly Mentor[], editingId?: string): string {
  if (!input.name.trim() || input.name.trim().length > 100) return "Enter a mentor name of up to 100 characters."
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email) || email.length > 254) return "Enter a valid email address."
  if (input.affiliation.trim().length > 180) return "Keep the affiliation under 180 characters."
  if (existing.some(mentor => mentor.id !== editingId && mentor.email === email)) return "This email is already in the mentor list."
  if (!input.projectIds.length) return "Assign at least one project."
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
    const projectIds = codes.map(code => boards.find(board => board.code.toLowerCase() === code.toLowerCase())?.id || "")
    const row: MentorImportRow = {
      line: record.line,
      name: value("name"), email: value("email").toLowerCase(),
      affiliation: value("affiliation") || boards.find(board => board.id === projectIds[0])?.affiliation || "",
      projectIds, revoked: false, error: "",
    }
    if (record.malformed || record.cells.length !== headers.length) row.error = "Check this CSV row and its quotation marks."
    else if (projectIds.some(id => !id)) row.error = `Unknown project code. Choose a project in this cohort.`
    else row.error = mentorInputError(row, boards, existing)
    if (!row.error && seen.has(row.email)) row.error = "This email appears more than once."
    seen.add(row.email)
    return row
  })
}
