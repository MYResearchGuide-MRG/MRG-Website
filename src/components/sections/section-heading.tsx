import * as React from "react"

import { DrawRule, Reveal } from "@/components/motion/reveal"
import { cn } from "@/lib/utils"

/**
 * Shared section header.
 *
 * The kicker row runs the full container width — kicker on the left, a rule
 * that draws across the gap, and the section index on the right — so the
 * heading anchors both edges instead of leaving the right half empty.
 */
export function SectionHeading({
  kicker,
  index,
  title,
  lede,
  className,
}: {
  kicker: string
  /** Two-digit section index shown at the right edge, e.g. "03". */
  index?: string
  title: React.ReactNode
  lede?: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Reveal>
        <div className="flex items-center gap-5">
          <span className="label-micro shrink-0 text-muted-foreground">
            {kicker}
          </span>
          <DrawRule className="h-px flex-1 bg-border" delay={0.1} />
          {index && (
            <span className="label-micro shrink-0 text-muted-foreground">
              {index}
            </span>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <h2 className={cn("display-lg mt-8 max-w-3xl")}>{title}</h2>
      </Reveal>

      {lede && (
        <Reveal delay={0.14}>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {lede}
          </p>
        </Reveal>
      )}
    </div>
  )
}
