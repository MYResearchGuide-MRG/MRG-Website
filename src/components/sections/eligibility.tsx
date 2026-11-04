import * as React from "react"

import { RevealGroup, RevealItem, Reveal } from "@/components/motion/reveal"
import { AnimatedIcon } from "@/components/icons"
import {
  applicationStepIcons,
  requirementIcons,
} from "@/components/icons/icon-map"
import { SlantLink } from "@/components/ui/slant-link"
import { SectionHeading } from "./section-heading"
import { applicationSteps, eligibility } from "@/data/competition-data"
import { usePhase } from "@/lib/phase"
import { siteConfig } from "@/lib/site"

/**
 * Who can apply, then how. Requirements are an open three-column grid, each
 * under a hairline rule, that the eye can scan in any order; the application
 * is three steps read left to right, ending in the one thing to do next.
 *
 * The lede and the call to action follow the programme phase, so the section
 * is accurate all year: "Apply now" while applications are open, and an offer
 * to hear when the next cohort opens the rest of the time.
 */
export function Eligibility() {
  const phase = usePhase()
  const open = phase.id === "applications"

  return (
    <section id="eligibility" className="scroll-mt-24 py-20 md:py-28">
      <div className="container">
        <SectionHeading
          kicker="Who can apply"
          title="Eligibility and how to apply"
          lede={
            open
              ? "Applications are open until 10 September. Check that you qualify, then apply in three steps."
              : "Applications for this cohort have closed. Here is who can apply, and how, when the next cohort opens."
          }
        />

        <h3 className="label-micro mt-14 text-muted-foreground">
          Requirements
        </h3>
        <RevealGroup
          as="ul"
          className="mt-5 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3"
        >
          {eligibility.requirements.map((req) => (
            <RequirementCard key={req.title} {...req} />
          ))}
        </RevealGroup>

        <h3
          id="apply"
          className="label-micro mt-16 scroll-mt-24 text-muted-foreground"
        >
          How to apply
        </h3>
        <Reveal delay={0.05}>
          <div className="mt-5 border-t border-border pt-6">
            <ol className="grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border">
              {applicationSteps.map((step) => (
                <ApplicationStep key={step.step} {...step} />
              ))}
            </ol>

            <div className="mt-8 flex flex-col items-start gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {open
                  ? "Applications close 10 September."
                  : "Join the mailing list to hear when applications for the next cohort open."}
              </p>
              <SlantLink
                href={
                  open
                    ? siteConfig.applicationFormUrl
                    : siteConfig.mailingListUrl
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {open ? "Apply now" : "Get notified"}
              </SlantLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function RequirementCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: string
}) {
  const [hovered, setHovered] = React.useState(false)
  const Icon = requirementIcons[icon]
  return (
    <RevealItem
      as="li"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="border-t border-border py-6"
    >
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          {Icon && <AnimatedIcon icon={Icon} active={hovered} size={20} />}
        </span>
        <h4 className="font-display text-lg leading-snug">{title}</h4>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </RevealItem>
  )
}

function ApplicationStep({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  const [hovered, setHovered] = React.useState(false)
  const Icon = applicationStepIcons[step]
  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="md:px-8 md:first:pl-0 md:last:pr-0"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
          {step}
        </span>
        <span className="text-muted-foreground">
          {Icon && <AnimatedIcon icon={Icon} active={hovered} size={18} />}
        </span>
      </div>
      <h4 className="mt-5 font-display text-lg leading-snug">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </li>
  )
}
