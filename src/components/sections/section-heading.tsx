import * as React from "react"

import { Reveal } from "@/components/motion/reveal"

/**
 * Shared section header: the title, with an optional lede beneath.
 */
export function SectionHeading({
  title,
  lede,
  className,
}: {
  title: React.ReactNode
  lede?: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Reveal>
        <h2 className="display-lg max-w-3xl">{title}</h2>
      </Reveal>

      {lede && (
        <Reveal delay={0.14}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {lede}
          </p>
        </Reveal>
      )}
    </div>
  )
}
