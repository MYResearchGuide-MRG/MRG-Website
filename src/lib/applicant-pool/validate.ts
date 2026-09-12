import { poolStatistics } from "./statistics"
import type { PoolStatistics } from "./types"

/** Percentages are rounded to one decimal at render, so shares may drift. */
const SHARE_EPSILON = 0.005

/**
 * Invariants the announcement depends on: every mutually exclusive, complete
 * category must account for the whole eligible pool, and the stored shares
 * must agree with the counts they were derived from.
 *
 * Returns an empty array when the statistics are sound. Intended to run in
 * development so a bad transcription fails loudly instead of moving beautifully.
 */
export function validatePoolStatistics(
  stats: PoolStatistics = poolStatistics,
): string[] {
  const problems: string[] = []
  const expected = stats.eligibleCount

  const sumCounts = (rows: Array<{ count: number }>) =>
    rows.reduce((total, row) => total + row.count, 0)

  const checkCounts = (name: string, rows: Array<{ count: number }>) => {
    const total = sumCounts(rows)
    if (total !== expected) {
      problems.push(`${name}: counts sum to ${total}, expected ${expected}`)
    }
  }

  const checkShares = (name: string, rows: Array<{ count: number; share: number }>) => {
    for (const row of rows) {
      const derived = expected === 0 ? 0 : row.count / expected
      if (Math.abs(derived - row.share) > Number.EPSILON) {
        problems.push(
          `${name}: share for "${"label" in row ? row.label : row}" is ${row.share}, but ${row.count}/${expected} is ${derived}`,
        )
      }
    }
    const shareTotal = rows.reduce((total, row) => total + row.share, 0)
    if (rows.length > 0 && Math.abs(shareTotal - 1) > SHARE_EPSILON) {
      problems.push(`${name}: shares sum to ${shareTotal.toFixed(4)}, expected 1`)
    }
  }

  checkCounts("age", stats.age.bins)
  checkShares("age", stats.age.bins)
  checkCounts("education", stats.education)
  checkShares("education", stats.education)
  checkCounts("discovery", stats.discovery)
  checkShares("discovery", stats.discovery)
  checkCounts("projects", stats.projects)
  checkShares("projects", stats.projects)

  const modal = stats.age.bins.reduce(
    (best, bin) => (bin.count > best.count ? bin : best),
    stats.age.bins[0],
  )
  if (modal.age !== stats.age.modal.age) {
    problems.push(`age: modal is ${stats.age.modal.age}, but the largest bin is ${modal.age}`)
  }

  const top = stats.projects.reduce(
    (best, project) => (project.count > best.count ? project : best),
    stats.projects[0],
  )
  if (top.code !== stats.topProject.code) {
    problems.push(
      `projects: topProject is ${stats.topProject.code}, but the largest is ${top.code}`,
    )
  }

  return problems
}

if (import.meta.env.DEV) {
  const problems = validatePoolStatistics()
  if (problems.length > 0) {
    console.error("Applicant pool statistics failed validation:\n" + problems.join("\n"))
  }
}
