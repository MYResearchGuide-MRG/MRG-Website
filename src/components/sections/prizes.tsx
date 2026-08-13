import { Check } from "lucide-react"

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { SectionHeading } from "./section-heading"
import { prizes } from "@/data/competition-data"
import { cn } from "@/lib/utils"

/**
 * Tier styling. The metal ramp is a visual cue for prestige, carried by the
 * marker and the hover rule only.
 *
 * Deliberately no "1st / 2nd / 3rd place" labels: these are not placings.
 * Track Winners is one award per track and Honorable Mentions covers up to ten
 * projects, so calling them second and third place would misstate the rules.
 * The index reads as list order, the way the numbered rows elsewhere do.
 */
const TIERS = [
  {
    metal: "text-[var(--color-gold)]",
    rule: "bg-[var(--color-gold)]",
    border:
      "group-hover/tier:border-[color-mix(in_oklch,var(--color-gold)_55%,transparent)]",
  },
  {
    metal: "text-[var(--color-silver)]",
    rule: "bg-[var(--color-silver)]",
    border:
      "group-hover/tier:border-[color-mix(in_oklch,var(--color-silver)_55%,transparent)]",
  },
  {
    metal: "text-[var(--color-bronze)]",
    rule: "bg-[var(--color-bronze)]",
    border:
      "group-hover/tier:border-[color-mix(in_oklch,var(--color-bronze)_55%,transparent)]",
  },
] as const

/** A single benefit line. Static glyph — 18 animated icons would be noise. */
function Benefit({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed">
      <Check
        aria-hidden
        className="mt-[0.2rem] size-3.5 shrink-0 text-muted-foreground"
        strokeWidth={2}
      />
      <span>{children}</span>
    </li>
  )
}

export function Prizes() {
  // "All Participants" is not a fourth rank — it's the floor everyone gets.
  // Keeping it in the same row read as a losing tier, so it gets its own band.
  const tiers = prizes.filter((p) => p.title !== "All Participants")
  const guaranteed = prizes.find((p) => p.title === "All Participants")

  return (
    <section
      id="prizes"
      className="tone-grid scroll-mt-24 border-t border-border py-24 md:py-32"
    >
      <div className="container">
        <SectionHeading
          kicker="Prizes & Recognition"
          index="03"
          title="What you take away"
          lede="Prize amounts and judging panels are still being confirmed. Every participant who completes the programme is recognised."
        />

        {/* Competitive tiers */}
        <RevealGroup className="mt-16 grid gap-6 md:grid-cols-3 md:mt-24">
          {tiers.map((prize, i) => {
            const rank = TIERS[i] ?? TIERS[TIERS.length - 1]
            return (
            <RevealItem
              key={prize.title}
              className={cn(
                "group/tier relative flex flex-col border border-border bg-background p-7 transition-colors duration-300 md:p-8",
                rank.border
              )}
            >
              {/* Rank bar along the top edge, revealed on hover */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/tier:scale-x-100",
                  rank.rule
                )}
              />

              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "label-micro flex items-center gap-2.5",
                    rank.metal
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("size-1.5 rounded-full", rank.rule)}
                  />
                  {String(i + 1).padStart(2, "0")}
                </span>
                {prize.placeholder && (
                  <span className="label-micro border border-border px-1.5 py-1 text-muted-foreground">
                    TBC
                  </span>
                )}
              </div>

              <p className="font-display mt-8 text-5xl leading-none">
                {prize.amount}
              </p>

              <h3 className="mt-5 text-lg font-medium">{prize.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {prize.description}
              </p>

              <ul className="mt-7 space-y-2.5 border-t border-border pt-7">
                {prize.benefits.map((benefit) => (
                  <Benefit key={benefit}>{benefit}</Benefit>
                ))}
              </ul>
            </RevealItem>
            )
          })}
        </RevealGroup>

        {/* Guaranteed floor — deliberately not a card in the row above */}
        {guaranteed && (
          <Reveal delay={0.08}>
            <div className="mt-6 border border-border bg-background p-7 md:p-10">
              <div className="grid gap-8 lg:grid-cols-[20rem_1fr] lg:gap-16">
                <div>
                  <span className="label-micro text-muted-foreground">
                    Guaranteed
                  </span>
                  <h3 className="font-display mt-4 text-2xl leading-tight md:text-3xl">
                    Every participant receives
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Awarded on finishing the full research period, 15 September
                    to 10 November 2026. No ranking required.
                  </p>
                </div>

                <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:content-start">
                  {guaranteed.benefits.map((benefit) => (
                    <Benefit key={benefit}>{benefit}</Benefit>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
