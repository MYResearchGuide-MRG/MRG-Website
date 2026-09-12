import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react"

import { formatPercent } from "@/lib/applicant-pool/format"
import type { AgeBinShare } from "@/lib/applicant-pool/types"

/**
 * Phase boundaries as fractions of this chart's own construction progress.
 * Growth finishes exactly where the emphasis beat starts, so no bar is ever
 * growing and receding at the same time.
 */
const GROW_START = 0.1
const GROW_END = 0.6
const EMPHASIS_PEAK = 0.78
const EMPHASIS_END = 0.92

/** Fraction of the stagger window one bar takes to reach full height. */
const GROW_SPAN = 0.18

/** Ink left on the bars the emphasis beat recedes. */
const RECEDED_OPACITY = 0.25

type AgeBarProps = {
  construct: MotionValue<number>
  age: number
  share: number
  /** Height against the tallest bin, as a percentage of the column track. */
  heightPct: number
  /** Growth window, already staggered by the parent. */
  start: number
  end: number
  emphasised: boolean
}

/**
 * One age column. It owns its own window on `construct`, so the stagger is a
 * pure function of scroll and the parent never re-renders while the page moves.
 */
function AgeBar({
  construct,
  age,
  share,
  heightPct,
  start,
  end,
  emphasised,
}: AgeBarProps) {
  const reduced = useReducedMotion()
  const grow = useTransform(construct, [start, end], ["0%", `${heightPct}%`])
  // Every bar recedes while the modal age is read, then returns. The emphasis
  // is a change of attention — the data underneath never changes.
  const recede = useTransform(
    construct,
    [GROW_END, EMPHASIS_PEAK, EMPHASIS_END],
    [1, RECEDED_OPACITY, 1],
  )

  // The emphasis beat recedes the bar as well as its label: a label-only dim
  // reads as a caption change, not as a change of attention.
  const barStyle = reduced
    ? { height: `${heightPct}%` }
    : emphasised
      ? { height: grow }
      : { height: grow, opacity: recede }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 self-stretch">
      <motion.span
        className="text-[11px] tabular-nums text-muted-foreground"
        style={reduced || emphasised ? undefined : { opacity: recede }}
      >
        {formatPercent(share)}
      </motion.span>
      <div className="flex w-full flex-1 items-end">
        <motion.div className="w-full rounded-t-md bg-foreground" style={barStyle} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {age}
      </span>
    </div>
  )
}

/**
 * The pool's age distribution, ascending left to right.
 *
 * The emphasised column is the one that does not recede: with `emphasisAge`
 * left to its default the largest bin is the modal age, so its bar and its
 * percentage are the pair still at full strength while the rest drop to a
 * quarter. That asymmetry is the announcement beat — the modal share does not
 * need to be printed twice to be the number the eye lands on.
 */
export function AgeHistogram({
  bins,
  construct,
  emphasisAge,
  className,
}: {
  bins: AgeBinShare[]
  construct: MotionValue<number>
  emphasisAge?: number
  className?: string
}) {
  if (bins.length === 0) return null

  const tallest = Math.max(...bins.map((bin) => bin.share))
  const modal = bins.reduce((best, bin) => (bin.count > best.count ? bin : best))
  const emphasis = emphasisAge ?? modal.age
  // The last bar has to finish at GROW_END, so the step is what is left of the
  // stagger window once one bar's own growth has been set aside.
  const step =
    bins.length > 1 ? (GROW_END - GROW_START - GROW_SPAN) / (bins.length - 1) : 0
  const summary = bins
    .map((bin) => `${bin.age}: ${bin.count}, ${formatPercent(bin.share)}`)
    .join("; ")

  return (
    <div className={className}>
      {/* The bars are a picture of the same figures, so they are hidden from
          assistive tech and the numbers are stated once as text. */}
      <p className="sr-only">
        Applicant ages, smallest to largest — {summary}. {modal.age} is the most
        common age, at {formatPercent(modal.share)} of the eligible pool.
      </p>
      <div aria-hidden className="flex h-full items-end gap-2">
        {bins.map((bin, i) => (
          <AgeBar
            key={bin.age}
            construct={construct}
            age={bin.age}
            share={bin.share}
            heightPct={(bin.share / tallest) * 100}
            start={GROW_START + i * step}
            end={GROW_START + i * step + GROW_SPAN}
            emphasised={bin.age === emphasis}
          />
        ))}
      </div>
    </div>
  )
}
