/**
 * Selected applicants for the 15 September 2026 announcement.
 *
 * PRIVACY: this table publishes code, name, school, and programme ONLY.
 * Never add email, age, or residence here.
 */
export type SelectedRow = {
  code: string
  name: string
  school: string
  programme: string
}

export const SELECTED: SelectedRow[] = [
  { code: "A-1", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
  { code: "A-1", name: "[redacted]", school: "[redacted]", programme: "JUEC (Junior 3), SPM (Form 3)" },
  { code: "A-1", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
  { code: "A-2", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
  { code: "A-2", name: "[redacted]", school: "[redacted]", programme: "A-Levels" },
  { code: "A-2", name: "[redacted]", school: "[redacted]", programme: "A-level" },
  { code: "A-3", name: "[redacted]", school: "[redacted]", programme: "Diploma" },
  { code: "A-3", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
  { code: "A-3", name: "[redacted]", school: "[redacted]", programme: "IGCSE(Y10)" },
  { code: "A-4", name: "[redacted]", school: "[redacted]", programme: "IGCSE (Y11)" },
  { code: "A-4", name: "[redacted]", school: "[redacted]", programme: "A levels" },
  { code: "A-4", name: "[redacted]", school: "[redacted]", programme: "CIMP" },
  { code: "A-5", name: "[redacted]", school: "[redacted]", programme: "A-Levels" },
  { code: "A-5", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
  { code: "A-5", name: "[redacted]", school: "[redacted]", programme: "A-Levels" },
  { code: "B-1", name: "[redacted]", school: "[redacted]", programme: "STPM SEM 3" },
  { code: "B-1", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
  { code: "B-1", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
  { code: "B-2", name: "[redacted]", school: "[redacted]", programme: "IGCSE (Y10)" },
  { code: "B-2", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
  { code: "B-2", name: "[redacted]", school: "[redacted]", programme: "A-Levels" },
  { code: "C-1", name: "[redacted]", school: "[redacted]", programme: "A-Level" },
  { code: "C-1", name: "[redacted]", school: "[redacted]", programme: "American (Texas) Highschool Diploma (Grade10)" },
  { code: "C-1", name: "[redacted]", school: "[redacted]", programme: "Australian Matriculation (AUSMAT)" },
  { code: "M-1", name: "[redacted]", school: "[redacted]", programme: "A-Levels" },
  { code: "M-1", name: "[redacted]", school: "[redacted]", programme: "Y11/IGCSE" },
  { code: "I-1", name: "[redacted]", school: "[redacted]", programme: "SPM (Form 4)" },
  { code: "I-1", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
  { code: "I-1", name: "[redacted]", school: "[redacted]", programme: "IGCSE Y10" },
  { code: "I-2", name: "[redacted]", school: "[redacted]", programme: "Alevels" },
  { code: "I-2", name: "[redacted]", school: "[redacted]", programme: "Y10" },
  { code: "P-1", name: "[redacted]", school: "[redacted]", programme: "Matriks" },
  { code: "P-1", name: "[redacted]", school: "[redacted]", programme: "IGCSE" },
  { code: "P-1", name: "[redacted]", school: "[redacted]", programme: "A-levels" },
]

export const selectedCount = SELECTED.length
