import {
  judgingSections,
  scoreKeys,
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

export function reviewTotal(review: TeamReview): number | null {
  return scoreKeys.every((key) => validScore(review[key]))
    ? scoreKeys.reduce((sum, key) => sum + review[key], 0)
    : null
}

/** Special awards must never enter the shared main-award average. */
export function mainAwardSummary(reviews: TeamReview[]) {
  const main = reviews.filter(
    (review) => review.kind === "main" && reviewTotal(review) !== null
  )
  if (!main.length) return null
  const criteria = Object.fromEntries(
    scoreKeys.map((key) => [
      key,
      main.reduce((sum, review) => sum + review[key], 0) / main.length,
    ])
  ) as Record<ScoreKey, number>
  return {
    count: main.length,
    criteria,
    total: scoreKeys.reduce((sum, key) => sum + criteria[key], 0),
    sections: judgingSections.map((section) =>
      section.criteria.reduce(
        (sum, criterion) => sum + criteria[criterion.key],
        0
      )
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
