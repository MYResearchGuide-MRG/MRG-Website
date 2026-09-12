import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react"

import { formatPercent } from "@/lib/applicant-pool/format"
import type { CategoryShare } from "@/lib/applicant-pool/types"

/** Phase boundaries as fractions of this chart's own construction progress. */
const GROW_END = 0.85
const SETTLE_END = 1

/** Fraction of the stagger window one bar takes to reach full width. */
const GROW_SPAN = 0.3

/** Ink left on the rows below the leading source once the bars have settled. */
const SETTLED_OPACITY = 0.7

type SourceRowProps = {
  construct: MotionValue<number>
  label: string
  share: number
  /** Width against the largest source, as a percentage of the track. */
  widthPct: number
  /** Growth window, already staggered by the parent. */
  start: number
  end: number
  lead: boolean
}

/**
 * One ranked source. Both text cells share a single opacity value, so the row
 * settles as one thing rather than as a label and a number drifting apart.
 */
function SourceRow({
  construct,
  label,
  share,
  widthPct,
  start,
  end,
  lead,
}: SourceRowProps) {
  const reduced = useReducedMotion()
  const grow = useTransform(construct, [start, end], ["0%", `${widthPct}%`])
  // Only the leading source keeps full ink once the bars have settled; the rest
  // step back, which is what makes the ranking readable without a second cue.
  const settled = useTransform(
    construct,
    [GROW_END, SETTLE_END],
    [1, SETTLED_OPACITY],
  )
  const textStyle = lead
    ? undefined
    : reduced
      ? { opacity: SETTLED_OPACITY }
      : { opacity: settled }

  return (
    <li className="flex items-center gap-3">
      {/* Both text cells carry the settle as well as the label: they are one
          row, so they step back together rather than drifting apart. */}
      <motion.span
        className="label-micro w-32 shrink-0 truncate text-foreground sm:w-40"
        style={textStyle}
      >
        {label}
      </motion.span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-foreground"
          style={reduced ? { width: `${widthPct}%` } : { width: grow }}
        />
      </div>
      <motion.span
        className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground"
        style={textStyle}
      >
        {formatPercent(share)}
      </motion.span>
    </li>
  )
}

/**
 * Where the pool heard about the programme, ranked.
 *
 * Width is normalised against the leading source rather than against the pool,
 * so the top row fills the track and the drop to second place is the thing the
 * ranking is actually about.
 */
export function DiscoveryBars({
  slices,
  construct,
  className,
}: {
  slices: CategoryShare[]
  construct: MotionValue<number>
  className?: string
}) {
  if (slices.length === 0) return null

  const largest = Math.max(...slices.map((slice) => slice.share))
  // The last bar has to finish at GROW_END, so the step is what is left of the
  // stagger window once one bar's own growth has been set aside.
  const step =
    slices.length > 1 ? (GROW_END - GROW_SPAN) / (slices.length - 1) : 0
  const summary = slices
    .map((slice) => `${slice.label}: ${slice.count}, ${formatPercent(slice.share)}`)
    .join("; ")

  return (
    <div className={className}>
      {/* The bars are a picture of the same figures, so they are hidden from
          assistive tech and the numbers are stated once as text. */}
      <p className="sr-only">
        Discovery sources of the eligible pool, largest first — {summary}.
      </p>
      <ul aria-hidden className="space-y-3">
        {slices.map((slice, i) => (
          <SourceRow
            key={slice.label}
            construct={construct}
            label={slice.label}
            share={slice.share}
            widthPct={(slice.share / largest) * 100}
            start={i * step}
            end={i * step + GROW_SPAN}
            lead={i === 0}
          />
        ))}
      </ul>
    </div>
  )
}
