import * as React from "react"
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react"

import { RevealGroup, RevealItem } from "@/components/motion/reveal"
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

/**
 * Round, and drawn against --color-muted-foreground rather than --color-border.
 * Border-coloured hairline squares all but vanished on the dark background,
 * which left the rail reading as a bare line with no milestones on it.
 */
function StatusMark({ status }: { status: Status }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 block size-2.5 shrink-0 translate-y-[0.4rem] rounded-full",
        status === "complete" && "bg-foreground",
        status === "active" &&
          "bg-background ring-2 ring-foreground ring-offset-2 ring-offset-background",
        status === "upcoming" && "border-[1.5px] border-muted-foreground bg-background"
      )}
    />
  )
}

/**
 * Compact rail, sized to sit in a narrow column beside the FAQ rather than
 * across a full-width section. The old layout put the date in an 11rem gutter
 * that only existed above `md`; here it stacks above the title instead, so the
 * marker offset is the same at every width and the rail needs a single value.
 */
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
    <div id="timeline" className="scroll-mt-24">
      <h2 className="display-md">Programme Timeline</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        From our application dates to the Malaysia Science Scholars&rsquo; Demo
        Day. Dates are open to slight shifts according to programme progress.
      </p>

      <div ref={railRef} className="relative mt-8">
        {/* Static rail + scroll-drawn progress overlay. The offset lands on the
            centre of the 0.625rem status mark. The rail is drawn a step above
            --color-border: at border weight the not-yet-reached stretch below
            the progress line disappeared entirely against the dark panel. */}
        <div
          aria-hidden
          className="absolute top-2 bottom-2 left-[calc(0.3125rem-0.5px)] w-px bg-muted-foreground/35"
        />
        {!reduced && (
          <motion.div
            aria-hidden
            className="absolute top-2 bottom-2 left-[calc(0.3125rem-0.5px)] w-px origin-top bg-foreground"
            style={{ scaleY }}
          />
        )}

        <RevealGroup as="ol">
          {timeline.map((item, i) => (
            <RevealItem
              as="li"
              key={i}
              className="relative flex gap-4 border-b border-border py-4 last:border-b-0"
            >
              <StatusMark status={statusOf(item, today)} />

              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {item.date}
                </div>
                <h3 className="mt-1 font-display text-base leading-snug">
                  {item.title}
                </h3>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </div>
  )
}
