import { projectCodes, projects as catalogue } from "@/data/competition-data"
import {
  wrappedAge,
  wrappedEducation,
  wrappedFirstChoice,
  wrappedHearAbout,
  wrappedSecondChoice,
  wrappedThirdChoice,
  wrappedTotal,
  type ProjectChoiceStat,
} from "@/data/wrapped-stats"

import type {
  AgeBinShare,
  CategoryShare,
  PoolStatistics,
  PreferenceRound,
  ProjectShare,
} from "./types"

/**
 * The three preference rounds in the order applicants ranked them. Every
 * applicant named all three, so each round covers the whole pool on its own.
 */
const PREFERENCE_ROUNDS = [
  { round: 1, label: "1ST CHOICE", rows: wrappedFirstChoice },
  { round: 2, label: "2ND CHOICE", rows: wrappedSecondChoice },
  { round: 3, label: "3RD CHOICE", rows: wrappedThirdChoice },
] as const satisfies ReadonlyArray<{
  round: 1 | 2 | 3
  label: string
  rows: ProjectChoiceStat[]
}>

/**
 * Code -> published title, for codes the project catalogue actually contains.
 * A first-choice code with no project behind it resolves to null and renders
 * as the bare code rather than an invented title.
 */
const TITLE_BY_CODE: Record<string, string> = (() => {
  const codes = projectCodes(catalogue)
  const byCode: Record<string, string> = {}
  for (const project of catalogue) {
    const code = codes.get(project.id)
    if (code) byCode[code] = project.title
  }
  return byCode
})()

/** count / total, unrounded. Rendering rounds; the data never does. */
function share(count: number, total: number): number {
  return total === 0 ? 0 : count / total
}

/** Descending by count, ties keeping their source order (sort is stable). */
function byCountDesc<T extends { count: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.count - a.count)
}

/**
 * The five largest categories plus a sixth "Other" absorbing the rest.
 *
 * `Other` is derived from the pool total rather than from the tail so the six
 * shares always sum to 1 regardless of how the tail was normalised. A tail
 * that sums to zero yields five rows, not a 0.0% sixth slice.
 */
function topFivePlusOther(
  rows: Array<{ label: string; count: number }>,
  total: number
): CategoryShare[] {
  const top = byCountDesc(rows).slice(0, 5)
  const otherCount = total - top.reduce((sum, row) => sum + row.count, 0)
  const shares: CategoryShare[] = top.map(({ label, count }) => ({
    label,
    count,
    share: share(count, total),
  }))
  if (otherCount <= 0) return shares
  return [
    ...shares,
    { label: "Other", count: otherCount, share: share(otherCount, total) },
  ]
}

/** One round's codes as shares of the whole pool, descending. */
function projectShares(
  rows: ProjectChoiceStat[],
  total: number
): ProjectShare[] {
  return byCountDesc(rows).map(({ code, count }): ProjectShare => ({
    code,
    title: TITLE_BY_CODE[code] ?? null,
    count,
    share: share(count, total),
  }))
}

/**
 * A round's six slices: the five most-named codes plus an aggregated "Other".
 *
 * Six is the most a part-to-whole ring can carry with every value still legible
 * in its legend, so the tail is pooled rather than drawn as seven slivers. The
 * aggregate is derived from the pool total rather than from the tail, so the
 * slices always sum to the whole.
 */
function preferenceSlices(
  rows: ProjectChoiceStat[],
  total: number
): CategoryShare[] {
  const top = byCountDesc(rows).slice(0, 5)
  const shares: CategoryShare[] = top.map(({ code, count }) => ({
    label: code,
    count,
    share: share(count, total),
  }))
  const otherCount = total - top.reduce((sum, row) => sum + row.count, 0)
  if (otherCount <= 0) return shares
  return [
    ...shares,
    { label: "Other", count: otherCount, share: share(otherCount, total) },
  ]
}

/**
 * The frozen pool statistics. Counts are canonical; every percentage in the
 * announcement is computed from them here and nowhere else.
 */
export function buildPoolStatistics(): PoolStatistics {
  const eligibleCount = wrappedTotal
  const total = eligibleCount

  const bins: AgeBinShare[] = byCountDesc(wrappedAge)
    .map(({ age, count }): AgeBinShare => ({
      age,
      count,
      share: share(count, total),
    }))
    .sort((a, b) => a.age - b.age)
  const modal = bins.reduce(
    (best, bin) => (bin.count > best.count ? bin : best),
    bins[0]
  )

  const projects = projectShares(wrappedFirstChoice, total)

  const leastSelected = projects.reduce(
    (min, project) => (project.count < min.count ? project : min),
    projects[0]
  )

  return {
    eligibleCount,
    projectCount: projects.length,
    age: { bins, modal },
    education: topFivePlusOther(wrappedEducation, total),
    discovery: topFivePlusOther(wrappedHearAbout, total),
    projects,
    preferences: PREFERENCE_ROUNDS.map(
      ({ round, label, rows }): PreferenceRound => ({
        round,
        label,
        slices: preferenceSlices(rows, total),
      })
    ),
    topProject: projects[0],
    firstChoiceRatio:
      leastSelected.count === 0 ? 0 : projects[0].count / leastSelected.count,
  }
}

/** The single shared instance every scene and panel reads. */
export const poolStatistics = buildPoolStatistics()
