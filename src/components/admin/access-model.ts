// Local preview model only. Production authorization belongs in Supabase RLS.
export type Assignment = {
  id: string
  userId?: string | null
  name: string
  email: string
  projectId: string
  revision: number
  revoked: boolean
  code: string | null
  expiresAt: number
  usedAt: number | null
  invitedAt?: number | null
  attempts: number
  lockedUntil: number
  displayProfile?: { name?: string; school?: string; bio?: string; photo?: string }
}
export type ParticipantSession = {
  participantId: string
  projectId: string
  revision: number
  expiresAt: number
}
export type ImportRow = {
  line: number
  name: string
  email: string
  projectId: string
  error: string
}
export type ProjectOption = { id: string; code: string }
export const LOCKOUT_DURATION = 15 * 60 * 1000

export const participantCsvTemplate = 'name,email,project_code\r\nAlex Tan,alex@example.com,A-1\r\nSam Lee,sam@example.com,A-2\r\n'

// Handles spreadsheet TSV and RFC-style quoted CSV, including embedded newlines.
function importRecords(text: string) {
  text = text.replace(/^\uFEFF/, "")
  const firstDelimitedLine = text.split(/\r?\n/).find(line => line.includes("\t") || line.includes(",")) || ""
  const separator = firstDelimitedLine.includes("\t") ? "\t" : ","
  const records: { cells: string[]; line: number; malformed: boolean }[] = []
  let cells: string[] = [], cell = "", quoted = false, closed = false, malformed = false
  let line = 1, start = 1
  function finish() {
    cells.push(cell.trim())
    if (cells.some(Boolean)) records.push({ cells, line: start, malformed })
    cells = []; cell = ""; closed = false; malformed = false; start = line + 1
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ }
      else if (quoted) { quoted = false; closed = true }
      else if (!cell.trim() && !closed) quoted = true
      else malformed = true
    } else if (ch === separator && !quoted) {
      cells.push(cell.trim()); cell = ""; closed = false
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++
      finish(); line++
    } else {
      if (closed && ch.trim()) malformed = true
      cell += ch
      if (ch === "\n") line++
    }
  }
  malformed ||= quoted
  finish()
  return records
}

export function parseParticipants(
  text: string,
  defaultProject: string,
  projects: ProjectOption[],
  existing: Assignment[]
): ImportRow[] {
  const seen = new Set(existing.map((p) => p.email.toLowerCase()))
  const records = importRecords(text)
  const header = records[0]?.cells.map(c => c.toLowerCase().replace(/[_\s-]+/g, " ")) || []
  const hasHeader = header.includes("email") || header.includes("email address")
  const emailIndex = header.findIndex(c => c === "email" || c === "email address")
  const nameIndex = header.findIndex(c => c === "name" || c === "full name")
  const projectIndex = header.findIndex(c => ["project code", "selected project", "project"].includes(c))
  return records.slice(hasHeader ? 1 : 0).map(({ cells, line, malformed }) => {
      const [name = "", email = "", code = ""] = hasHeader
        ? [cells[nameIndex] || "", cells[emailIndex], cells[projectIndex] || ""]
        : cells.length === 1 ? ["", cells[0], ""] : cells
      const normalizedEmail = (email || "").toLowerCase()
      const projectId = code
        ? projects.find((p) => p.code.toLowerCase() === code.toLowerCase())
            ?.id || ""
        : defaultProject
      let error = ""
      if (malformed) error = "Check quotation marks in this CSV row."
      else if (hasHeader && (nameIndex < 0 || projectIndex < 0)) error = "Headers must include name, email and project_code."
      else if (!hasHeader && cells.length > 3) error = "Use name, email, project code or include a header row."
      else if (
        !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(normalizedEmail) ||
        normalizedEmail.length > 254
      )
        error = "Enter a valid email."
      else if (name.length > 100)
        error = "Name must be 100 characters or fewer."
      else if (!projects.some((p) => p.id === projectId))
        error = "Choose a project or use a valid project code."
      else if (seen.has(normalizedEmail)) error = "Email already added."
      seen.add(normalizedEmail)
      return { line, name, email: normalizedEmail, projectId, error }
    })
}

export function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  // Rejection sampling keeps generation unbiased if the alphabet changes.
  let code = ""
  while (code.length < 6) {
    const bytes = crypto.getRandomValues(new Uint8Array(12))
    for (const byte of bytes) {
      if (byte < Math.floor(256 / alphabet.length) * alphabet.length)
        code += alphabet[byte % alphabet.length]
      if (code.length === 6) break
    }
  }
  return code
}

export function issueCode(person: Assignment): Assignment {
  return {
    ...person,
    code: generateCode(),
    expiresAt: Number.MAX_SAFE_INTEGER,
    usedAt: null,
  }
}

export function verifyCode(
  person: Assignment,
  code: string,
  now = Date.now()
): { person: Assignment; session: ParticipantSession | null } {
  if (
    person.revoked ||
    person.lockedUntil > now ||
    !person.code ||
    person.expiresAt <= now
  )
    return { person, session: null }
  if (person.code !== code.trim().toUpperCase()) {
    const attempts =
      (person.lockedUntil && person.lockedUntil <= now ? 0 : person.attempts) +
      1
    return {
      person: {
        ...person,
        attempts,
        lockedUntil: attempts >= 5 ? now + LOCKOUT_DURATION : 0,
      },
      session: null,
    }
  }
  return {
    person: { ...person, usedAt: now, attempts: 0, lockedUntil: 0 },
    session: {
      participantId: person.id,
      projectId: person.projectId,
      revision: person.revision,
      expiresAt: now + 8 * 60 * 60 * 1000,
    },
  }
}

export function canEdit(
  session: ParticipantSession | null,
  person: Assignment | undefined,
  projectId: string,
  now = Date.now()
): boolean {
  return Boolean(
    session &&
    person &&
    !person.revoked &&
    session.expiresAt > now &&
    session.participantId === person.id &&
    session.revision === person.revision &&
    session.projectId === person.projectId &&
    projectId === person.projectId
  )
}

export function changeAssignment(
  person: Assignment,
  projectId: string,
  revoked = person.revoked
): Assignment {
  return {
    ...person,
    projectId,
    revoked,
    revision: person.revision + 1,
    code: person.code,
    expiresAt: person.expiresAt,
    usedAt: person.usedAt,
    attempts: 0,
    lockedUntil: 0,
  }
}

export function accessStatus(person: Assignment, now = Date.now()): string {
  if (person.revoked) return "Revoked"
  if (person.lockedUntil > now) return "Temporarily locked"
  if (person.usedAt !== null) return "Signed in"
  if (person.code) return "Code ready"
  if (person.invitedAt) return "Invited"
  return "Not invited"
}
