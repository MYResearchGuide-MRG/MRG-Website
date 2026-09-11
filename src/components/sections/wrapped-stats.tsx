import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  BarChart3,
  GraduationCap,
  ListOrdered,
  Megaphone,
  type LucideIcon,
} from "lucide-react"

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { easeOutExpo, viewportOnce } from "@/components/motion/variants"
import { SectionHeading } from "./section-heading"
import { projectCodes, projects } from "@/data/competition-data"
import {
  wrappedAge,
  wrappedEducation,
  wrappedFirstChoice,
  wrappedHearAbout,
  wrappedTotal,
} from "@/data/wrapped-stats"
import { cn } from "@/lib/utils"

/**
 * Code -> project for first-choice labels. Project codes are derived from
 * `projects`, and the sheet lists 12 codes against 11 projects here — codes
 * with no project behind them render as the bare code, never an invented
 * title.
 */
const CODE_TO_PROJECT: Record<string, (typeof projects)[number]> = (() => {
  const codes = projectCodes(projects)
  const byCode: Record<string, (typeof projects)[number]> = {}
  for (const p of projects) {
    const code = codes.get(p.id)
    if (code) byCode[code] = p
  }
  return byCode
})()

const FIRST_CHOICE_MAX = Math.max(
  ...wrappedFirstChoice.map((s) => s.count),
)

/** Share of the eligible pool as a one-decimal percent string. */
function share(count: number): string {
  return `${((count / wrappedTotal) * 100).toFixed(1)}%`
}

/**
 * Single-hue slice ramp derived from `--primary`, descending by rank so the
 * biggest slice carries the most ink. `color-mix` keeps it monochrome with
 * the section and theme-safe in light and dark mode.
 */
const SLICE_STRENGTHS = [100, 70, 50, 35, 24, 15]

function sliceFill(rank: number): string {
  const strength = SLICE_STRENGTHS[Math.min(rank, SLICE_STRENGTHS.length - 1)]
  return `color-mix(in oklab, var(--color-primary) ${strength}%, transparent)`
}

type Slice = { label: string; count: number }

/**
 * Top 5 entries plus a 6th "Other" slice aggregating the rest. `Other` is
 * derived as `wrappedTotal - top5` so the six slices always sum to 100% of
 * the eligible pool and the legend math matches the chart exactly.
 */
function topFivePlusOther(rows: Array<{ label: string; count: number }>): Slice[] {
  const top = rows.slice(0, 5).map(({ label, count }) => ({ label, count }))
  const topSum = top.reduce((sum, s) => sum + s.count, 0)
  return [...top, { label: "Other", count: wrappedTotal - topSum }]
}
/**
 * Arc lengths and start offsets along a circle of `size` for each slice.
 * Module-level and pure — keeps render bodies free of reassignments.
 */
function arcs(
  rows: Slice[],
  size: number,
): Array<{ len: number; offset: number; i: number }> {
  const out: Array<{ len: number; offset: number; i: number }> = []
  let acc = 0
  for (let i = 0; i < rows.length; i++) {
    const len = (rows[i].count / wrappedTotal) * size
    out.push({ len, offset: acc, i })
    acc += len
  }
  return out
}

/** Horizontal bar that grows from the left; static width on reduced motion. */
function HBar({ pct, className }: { pct: number; className?: string }) {
  const reduced = useReducedMotion()
  const width = `${pct}%`
  if (reduced) {
    return (
      <div
        aria-hidden
        className={cn("h-full shrink-0 rounded-full", className)}
        style={{ width }}
      />
    )
  }
  return (
    <motion.div
      aria-hidden
      className={cn("h-full shrink-0 rounded-full", className)}
      initial={{ width: 0 }}
      whileInView={{ width }}
      viewport={viewportOnce}
      transition={{ duration: 0.9, ease: easeOutExpo }}
    />
  )
}

