import * as React from "react"

import { RevealGroup, RevealItem } from "@/components/motion/reveal"
import { SectionHeading } from "./section-heading"
import { TrailBackdrop } from "./backdrops/trail-backdrop"
import { timeline } from "@/data/competition-data"
import { cn } from "@/lib/utils"

type Status = "complete" | "active" | "upcoming"

/**
 * Status is derived rather than authored. The page sits live across every one
 * of these milestones, and a hand-set "active" marker goes stale the moment a
 * date passes. Dates compare as ISO strings, which sort chronologically.
 */
function statusOf(
  range: { start: string; end: string },
  today: string
): Status {
  if (range.end < today) return "complete"
  if (range.start <= today) return "active"
  return "upcoming"
}

/**
 * Local date, not UTC: the schedule is Malaysian and a UTC midnight would flip
 * a milestone eight hours early for everyone reading it here.
 */
function useToday() {
  return React.useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [])
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/** "2026-09-25" → "25 Sep". */
function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

/**
 * Compact range: "20 Nov", "20–25 Sep", "25 Sep – 20 Nov". `tight` drops the
 * spaces around the dash, for the narrow date column in the milestone lists.
 */
function shortRange(start: string, end: string, tight = false) {
  if (start === end) return shortDate(start)
  const [, m1, d1] = start.split("-").map(Number)
  const [, m2, d2] = end.split("-").map(Number)
  if (m1 === m2) return `${d1}–${d2} ${MONTHS[m1 - 1]}`
  return `${shortDate(start)}${tight ? "–" : " – "}${shortDate(end)}`
}

const DATE_TONE: Record<Status, string> = {
  complete: "text-muted-foreground",
  active: "text-foreground",
  upcoming: "text-foreground/80",
}

const TITLE_TONE: Record<Status, string> = {
  complete: "text-muted-foreground",
  active: "text-foreground",
  upcoming: "text-muted-foreground",
}

