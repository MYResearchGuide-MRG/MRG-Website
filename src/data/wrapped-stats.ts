/**
 * Frozen pre-results snapshot of the application pool, transcribed from the
 * single-sheet XLSX export (280 eligible rows). These numbers never move with
 * results — they describe who applied, not who was selected.
 */

export const wrappedTotal = 280

export type ProjectChoiceStat = { code: string; count: number }

/** First-choice project codes, descending by count. */
export const wrappedFirstChoice: ProjectChoiceStat[] = [
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

/**
 * Second- and third-choice codes, from the same two preference columns as the
 * first-choice list above.
 *
 * Every applicant named three projects, so each round covers the whole pool on
 * its own — all three sum to `wrappedTotal`. The rounds rank differently, which
 * is the point of publishing them side by side: the most-named first choice is
 * not the most-named second.
 */
export const wrappedSecondChoice: ProjectChoiceStat[] = [
  { code: "B-2", count: 54 },
  { code: "B-1", count: 36 },
  { code: "P-1", count: 33 },
  { code: "A-3", count: 28 },
  { code: "A-2", count: 28 },
  { code: "M-1", count: 19 },
  { code: "C-1", count: 19 },
  { code: "I-1", count: 15 },
  { code: "A-1", count: 14 },
  { code: "I-2", count: 14 },
  { code: "A-4", count: 13 },
  { code: "A-5", count: 7 },
]

export const wrappedThirdChoice: ProjectChoiceStat[] = [
  { code: "C-1", count: 46 },
  { code: "P-1", count: 34 },
  { code: "I-1", count: 33 },
  { code: "B-1", count: 29 },
  { code: "A-3", count: 24 },
  { code: "M-1", count: 23 },
  { code: "A-1", count: 22 },
  { code: "B-2", count: 22 },
  { code: "A-2", count: 19 },
  { code: "A-4", count: 18 },
  { code: "I-2", count: 6 },
  { code: "A-5", count: 4 },
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
  { label: "A-Levels", count: 139 },
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
