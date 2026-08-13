import * as React from "react"

import { DrawRule, Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { AnimatedIcon } from "@/components/icons"
import { requirementIcons } from "@/components/icons/icon-map"
import { eligibility } from "@/data/competition-data"

export function Eligibility() {
  const [hovered, setHovered] = React.useState<number | null>(null)

  return (
    <section
      id="eligibility"
      className="scroll-mt-24 border-t border-border py-24 md:py-32"
    >
      <div className="container">
        <div className="grid gap-14 lg:grid-cols-[22rem_1fr] lg:gap-20">
          {/* Sticky heading column */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <div className="flex items-center gap-5">
                <span className="label-micro shrink-0 text-muted-foreground">
                  Who can enter
                </span>
                <DrawRule className="h-px flex-1 bg-border" delay={0.1} />
                <span className="label-micro shrink-0 text-muted-foreground">
                  04
                </span>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="display-lg mt-6">Eligibility</h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-6 leading-relaxed text-muted-foreground">
                Check that you qualify before you start an application for the
                2026 cohort.
              </p>
            </Reveal>
          </div>

          {/* Requirements */}
          <div>
            <RevealGroup as="ul" className="border-t border-border">
              {eligibility.requirements.map((req, i) => {
                const Icon = requirementIcons[req.icon]
                return (
                  <RevealItem
                    as="li"
                    key={req.title}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    className="grid grid-cols-[1.75rem_1fr] gap-x-4 gap-y-2 border-b border-border py-6 sm:grid-cols-[1.75rem_12rem_1fr] sm:gap-x-6"
                  >
                    <span className="pt-0.5 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                      {Icon && <AnimatedIcon icon={Icon} active={hovered === i} />}
                    </span>
                    <h3 className="font-medium">{req.title}</h3>
                    <p className="col-start-2 leading-relaxed text-muted-foreground sm:col-start-3">
                      {req.description}
                    </p>
                  </RevealItem>
                )
              })}
            </RevealGroup>

            {/* Inverted note panel */}
            <Reveal delay={0.1}>
              <div className="mt-12 bg-foreground p-8 text-background md:p-10">
                <h3 className="label-micro text-background/60">
                  Before you apply
                </h3>
                <ul className="mt-6 space-y-4">
                  {eligibility.notes.map((note) => (
                    <li key={note} className="flex gap-4 leading-relaxed">
                      <span
                        aria-hidden
                        className="mt-[0.7rem] h-px w-4 shrink-0 bg-background/40"
                      />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