/** Vertical histogram bar that grows from the baseline. */
function VBar({ pct, className }: { pct: number; className?: string }) {
  const reduced = useReducedMotion()
  const height = `${pct}%`
  if (reduced) {
    return (
      <div
        aria-hidden
        className={cn("w-full shrink-0 rounded-t-md", className)}
        style={{ height }}
      />
    )
  }
  return (
    <motion.div
      aria-hidden
      className={cn("w-full shrink-0 rounded-t-md", className)}
      initial={{ height: 0 }}
      whileInView={{ height }}
      viewport={viewportOnce}
      transition={{ duration: 0.9, ease: easeOutExpo }}
    />
  )
}

function Card({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <RevealItem
      as="article"
      className={cn(
        "flex flex-col rounded-2xl border border-border p-6 md:p-7",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon aria-hidden className="size-4 text-muted-foreground" />
        <h3 className="label-micro text-muted-foreground">{title}</h3>
      </div>
      <div className="mt-6 flex flex-1 flex-col">{children}</div>
    </RevealItem>
  )
}

/** Swatch + label + share legend; every slice value exists here as text. */
function SliceLegend({ rows }: { rows: Slice[] }) {
  return (
    <ul className="w-full min-w-0 flex-1 space-y-2.5">
      {rows.map(({ label, count }, i) => (
        <li key={label} className="flex items-start gap-2.5 text-sm">
          <span
            aria-hidden
            className="mt-1 size-2.5 shrink-0 rounded-full border border-border"
            style={{ background: sliceFill(i) }}
          />
          <span className="min-w-0 flex-1 break-words">{label}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {share(count)}
          </span>
        </li>
      ))}
    </ul>
  )
}

const DONUT_R = 62
const DONUT_C = 2 * Math.PI * DONUT_R
const DONUT_GAP = 2

/** Donut of the top 5 education levels + aggregated "Other". */
function DonutChart({ rows }: { rows: Slice[] }) {
  const reduced = useReducedMotion()
  const segments = arcs(rows, DONUT_C)
  return (
    <div className="relative mx-auto w-full max-w-[200px] shrink-0">
      <svg viewBox="0 0 180 180" role="img" className="block w-full">
        <title>Education level share of the applicant pool</title>
        <circle
          cx={90}
          cy={90}
          r={DONUT_R}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={30}
        />
        {segments.map(({ len, offset, i }) =>
          reduced ? (
            <circle
              key={rows[i].label}
              cx={90}
              cy={90}
              r={DONUT_R}
              fill="none"
              stroke={sliceFill(i)}
              strokeWidth={30}
              strokeDasharray={`${Math.max(len - DONUT_GAP, 0.5)} ${DONUT_C - Math.max(len - DONUT_GAP, 0.5)}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
            />
          ) : (
            <motion.circle
              key={rows[i].label}
              cx={90}
              cy={90}
              r={DONUT_R}
              fill="none"
              stroke={sliceFill(i)}
              strokeWidth={30}
              strokeDasharray={`${Math.max(len - DONUT_GAP, 0.5)} ${DONUT_C - Math.max(len - DONUT_GAP, 0.5)}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewportOnce}
              transition={{
                duration: 0.6,
                delay: i * 0.08,
                ease: easeOutExpo,
              }}
            />
          ),
        )}
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center"
      >
        <span className="text-xl font-semibold tabular-nums">
          {share(rows[0].count)}
        </span>
        <span className="mt-0.5 max-w-full break-words text-xs text-muted-foreground">
          {rows[0].label}
        </span>
      </div>
    </div>
  )
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** Pie of the top 5 discovery sources + aggregated "Other". */
function PieChart({ rows }: { rows: Slice[] }) {
  const reduced = useReducedMotion()
  const cx = 100
  const cy = 100
  const r = 84
  const offsetDist = 7
  const wedges = arcs(rows, 360).map(({ len, offset: start }, i) => {
    const end = start + len
    const largeArc = end - start > 180 ? 1 : 0
    const p1 = polar(cx, cy, r, start)
    const p2 = polar(cx, cy, r, end)
    const mid = (start + end) / 2
    const midRad = ((mid - 90) * Math.PI) / 180
    // Largest slice nudged outward for emphasis.
    const dx = i === 0 ? Math.cos(midRad) * offsetDist : 0
    const dy = i === 0 ? Math.sin(midRad) * offsetDist : 0
    return { start, end, largeArc, p1, p2, dx, dy, i }
  })
  return (
    <div className="mx-auto w-full max-w-[210px] shrink-0">
      <svg viewBox="0 0 200 200" role="img" className="block w-full">
        <title>Where applicants heard about the programme</title>
        {wedges.map(({ largeArc, p1, p2, dx, dy, i }) => {
          const d = [
            `M ${cx} ${cy}`,
            `L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
            `A ${r} ${r} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
            "Z",
          ].join(" ")
          const shared = {
            d,
            fill: sliceFill(i),
            stroke: "var(--color-background)",
            strokeWidth: 2,
            strokeLinejoin: "round" as const,
            transform: `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`,
          }
          return reduced ? (
            <path key={rows[i].label} {...shared} />
          ) : (
            <motion.path
              key={rows[i].label}
              {...shared}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewportOnce}
              transition={{
                duration: 0.6,
                delay: i * 0.08,
                ease: easeOutExpo,
              }}
            />
          )
        })}
      </svg>
    </div>
  )
}

/**
 * Pre-results snapshot of the applicant pool. Unnumbered like the Partners
 * band it sits beside — Projects keeps "01" so the numbered sequence below
 * is untouched.
 */
export function WrappedStats() {
  const educationSlices = topFivePlusOther(wrappedEducation)
  const hearAboutSlices = topFivePlusOther(wrappedHearAbout)

  return (
    <section
      id="wrapped"
      className="scroll-mt-24 border-t border-border py-24 md:py-32"
    >
      <div className="container">
        <SectionHeading
          kicker="Applications wrapped"
          title="The pool, before results"
          lede="Applications are closed and results are still in review — here is the pool they came from, frozen before decisions."
        />

        <RevealGroup className="mt-16 grid gap-4 md:grid-cols-2">
          <Card icon={BarChart3} title="Age at application">
            <div className="flex flex-1 items-end gap-2">
              {wrappedAge.map(({ age, count }) => (
                <div
                  key={age}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2 self-stretch"
                >
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {share(count)}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <VBar pct={count} className="bg-primary" />
                  </div>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {age}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Eighteen is the modal age, at {share(100)} of applicants.
            </p>
          </Card>

          <Card icon={ListOrdered} title="First-choice project">
            <ul className="space-y-3.5">
              {wrappedFirstChoice.map(({ code, count }) => {
                const project = CODE_TO_PROJECT[code]
                return (
                  <li key={code}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <p className="min-w-0 truncate">
                        <span className="font-semibold tabular-nums">
                          {code}
                        </span>
                        {project && (
                          <span className="ml-2 text-muted-foreground">
                            {project.title}
                          </span>
                        )}
                      </p>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {share(count)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <HBar
                        pct={(count / FIRST_CHOICE_MAX) * 100}
                        className="bg-primary"
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card icon={GraduationCap} title="Education level">
            <div className="flex flex-1 flex-col items-center gap-6 min-[480px]:flex-row">
              <DonutChart rows={educationSlices} />
              <SliceLegend rows={educationSlices} />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {educationSlices[0].label} is the modal level, at{" "}
              {share(educationSlices[0].count)} of applicants.
            </p>
          </Card>

          <Card icon={Megaphone} title="Heard about us via">
            <div className="flex flex-1 flex-col items-center gap-6 min-[480px]:flex-row">
              <PieChart rows={hearAboutSlices} />
              <SliceLegend rows={hearAboutSlices} />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {hearAboutSlices[0].label} is the top source, at{" "}
              {share(hearAboutSlices[0].count)} of applicants.
            </p>
          </Card>
        </RevealGroup>

        <Reveal className="mt-10">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Values are shares of the eligible applicant pool. Education and
            source labels were normalised from roughly 90 and 17 raw wordings.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
