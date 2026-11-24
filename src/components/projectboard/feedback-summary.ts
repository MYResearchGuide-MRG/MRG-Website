import {
  judgingSections,
  maxTotalFor,
  scoreKeys,
  scoreKeysFor,
  validScore,
  type ScoreKey,
  type TeamReview,
} from "../judging/form"

// Preserve the server's random order, never sort by scores or judge identity.
export function groupFeedback(reviews: TeamReview[]) {
  return {
    main: reviews.filter((review) => review.kind === "main"),
    special: reviews.filter((review) => review.kind === "special"),
  }
}

/** Total over the criteria this review covers; research-only reviews skip the presentation. */
export function reviewTotal(review: TeamReview): number | null {
  const keys = scoreKeysFor(Boolean(review.researchOnly))
  return keys.every((key) => validScore(review[key]))
    ? keys.reduce((sum, key) => sum + review[key]!, 0)
    : null
}

/** 40, or 15 for a judge who reviewed the research only. */
export const reviewMax = (review: TeamReview) =>
  maxTotalFor(Boolean(review.researchOnly))

/**
 * Special awards must never enter the shared main-award average. Each
 * criterion is averaged over the judges who scored it, so a research-only
 * review counts towards research but not presentation, matching the
 * committee's results.
 */
export function mainAwardSummary(reviews: TeamReview[]) {
  const main = reviews.filter(
    (review) => review.kind === "main" && reviewTotal(review) !== null
  )
  if (!main.length) return null
  const criteria = Object.fromEntries(
    scoreKeys.map((key) => {
      const scores = main
        .map((review) => review[key])
        .filter((score): score is number => validScore(score))
      return [
        key,
        scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      ]
    })
  ) as Record<ScoreKey, number | null>
  const sum = (keys: ScoreKey[]) => {
    const values = keys
      .map((key) => criteria[key])
      .filter((value): value is number => value !== null)
    return values.length ? values.reduce((a, b) => a + b, 0) : null
  }
  const scored = scoreKeys.filter((key) => criteria[key] !== null)
  return {
    count: main.length,
    criteria,
    total: sum(scoreKeys)!,
    /** 40, or 15 when every main review is research only. */
    maxTotal: maxTotalFor(scored.length < scoreKeys.length),
    sections: judgingSections.map((section) =>
      sum(section.criteria.map((criterion) => criterion.key))
    ),
  }
}

export const feedbackScore = (value: number | null) =>
  value === null ? "—" : value.toFixed(1)

export function randomizeReviews(
  reviews: TeamReview[],
  random = Math.random
): TeamReview[] {
  const shuffled = [...reviews]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
