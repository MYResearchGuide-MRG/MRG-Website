/**
 * Frozen pre-results snapshot of the application pool, transcribed from the
 * single-sheet XLSX export (280 eligible rows). These numbers never move with
 * results — they describe who applied, not who was selected.
 */

export const wrappedTotal = 280

export const wrappedOlympiad = { yes: 73, no: 207 } as const

export type FirstChoiceStat = { code: string; count: number }

/** First-choice project codes, descending by count. */
export const wrappedFirstChoice: FirstChoiceStat[] = [
  { code: "B-1", count: 75 },
  { code: "P-1", count: 35 },
  { code: "M-1", count: 25 },
  { code: "B-2", count: 20 },
  { code: "A-4", count: 20 },
  { code: "C-1", count: 19 },
  { code: "I-1", count: 17 },
  { code: "A-2", count: 15 },
  { code: "A-1", count: 15 },
  { code: "I-2", count: 15 },
  { code: "A-3", count: 12 },
  { code: "A-5", count: 12 },
]

export type AgeBin = { age: number; count: number }

export const wrappedAge: AgeBin[] = [
  { age: 13, count: 2 },
  { age: 14, count: 13 },
  { age: 15, count: 25 },
  { age: 16, count: 53 },
  { age: 17, count: 43 },
  { age: 18, count: 100 },
  { age: 19, count: 39 },
  { age: 20, count: 5 },
]

export type RankedStat = { label: string; count: number }

/** Education levels, normalised from ~90 raw wordings, descending. */
export const wrappedEducation: RankedStat[] = [
  { label: "A-levels", count: 139 },
  { label: "IGCSE", count: 50 },
  { label: "Secondary", count: 26 },
  { label: "Foundation", count: 20 },
  { label: "Matriculation", count: 15 },
  { label: "STPM", count: 14 },
  { label: "Diploma", count: 8 },
  { label: "AP", count: 4 },
  { label: "IBDP", count: 3 },
  { label: "Not specified", count: 1 },
]

/** Where applicants heard about the programme, normalised from ~17 raw wordings. */
export const wrappedHearAbout: RankedStat[] = [
  { label: "Teachers / School", count: 143 },
  { label: "Friends / Family", count: 50 },
  { label: "Instagram", count: 47 },
  { label: "LinkedIn", count: 16 },
  { label: "Telegram", count: 10 },
  { label: "Other social", count: 7 },
  { label: "Search", count: 4 },
  { label: "Discord", count: 1 },
  { label: "Email", count: 1 },
  { label: "ChatGPT", count: 1 },
]