/** The milestone underway gets an atom rather than a dot, turning slowly. */
function Atom({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        "rounded-full bg-card text-foreground motion-safe:animate-[spin_14s_linear_infinite]",
        className
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <ellipse cx="12" cy="12" rx="4.2" ry="10" />
      <ellipse cx="12" cy="12" rx="4.2" ry="10" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="4.2" ry="10" transform="rotate(-60 12 12)" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * Done milestones are solid, upcoming ones hollow, and the one underway is
 * the atom. Centred on its anchor, which sits on the track.
 */
function Dot({ status, className }: { status: Status; className?: string }) {
  if (status === "active") return <Atom className={cn("size-6", className)} />
  return (
    <span
      aria-hidden
      className={cn(
        "block size-2.5 rounded-full",
        status === "complete"
          ? "bg-foreground"
          : "border-[1.5px] border-muted-foreground bg-card",
        className
      )}
    />
  )
}

type Flag = {
  item: (typeof timeline)[number]
  status: Status
}

/** One milestone: date, then title. */
function FlagLabel({ flag }: { flag: Flag }) {
  return (
    <>
      <p
        className={cn(
          "font-mono text-base font-semibold whitespace-nowrap",
          DATE_TONE[flag.status]
        )}
      >
        {shortRange(flag.item.start, flag.item.end, true)}
      </p>
      <p className={cn("mt-1 text-sm leading-snug", TITLE_TONE[flag.status])}>
        {flag.item.title}
      </p>
    </>
  )
}

/** A row of evenly spaced flags, each with its dot sitting on the track below. */
function FlagRow({ flags, cols }: { flags: Flag[]; cols: number }) {
  return (
    <ol
      className="relative z-10 grid gap-x-6 px-8"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {flags.map((flag) => (
        <li
          key={flag.item.title}
          aria-current={flag.status === "active" ? "step" : undefined}
          className="relative pb-8"
        >
          <FlagLabel flag={flag} />
          {/* A zero-size anchor on the track, so measuring it gives the
              dot's centre whatever size the dot is. */}
          <span data-dot className="absolute bottom-0 left-0 size-0">
            <Dot
              status={flag.status}
              className="-translate-x-1/2 -translate-y-1/2"
            />
          </span>
        </li>
      ))}
    </ol>
  )
}

type Point = { x: number; y: number }

/** Radius of the curl that carries the track from one row to the next. */
const CURL = 28

/**
 * The track as one SVG path: along the first row, a curl down the right
 * edge, back along under it, a curl down the left edge, then along the
 * second row to its last milestone. `until` cuts it short at a milestone,
 * which draws the stretch already travelled.
 */
function trackPath(
  dots: Point[],
  split: number,
  width: number,
  until = dots.length - 1
) {
  if (until < 0) return ""
  const start = dots[0]
  const y1 = start.y
  if (until < split) return `M ${start.x} ${y1} H ${dots[until].x}`
  const y2 = dots[split].y
  const right = width - 1
  const left = 1
  const turn = y1 + CURL * 2
  return [
    `M ${start.x} ${y1}`,
    `H ${right - CURL}`,
    `A ${CURL} ${CURL} 0 0 1 ${right} ${y1 + CURL}`,
    `A ${CURL} ${CURL} 0 0 1 ${right - CURL} ${turn}`,
    `H ${left + CURL}`,
    `A ${CURL} ${CURL} 0 0 0 ${left} ${turn + CURL}`,
    `V ${y2 - CURL}`,
    `A ${CURL} ${CURL} 0 0 0 ${left + CURL} ${y2}`,
    `H ${dots[until].x}`,
  ].join(" ")
}

/**
 * The programme as one track that wraps onto a second row, like a line of
 * text: it runs right along the first row, curls back under it, and carries
 * on along the second. Milestones are spaced evenly rather than to scale, so
 * nothing crowds and every date sits in the same place in its column, ready
 * to be scanned. The track is drawn bright up to the milestone underway,
 * which turns as an atom, and faint beyond it. Phones get the same
 * milestones down a vertical rail.
 */
export function TimelineSection() {
  const today = useToday()

  const flags: Flag[] = [...timeline]
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .map((item) => ({ item, status: statusOf(item, today) }))

  const cols = Math.ceil(flags.length / 2)
  const rows = [flags.slice(0, cols), flags.slice(cols)]

  // How far along the track has been travelled: to the milestone underway,
  // or failing that the last one done.
  const activeIndex = flags.findIndex((f) => f.status === "active")
  const reached =
    activeIndex !== -1
      ? activeIndex
      : flags.reduce((last, f, i) => (f.status === "complete" ? i : last), -1)

  // The path follows the dots wherever the layout puts them, so measure.
  const chartRef = React.useRef<HTMLDivElement>(null)
  const [geometry, setGeometry] = React.useState<{
    width: number
    height: number
    dots: Point[]
  } | null>(null)

  React.useLayoutEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const measure = () => {
      const box = chart.getBoundingClientRect()
      if (box.width === 0) return
      const dots = [...chart.querySelectorAll("[data-dot]")].map((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.left - box.left, y: r.top - box.top }
      })
      setGeometry({ width: box.width, height: box.height, dots })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(chart)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="timeline" className="section-y scroll-mt-24">
      <div className="content-container">
        <SectionHeading
          title="Programme timeline"
          lede="Timeline for cohort 2026, dates may shift slightly as the programme progresses."
        />

        {/* The panel runs on past the last milestones and fades out, outline
            and all, into the page. */}
        <RevealGroup className="panel relative isolate mt-10 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_calc(100%_-_5rem),rgb(0_0_0/45%)_calc(100%_-_2rem),transparent)] px-6 pt-8 pb-20 md:[mask-image:linear-gradient(to_bottom,#000_calc(100%_-_6rem),rgb(0_0_0/45%)_calc(100%_-_2.5rem),transparent)] md:px-8 md:pt-10 md:pb-24">
          <TrailBackdrop />
          {/* Desktop: two rows joined by one continuous line. */}
          <RevealItem className="hidden md:block">
            <div ref={chartRef} className="relative">
              {geometry && (
                <svg
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-visible"
                  width={geometry.width}
                  height={geometry.height}
                  fill="none"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                >
                  <path
                    d={trackPath(geometry.dots, cols, geometry.width)}
                    className="stroke-foreground/20"
                  />
                  <path
                    d={trackPath(geometry.dots, cols, geometry.width, reached)}
                    className="stroke-foreground"
                  />
                </svg>
              )}
              <FlagRow flags={rows[0]} cols={cols} />
              <div className="pt-24">
                <FlagRow flags={rows[1]} cols={cols} />
              </div>
            </div>
          </RevealItem>

          {/* Phones: the same milestones down a vertical rail, bright up to
              the one underway. */}
          <RevealItem className="md:hidden">
            <ol>
              {flags.map((flag, index) => (
                <li
                  key={flag.item.title}
                  aria-current={flag.status === "active" ? "step" : undefined}
                  className="relative pb-6 pl-8"
                >
                  {index < flags.length - 1 && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-3 -bottom-3 left-0 w-[1.5px] -translate-x-1/2",
                        index < reached ? "bg-foreground" : "bg-foreground/20"
                      )}
                    />
                  )}
                  <span className="absolute top-3 left-0 size-0">
                    <Dot
                      status={flag.status}
                      className="-translate-x-1/2 -translate-y-1/2"
                    />
                  </span>
                  <FlagLabel flag={flag} />
                </li>
              ))}
            </ol>
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  )
}
