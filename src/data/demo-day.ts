import { mainAwardJudges, specialAwardJudges, type Judge } from "./judges"

export type DemoDayEdition = {
  year: number
  mainAwardJudges: Judge[]
  specialAwardJudges: Judge[]
  awardsNotice: string
}

// Add each published cohort here. Its year tab and links appear automatically.
// Keep historical panels in their own edition instead of replacing them.
export const demoDayEditions: DemoDayEdition[] = [
  {
    year: 2026,
    mainAwardJudges,
    specialAwardJudges,
    awardsNotice:
      "Award winners will be announced after Demo Day. Check back soon.",
  },
]

export const demoDayYears = demoDayEditions
  .map(({ year }) => year)
  .sort((a, b) => b - a)
export const latestDemoDayYear = demoDayYears[0]

export function getDemoDayEdition(year: number) {
  return demoDayEditions.find((edition) => edition.year === year)
}
