/**
 * Shapes for the applicant-pool announcement.
 *
 * Every cinematic scene and every panel of the synthesised dashboard reads the
 * same `PoolStatistics` object, so the scroll narrative and the final overview
 * cannot disagree about a number.
 */

/** A normalised category with its count and its fraction of the pool (0–1). */
export type CategoryShare = {
  label: string
  count: number
  /** count / eligibleCount. Rounded only when rendered — never stored. */
  share: number
}

/** One age bucket. */
export type AgeBinShare = {
  age: number
  count: number
  share: number
}

/** One first-choice project, with its published title when the code resolves. */
export type ProjectShare = {
  code: string
  /** Null when the code has no project behind it. Never invent a title. */
  title: string | null
  count: number
  share: number
}

/**
 * One of the three preferences every applicant named, as a distribution over
 * project codes. `round` is 1, 2 or 3 — the applicant's own ranking — and is
 * never derived from how many people named a project.
 */
export type PreferenceRound = {
  round: 1 | 2 | 3
  /** The round's own heading, e.g. "1ST CHOICE". */
  label: string
  /**
   * Six rows: the five most-named codes plus an aggregated "Other". Labelled by
   * code — the pies name a distribution, and a legend of six published titles
   * would not fit beside each ring.
   */
  slices: CategoryShare[]
}

export type PoolStatistics = {
  eligibleCount: number
  projectCount: number
  age: {
    /** Ascending by age. */
    bins: AgeBinShare[]
    /** The single most-picked age. */
    modal: AgeBinShare
  }
  /** Six rows: the five largest levels plus an aggregated "Other". Descending. */
  education: CategoryShare[]
  /** Six rows: the five largest sources plus an aggregated "Other". Descending. */
  discovery: CategoryShare[]
  /** All twelve projects, descending by first-choice count. */
  projects: ProjectShare[]
  /** The most-selected first choice. */
  topProject: ProjectShare
  /**
   * The three preference rounds, in order. Each round is a complete partition
   * of the pool — all 280 applicants named three projects — so the rounds are
   * comparable with each other and `projects` is round one.
   */
  preferences: PreferenceRound[]
  /** topProject.count / least-selected count. A ratio of counts, not shares. */
  firstChoiceRatio: number
}
