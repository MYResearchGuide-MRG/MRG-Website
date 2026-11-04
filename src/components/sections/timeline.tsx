import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

import { RevealGroup, RevealItem } from "@/components/motion/reveal"
import { easeOutExpo } from "@/components/motion/variants"
import { SectionHeading } from "./section-heading"
import { timeline, timelineStages } from "@/data/competition-data"
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

const DAY = 86_400_000

/**
 * The programme as four stages side by side, each listing its milestones,
 * with a bar on top that fills as the stage passes. The current stage is
 * raised and tagged "Now", so a visitor can see where things stand without
 * reading a single date. Stacks to one column on small screens.
 */
export function TimelineSection() {
  const today = useToday()
  const reduced = useReducedMotion()

  const stages = timelineStages.map((name, index) => {
    const items = timeline.filter((item) => item.stage === name)
    const start = items.reduce(
      (m, i) => (i.start < m ? i.start : m),
      items[0].start
    )
    const end = items.reduce((m, i) => (i.end > m ? i.end : m), items[0].end)
    const status = statusOf({ start, end }, today)
    // How far through the stage today is, counting its last day as included.
    const progress =
      status === "complete"
        ? 1
        : status === "upcoming"
          ? 0
          : (Date.parse(today) - Date.parse(start) + DAY) /
            (Date.parse(end) - Date.parse(start) + DAY)
    return { name, index, items, status, progress }
  })

  return (
    <section id="timeline" className="scroll-mt-24 py-20 md:py-28">
      <div className="container">
        <SectionHeading
          kicker="Programme"
          title="Programme timeline"
          lede="From applications to Demo Day. Dates may shift slightly as the programme progresses."
        />

        <RevealGroup
          as="ol"
          className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {stages.map((stage) => (
            <RevealItem
              as="li"
              key={stage.name}
              aria-current={stage.status === "active" ? "step" : undefined}
              className={cn(
                "flex flex-col rounded-xl p-5 transition-colors",
                stage.status === "active" ? "bg-card" : undefined
              )}
            >
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <motion.div
                  className={cn(
                    "h-full origin-left rounded-full",
                    stage.status === "active" ? "bg-[#a3adb8]" : "bg-foreground"
                  )}
                  initial={reduced ? false : { scaleX: 0 }}
                  whileInView={{ scaleX: stage.progress }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 1.1,
                    delay: 0.15 + stage.index * 0.12,
                    ease: easeOutExpo,
                  }}
                  style={reduced ? { scaleX: stage.progress } : undefined}
                />
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="label-micro text-muted-foreground">
                  Stage {String(stage.index + 1).padStart(2, "0")}
                </span>
                {stage.status === "active" && (
                  <span className="rounded-full bg-[#a3adb8] px-2.5 py-0.5 text-[11px] font-semibold text-neutral-900">
                    Now
                  </span>
                )}
                {stage.status === "complete" && (
                  <span className="text-[11px] text-muted-foreground">
                    Done
                  </span>
                )}
              </div>
              <h3
                className={cn(
                  "mt-2 font-display text-xl leading-snug",
                  stage.status === "complete" && "text-muted-foreground"
                )}
              >
                {stage.name}
              </h3>

              <ul className="mt-5 space-y-4">
                {stage.items.map((item) => {
                  const status = statusOf(item, today)
                  return (
                    <li key={item.title} className="flex gap-3">
                      <StatusMark status={status} />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">
                          {item.date}
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 text-sm leading-snug",
                            status === "complete"
                              ? "text-muted-foreground"
                              : "text-foreground",
                            status === "active" && "font-semibold"
                          )}
                        >
                          {item.title}
                        </div>
                        {status === "active" && (
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

/**
 * Round, and drawn against --color-muted-foreground rather than --color-border:
 * border-coloured hairline marks all but vanish on the dark background.
 */
function StatusMark({ status }: { status: Status }) {
  // The milestone underway gets an atom rather than a dot, turning slowly.
  if (status === "active") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-[#a3adb8] motion-safe:animate-[spin_14s_linear_infinite]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <ellipse cx="12" cy="12" rx="4.2" ry="10" />
        <ellipse
          cx="12"
          cy="12"
          rx="4.2"
          ry="10"
          transform="rotate(60 12 12)"
        />
        <ellipse
          cx="12"
          cy="12"
          rx="4.2"
          ry="10"
          transform="rotate(-60 12 12)"
        />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "relative mt-1 block size-2.5 shrink-0 rounded-full",
        status === "complete" && "bg-muted-foreground",
        status === "upcoming" && "border-[1.5px] border-muted-foreground"
      )}
    />
  )
}
