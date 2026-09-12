import { useMotionValue, type MotionValue } from "motion/react"
import {
  BarChart3,
  GraduationCap,
  ListOrdered,
  Megaphone,
  type LucideIcon,
} from "lucide-react"

import { AgeHistogram } from "@/components/applicant-pool/charts/AgeHistogram"
import { DiscoveryBars } from "@/components/applicant-pool/charts/DiscoveryBars"
import { EducationDonut } from "@/components/applicant-pool/charts/EducationDonut"
import { ProjectBars } from "@/components/applicant-pool/charts/ProjectBars"
import { formatPercent } from "@/lib/applicant-pool/format"
import { poolStatistics } from "@/lib/applicant-pool/statistics"
import { cn } from "@/lib/utils"

/**
 * The hairline frame. The SVG has no viewBox, so its user units are screen
 * pixels: the stroke and the corner radius stay the same at any panel size,
 * and the outer half of the stroke is clipped by the SVG's own overflow,
 * leaving a crisp one-pixel line inside the panel.
 */
function PoolFrame() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full text-border"
    >
      <rect
        x={0}
        y={0}
        rx={16}
        width="100%"
        height="100%"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}

/** One dashboard region: the same density and hairline framing as the site's
 * own snapshot cards, sized for a quadrant rather than a column. */
function PoolPanel({
  icon: Icon,
  title,
  annotation,
  chartClassName,
  children,
}: {
  icon: LucideIcon
  title: string
  /** One sentence derived from the chart's own rows. */
  annotation: string
  chartClassName?: string
  children: React.ReactNode
}) {
  return (
    <article className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl bg-background p-4 lg:p-5">
      <PoolFrame />

      <div className="flex flex-none items-center gap-2.5">
        <Icon aria-hidden className="size-4 text-muted-foreground" />
        <h3 className="label-micro text-muted-foreground">{title}</h3>
      </div>

      <div className={cn("mt-3 min-h-0 flex-1", chartClassName)}>
        {children}
      </div>

      {/* The panel's reading, not a caption: at `text-muted-foreground` the
          sentences that interpret each chart sat at the same tone as the chrome
          around them and read as disabled. */}
      <p className="mt-3 flex-none text-xs leading-relaxed text-foreground/80">
        {annotation}
      </p>
    </article>
  )
}

/**
 * The four-panel dashboard: the four charts the announcement introduced, side
 * by side, each carrying the panel title the site's own snapshot uses.
 *
 * It is a synthesis, not a second construction — every chart was drawn in its
 * own scene, so `construct` is pinned complete and only the panels' own
 * content moves.
 *
 * Titles are left off the project ranking on purpose: the codes and shares are
 * the ranking, and the published titles would not fit a quadrant without
 * shrinking the numbers below reading size.
 */
function PoolDashboard({ complete }: { complete: MotionValue<number> }) {
  const { age, education, discovery, projects, topProject } = poolStatistics

  return (
    <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
      <PoolPanel
        icon={BarChart3}
        title="Age at application"
        annotation={`${age.modal.age} is the modal age, at ${formatPercent(age.modal.share)} of applicants.`}
        chartClassName="h-[24svh] min-h-[150px] flex-none"
      >
        <AgeHistogram
          bins={age.bins}
          construct={complete}
          className="h-full w-full"
        />
      </PoolPanel>

      <PoolPanel
        icon={ListOrdered}
        title="First-choice project"
        annotation={`${formatPercent(topProject.share)} of applicants chose ${topProject.code} first.`}
        chartClassName="flex-none [&_li]:break-inside-avoid [&_ul]:columns-2 [&_ul]:gap-x-6"
      >
        <ProjectBars projects={projects} construct={complete} />
      </PoolPanel>

      <PoolPanel
        icon={GraduationCap}
        title="Education level"
        annotation={`${education[0].label} is the modal level, at ${formatPercent(education[0].share)} of applicants.`}
        chartClassName="flex flex-col justify-center"
      >
        {/* The ring is square, so its width is its height: the wrapper is capped
            as a share of the panel so the legend beside it keeps enough room for
            a label like "Matriculation" to stay on one line. */}
        <EducationDonut
          slices={education}
          construct={complete}
          className="[&>div]:max-w-[min(160px,45%)]"
        />
      </PoolPanel>

      <PoolPanel
        icon={Megaphone}
        title="Heard about us via"
        annotation={`${discovery[0].label} is the top source, at ${formatPercent(discovery[0].share)} of applicants.`}
        chartClassName="flex flex-col justify-center"
      >
        <DiscoveryBars slices={discovery} construct={complete} />
      </PoolPanel>
    </div>
  )
}

/**
 * The overview's heading.
 *
 * It names the synthesis rather than repeating the page's opening title card:
 * the announcement above the register already told the story, and a reader who
 * meets that sentence again has been told nothing new. The lede says what this
 * frame is instead.
 *
 * The line break is part of the string so it cannot drift from the text around
 * it, and the heading renders it with `whitespace-pre-line`.
 */
const OVERVIEW_TITLE = "APPLICATION\nSTATS."

/**
 * The pool in one frame: the four charts the announcement built, published as
 * one snapshot beneath the register.
 *
 * The dashboard is at rest here — frames drawn, every chart complete. It used
 * to assemble under scroll on a tall viewport, and then to sit above the list
 * as its introduction; what it is now is the evidence for the register, read
 * after the names rather than instead of them.
 */
export function PoolOverview() {
  // One value, read-only across all four charts — none of them writes to it.
  const complete = useMotionValue(1)

  return (
    <section
      id="overview"
      className="container scroll-mt-24 border-t border-border pt-16 pb-24 md:pb-32"
      aria-label="Application stats"
    >
      <h2 className="display-lg whitespace-pre-line">{OVERVIEW_TITLE}</h2>

      <PoolDashboard complete={complete} />
    </section>
  )
}
