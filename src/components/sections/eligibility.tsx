import * as React from "react"
import { ArrowRight } from "lucide-react"

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { AnimatedIcon } from "@/components/icons"
import { applicationStepIcons, requirementIcons } from "@/components/icons/icon-map"
import { SectionHeading } from "./section-heading"
import { Button } from "@/components/ui/button"
import { applicationSteps, eligibility } from "@/data/competition-data"
import { siteConfig } from "@/lib/site"

/**
 * Eligibility and the application steps used to be two full-height sections
 * that said, between them, about a screen and a half of very little. They are
 * one section now: what you need on the left, what you do about it on the
 * right, and the caveats as a footnote rather than a full-width panel.
 */
export function Eligibility() {
  const [hoveredReq, setHoveredReq] = React.useState<number | null>(null)
  const [hoveredStep, setHoveredStep] = React.useState<number | null>(null)

  return (
    <section
      id="eligibility"
      className="scroll-mt-24 border-t border-border py-24 md:py-32"
    >
      <div className="container">
        <SectionHeading
          kicker="Who can apply"
          index="02"
          title="Eligibility &amp; how to apply"
          lede="Check that you qualify, then apply in three steps."
        />

        <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Requirements */}
          <div>
            <h3 className="label-micro text-muted-foreground">Requirements</h3>
            <RevealGroup as="ul" className="mt-6 border-t border-border">
              {eligibility.requirements.map((req, i) => {
                const Icon = requirementIcons[req.icon]
                return (
                  <RevealItem
                    as="li"
                    key={req.title}
                    onMouseEnter={() => setHoveredReq(i)}
                    onMouseLeave={() => setHoveredReq(null)}
                    className="grid grid-cols-[1.75rem_1fr] gap-x-4 gap-y-1 border-b border-border py-5"
                  >
                    <span className="pt-0.5 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                      {Icon && (
                        <AnimatedIcon icon={Icon} active={hoveredReq === i} />
                      )}
                    </span>
                    <h4 className="font-medium">{req.title}</h4>
                    <p className="col-start-2 text-sm leading-relaxed text-muted-foreground">
                      {req.description}
                    </p>
                  </RevealItem>
                )
              })}
            </RevealGroup>
          </div>

          {/* Application steps */}
          <div id="apply" className="scroll-mt-24">
            <h3 className="label-micro text-muted-foreground">
              3 simple steps
            </h3>
            <RevealGroup as="ol" className="mt-6 border-t border-border">
              {applicationSteps.map((step) => {
                const Icon = applicationStepIcons[step.step]
                return (
                  <RevealItem
                    as="li"
                    key={step.step}
                    onMouseEnter={() => setHoveredStep(step.step)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className="grid grid-cols-[2.5rem_1fr] items-start gap-x-4 border-b border-border py-5 sm:grid-cols-[2.5rem_3rem_1fr] sm:gap-x-5"
                  >
                    <span className="label-micro pt-1.5 text-muted-foreground">
                      {String(step.step).padStart(2, "0")}
                    </span>

                    <span className="col-start-2 row-start-1 hidden size-11 items-center justify-center border border-border text-muted-foreground sm:flex">
                      {Icon && (
                        <AnimatedIcon
                          icon={Icon}
                          active={hoveredStep === step.step}
                          size={20}
                        />
                      )}
                    </span>

                    <div className="col-start-2 min-w-0 sm:col-start-3">
                      <h4 className="font-display text-lg leading-tight">
                        {step.title}
                      </h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </RevealItem>
                )
              })}
            </RevealGroup>

            <Reveal delay={0.1}>
              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="group">
                  <a href={siteConfig.applicationFormUrl}>
                    Start your application
                    <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
                  </a>
                </Button>
                <p className="label-micro text-muted-foreground">
                  Applications close 10 September 2026
                </p>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Caveats. A footnote row rather than the old inverted slab — these are
            qualifications on the list above, not a headline of their own. */}
        <Reveal delay={0.1}>
          <ul className="mt-14 grid gap-x-10 gap-y-3 border-t border-border pt-8 sm:grid-cols-2">
            {eligibility.notes.map((note) => (
              <li
                key={note}
                className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="mt-[0.6rem] h-px w-3 shrink-0 bg-border"
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
