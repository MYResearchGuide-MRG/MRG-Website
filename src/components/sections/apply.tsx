import * as React from "react"
import { ArrowRight } from "lucide-react"

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { AnimatedIcon } from "@/components/icons"
import { applicationStepIcons } from "@/components/icons/icon-map"
import { SectionHeading } from "./section-heading"
import { Button } from "@/components/ui/button"
import { applicationSteps } from "@/data/competition-data"
import { siteConfig } from "@/lib/site"

export function Apply() {
  const [hovered, setHovered] = React.useState<number | null>(null)

  return (
    <section
      id="apply"
      className="scroll-mt-24 border-t border-border bg-muted/40 py-24 md:py-32"
    >
      <div className="container">
        <SectionHeading
          kicker="Application"
          index="05"
          title="How to apply"
          lede="Five steps, roughly two to three hours of work in total."
        />

        <RevealGroup as="ol" className="mt-16 border-t border-border md:mt-24">
          {applicationSteps.map((step) => {
            const Icon = applicationStepIcons[step.step]
            return (
            <RevealItem
              as="li"
              key={step.step}
              onMouseEnter={() => setHovered(step.step)}
              onMouseLeave={() => setHovered(null)}
              className="grid grid-cols-[3rem_1fr] items-start gap-x-5 border-b border-border py-8 md:grid-cols-[4rem_3rem_1fr_9rem] md:gap-x-8"
            >
              <span className="label-micro pt-2 text-muted-foreground">
                {String(step.step).padStart(2, "0")}
              </span>

              <span className="col-start-2 row-start-1 hidden size-11 items-center justify-center border border-border text-muted-foreground md:flex">
                {Icon && (
                  <AnimatedIcon
                    icon={Icon}
                    active={hovered === step.step}
                    size={20}
                  />
                )}
              </span>

              <div className="col-start-2 min-w-0 md:col-start-3">
                <h3 className="font-display text-xl leading-tight md:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                <span className="label-micro mt-4 block text-muted-foreground md:hidden">
                  {step.duration}
                </span>
              </div>

              <span className="label-micro hidden pt-2 text-right text-muted-foreground md:block">
                {step.duration}
              </span>
            </RevealItem>
            )
          })}
        </RevealGroup>

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="group">
              <a href={siteConfig.applicationFormUrl}>
                Start your application
                <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
              </a>
            </Button>
            <p className="label-micro text-muted-foreground">
              Applications open 20 August 2026
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
