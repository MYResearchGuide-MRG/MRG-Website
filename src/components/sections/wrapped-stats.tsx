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
const EDU_MAX = Math.max(...wrappedEducation.map((s) => s.count))
const HEAR_MAX = Math.max(...wrappedHearAbout.map((s) => s.count))

/** Share of the eligible pool as a one-decimal percent string. */
function share(count: number): string {
  return `${((count / wrappedTotal) * 100).toFixed(1)}%`
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

function RankedRows({
  rows,
  max,
}: {
  rows: Array<{ label: string; count: number }>
  max: number
}) {
  return (
    <ul className="space-y-3.5">
      {rows.map(({ label, count }) => (
        <li key={label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {share(count)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <HBar pct={(count / max) * 100} className="bg-primary" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Pre-results snapshot of the applicant pool. Unnumbered like the Partners
 * band it sits beside — Projects keeps "01" so the numbered sequence below
 * is untouched.
 */
export function WrappedStats() {

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
            <RankedRows rows={wrappedEducation} max={EDU_MAX} />
          </Card>

          <Card icon={Megaphone} title="Heard about us via">
            <RankedRows rows={wrappedHearAbout} max={HEAR_MAX} />
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
