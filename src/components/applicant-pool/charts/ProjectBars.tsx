import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react"

import { formatPercent } from "@/lib/applicant-pool/format"
import type { ProjectShare } from "@/lib/applicant-pool/types"

/**
 * Phase boundaries as fractions of this chart's own construction progress.
 * Titles start exactly where the bars finish, so the two beats never overlap.
 */
const GROW_END = 0.8
const TITLE_END = 1

/** Fraction of the stagger window one bar takes to reach full width. */
const GROW_SPAN = 0.24

type ProjectRowProps = {
  construct: MotionValue<number>
  code: string
  title: string | null
  share: number
  /** Width against the largest count, as a percentage of the track. */
  widthPct: number
  /** Growth window, already staggered by the parent. */
  start: number
  end: number
  showTitles: boolean
}

/**
 * One ranked project. The code and percentage are never touched by the title
 * beat — a title is a hint about the bar beside it, not a second headline.
 */
function ProjectRow({
  construct,
  code,
  title,
  share,
  widthPct,
  start,
  end,
  showTitles,
}: ProjectRowProps) {
  const reduced = useReducedMotion()
  const grow = useTransform(construct, [start, end], ["0%", `${widthPct}%`])
  const titleOpacity = useTransform(construct, [GROW_END, TITLE_END], [0, 1])

  return (
    <li className="space-y-1.5">
      <div className="flex items-center gap-3">
        <span className="w-10 shrink-0 font-semibold tabular-nums">
          {code}
        </span>
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-foreground"
            style={reduced ? { width: `${widthPct}%` } : { width: grow }}
          />
        </div>
        <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
          {formatPercent(share)}
        </span>
      </div>
      {showTitles && title !== null && (
        // Long-form published titles get their own line: inline they would
        // truncate to nothing, and truncating a title is worse than hiding it.
        // They are held back below `md` for the same reason the synthesis panel
        // omits them: twelve titled rows need roughly 1300px, which is more than
        // a phone's frame has, and the ranking itself is the payload.
        <motion.p
          className="hidden text-sm leading-snug text-muted-foreground md:block"
          style={reduced ? { opacity: 1 } : { opacity: titleOpacity }}
        >
          {title}
        </motion.p>
      )}
    </li>
  )
}

/**
 * First-choice demand across every project, ranked.
 *
 * Width is normalised against the largest count rather than against the pool,
 * so the leading project fills the track and the ranking is the thing read
 * from the shape.
 */
export function ProjectBars({
  projects,
  construct,
  showTitles,
  className,
}: {
  projects: ProjectShare[]
  construct: MotionValue<number>
  showTitles?: boolean
  className?: string
}) {
  if (projects.length === 0) return null

  const largest = Math.max(...projects.map((project) => project.count))
  // The last bar has to finish at GROW_END, so the step is what is left of the
  // stagger window once one bar's own growth has been set aside.
  const step =
    projects.length > 1 ? (GROW_END - GROW_SPAN) / (projects.length - 1) : 0
  const summary = projects
    .map(
      (project) =>
        `${project.code}: ${project.count}, ${formatPercent(project.share)}`,
    )
    .join("; ")

  return (
    <div className={className}>
      {/* The bars are a picture of the same figures, so they are hidden from
          assistive tech and the numbers are stated once as text. */}
      <p className="sr-only">
        First-choice projects of the eligible pool, largest first — {summary}.
      </p>
      <ul aria-hidden className="space-y-3.5">
        {projects.map((project, i) => (
          <ProjectRow
            key={project.code}
            construct={construct}
            code={project.code}
            title={project.title}
            share={project.share}
            widthPct={(project.count / largest) * 100}
            start={i * step}
            end={i * step + GROW_SPAN}
            showTitles={showTitles ?? false}
          />
        ))}
      </ul>
    </div>
  )
}
