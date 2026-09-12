import * as React from "react"
import {
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react"

import { formatPercent } from "@/lib/applicant-pool/format"
import type { CategoryShare } from "@/lib/applicant-pool/types"
import { cn } from "@/lib/utils"

const SIZE = 180
const CENTRE = SIZE / 2
const RADIUS = 62
const THICKNESS = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Breathing room between segments, in path units. */
const GAP = 2

/** The sweep ends here; the tail of the scene holds the finished ring. */
const SWEEP_END = 0.8

/**
 * Single-hue ramp by rank — the largest slice carries the most ink. Mirrors the
 * retired `wrapped-stats` ramp, on `--color-foreground` so it stays monochrome
 * with the rest of the announcement in both themes.
 */
const SLICE_STRENGTHS = [100, 70, 50, 35, 24, 15]

function sliceFill(rank: number): string {
  const strength = SLICE_STRENGTHS[Math.min(rank, SLICE_STRENGTHS.length - 1)]
  return `color-mix(in oklab, var(--color-foreground) ${strength}%, transparent)`
}

/**
 * Distance along the ring where each slice starts, in path units. Cumulative
 * and pure, so the render body stays free of reassignment.
 */
function segmentOffsets(slices: CategoryShare[]): number[] {
  const offsets: number[] = []
  let acc = 0
  for (const slice of slices) {
    offsets.push(acc)
    acc += slice.share * CIRCUMFERENCE
  }
  return offsets
}

type SliceArcProps = {
  construct: MotionValue<number>
  share: number
  /** Start of this slice along the ring, in path units. */
  offset: number
  rank: number
  /** Sweep window, already sequenced by the parent. */
  start: number
  end: number
}

/**
 * One segment, drawn by growing its dash length from zero. Growing the dash
 * instead of rebuilding a path keeps the whole sweep on `strokeDasharray` —
 * one interpolated attribute per frame, nothing recomputed in React.
 */
function SliceArc({
  construct,
  share,
  offset,
  rank,
  start,
  end,
}: SliceArcProps) {
  const reduced = useReducedMotion()
  const length = Math.max(share * CIRCUMFERENCE - GAP, 0.5)
  const dash = useTransform(
    construct,
    [start, end],
    [`0 ${CIRCUMFERENCE}`, `${length} ${CIRCUMFERENCE - length}`]
  )

  return (
    <motion.circle
      cx={CENTRE}
      cy={CENTRE}
      r={RADIUS}
      fill="none"
      stroke={sliceFill(rank)}
      strokeWidth={THICKNESS}
      strokeDashoffset={-offset}
      strokeDasharray={reduced ? `${length} ${CIRCUMFERENCE - length}` : dash}
      // An SVG dash travels clockwise from three o'clock; the ring starts at
      // the top instead, which is where a reader expects a share to begin.
      transform={`rotate(-90 ${CENTRE} ${CENTRE})`}
    />
  )
}

/**
 * A part-to-whole ring, swept from the top, with a legend beside it.
 *
 * The legend is not decoration: it is the only place every slice value exists
 * as text, so the ring is never the sole source of a number. `slices` is
 * already rounded to at most six rows by the statistics layer — the most a ring
 * can carry with every value still legible here.
 */
export function CategoryDonut({
  slices,
  construct,
  /** The ring's accessible name, e.g. "Education level". */
  title,
  /** Opens the screen-reader summary, e.g. "Education levels of the pool". */
  summaryLabel,
  direction = "row",
  className,
  legendRowClassName,
}: {
  slices: CategoryShare[]
  construct: MotionValue<number>
  title: string
  summaryLabel: string
  /** "row" puts the legend beside the ring; "stack" puts it underneath. */
  direction?: "row" | "stack"
  className?: string
  /** Per-row classes for the legend, for the denser three-up comparison. */
  legendRowClassName?: string
}) {
  const describedBy = React.useId()
  if (slices.length === 0) return null

  const offsets = segmentOffsets(slices)
  // Sequential by construction: the arcs queue end-to-start across the sweep
  // rather than racing, because a share only means something next to its whole.
  const leg = SWEEP_END / slices.length
  const summary = slices
    .map(
      (slice) => `${slice.label}: ${slice.count}, ${formatPercent(slice.share)}`
    )
    .join("; ")

  return (
    <div
      className={cn(
        "flex flex-col items-center",
        direction === "row" ? "gap-6 min-[480px]:flex-row" : "gap-5",
        className
      )}
    >
      <div className="relative mx-auto w-full max-w-[200px] shrink-0">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-describedby={describedBy}
          className="block w-full"
        >
          <title>{`${title} share of the eligible applicant pool`}</title>
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r={RADIUS}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={THICKNESS}
          />
          {slices.map((slice, i) => (
            <SliceArc
              key={slice.label}
              construct={construct}
              share={slice.share}
              offset={offsets[i]}
              rank={i}
              start={i * leg}
              end={(i + 1) * leg}
            />
          ))}
        </svg>
      </div>

      {/* The ring is a picture of these figures, so it points here rather than
          making a screen reader walk two circles of the same data. */}
      <p id={describedBy} className="sr-only">
        {summaryLabel}, largest first — {summary}.
      </p>

      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {slices.map((slice, i) => (
          <li
            key={slice.label}
            className={cn(
              "flex items-start gap-2.5 text-sm",
              legendRowClassName
            )}
          >
            <span
              aria-hidden
              className="mt-1 size-2.5 shrink-0 rounded-full border border-border"
              style={{ background: sliceFill(i) }}
            />
            <span className="min-w-0 flex-1 break-words">{slice.label}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {formatPercent(slice.share)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
