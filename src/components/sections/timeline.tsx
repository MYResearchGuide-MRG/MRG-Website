import * as React from "react"
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react"

import { RevealGroup, RevealItem } from "@/components/motion/reveal"
import { SectionHeading } from "./section-heading"
import { timeline } from "@/data/competition-data"
import { cn } from "@/lib/utils"

type Status = "complete" | "active" | "upcoming"

/**
 * Status is derived rather than authored. The page sits live across every one
 * of these milestones, and a hand-set "active" marker goes stale the moment a
 * date passes.
 */
function statusOf(phase: { start: string; end: string }, today: string): Status {
  if (phase.end < today) return "complete"
  if (phase.start <= today) return "active"
  return "upcoming"
}

function StatusMark({ status }: { status: Status }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 block size-2.5 shrink-0 translate-y-[0.45rem] bg-background",
        status === "complete" && "bg-foreground",
        status === "active" &&
          "bg-background ring-[1.5px] ring-foreground ring-offset-2 ring-offset-background",
        status === "upcoming" && "border border-border bg-background"
      )}
    />
  )
}

export function Timeline() {
  const railRef = React.useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  // Local date, not UTC: the schedule is Malaysian and a UTC midnight would
  // flip a milestone eight hours early for everyone reading it here.
  const today = React.useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [])

  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ["start 75%", "end 60%"],
  })
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 34,
    restDelta: 0.001,
  })

  return (
    <section
      id="timeline"
      className="scroll-mt-24 border-t border-border bg-muted/40 py-24 md:py-32"
    >
      <div className="container">
        <SectionHeading
          kicker="Important Dates"
          index="01"
          title="Competition timeline"
          lede="From application through Demo Day. Dates below are tentative and may shift slightly; the finalised schedule ships with the participant info pack."
        />

        <div ref={railRef} className="relative mt-16 md:mt-24">
          {/* Static rail + scroll-drawn progress overlay.
              Left offset must land on the centre of the status mark:
              mobile the mark is the first child; on md the date column
              (11rem) plus the 2.5rem gap sit before it. */}
          <div
            aria-hidden
            className="absolute top-2 bottom-2 left-[calc(0.3125rem-0.5px)] w-px bg-border md:left-[calc(13.5rem+0.3125rem-0.5px)]"
          />
          {!reduced && (
            <motion.div
              aria-hidden
              className="absolute top-2 bottom-2 left-[calc(0.3125rem-0.5px)] w-px origin-top bg-foreground md:left-[calc(13.5rem+0.3125rem-0.5px)]"
              style={{ scaleY }}
            />
          )}

          <RevealGroup as="ol">
            {timeline.map((item, i) => (
              <RevealItem
                as="li"
                key={i}
                className="relative flex gap-6 border-b border-border py-7 last:border-b-0 md:gap-10"
              >
                {/* The date is the point of the row, so it reads as text, not
                    as a letterspaced micro-label. */}
                <div className="hidden w-44 shrink-0 pt-[0.3rem] text-sm font-medium md:block">
                  {item.date}
                </div>

                <StatusMark status={statusOf(item, today)} />

                <div className="min-w-0 flex-1 md:pl-4">
                  <div className="mb-2 text-sm font-medium md:hidden">
                    {item.date}
                  </div>
                  <h3 className="font-display text-xl leading-tight md:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}
