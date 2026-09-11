/**
 * Selected applicants for the 15 September 2026 announcement.
 *
 * Rows land here on reveal day — pasted from the committee sheet, trimmed,
 * original casing. Until then the table stays empty and the page shows
 * only the countdown.
 *
 * PRIVACY: code, name, school, and programme ONLY.
 * Never email, age, or residence here.
 */
export type SelectedRow = {
  code: string
  name: string
  school: string
  programme: string
}

export const SELECTED: SelectedRow[] = []

export const selectedCount = SELECTED.length
