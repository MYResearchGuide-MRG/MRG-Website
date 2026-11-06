import * as React from "react"
import { useInView, useReducedMotion } from "motion/react"
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  GraduationCap,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { SlantLink } from "@/components/ui/slant-link"
import { SectionHeading } from "./section-heading"
import { applicationSteps, eligibility } from "@/data/competition-data"
import { usePhase } from "@/lib/phase"
import { siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"
import { EligibilityStack } from "./eligibility-stack"

const icons: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  graduation: GraduationCap,
  map: MapPin,
  users: Users,
  clock: Clock,
  check: BadgeCheck,
}

const criteria = eligibility.requirements.map((req) => ({
  ...req,
  Icon: icons[req.icon] ?? BadgeCheck,
}))

/** How long each criterion holds the stack before it moves to the next. */
const CYCLE_MS = 3200

/**
 * Who can apply, then how, set out like a spec sheet: the heading and the one
 * action on the left (held in place while the list scrolls past on wide
 * screens), and on the right, in a black outlined panel, two ruled lists —
 * requirements as label/answer rows with an icon each, application steps as
 * numbered rows.
 *
 * On wide screens the left column also holds an isometric stack of the
 * criteria (see eligibility-stack). It steps through them on its own, and
 * hovering a requirement row brings that one forward.
 *
 * The lede and the action follow the programme phase, so the section is
 * accurate all year: "Apply now" while applications are open, and no action
 * the rest of the year.
 */
export function Eligibility() {
  const phase = usePhase()
  const open = phase.id === "applications"
  const reduced = useReducedMotion()
  const [active, setActive] = React.useState(0)
  const [hovered, setHovered] = React.useState<number | null>(null)
  // The stack only shows on wide screens, so only cycle it there, and only
  // while the section is on screen.
  const sectionRef = React.useRef<HTMLElement>(null)
  const inView = useInView(sectionRef)
  const [wide, setWide] = React.useState(false)

  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)")
    const update = () => setWide(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  React.useEffect(() => {
    if (hovered !== null || reduced || !wide || !inView) return
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % criteria.length),
      CYCLE_MS
    )
    return () => window.clearInterval(id)
  }, [hovered, reduced, wide, inView])

  return (
    <section
      ref={sectionRef}
      id="eligibility"
      className="section-y scroll-mt-24"
    >
      <div className="container grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            title="Eligibility and how to apply"
            lede={
              open
                ? "Applications are open until 10 September. Check that you qualify, then apply in three steps."
                : "Applications for this cohort have closed. Here is who can apply, and how, for when the next cohort opens."
            }
          />
          {open && (
            <Reveal delay={0.2} className="mt-8">
              <SlantLink
                href={siteConfig.applicationFormUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Apply now
              </SlantLink>
            </Reveal>
          )}
          <Reveal delay={0.25} className="mt-14 hidden justify-center lg:flex">
            <EligibilityStack items={criteria} active={active} />
          </Reveal>
        </div>

        <div className="panel p-6 md:p-8">
          <h3 className="label-micro text-muted-foreground">Who can apply</h3>
          <RevealGroup as="dl" className="mt-4">
            {criteria.map((req, i) => (
              <RevealItem
                key={req.title}
                className="grid gap-1 border-t border-border py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6"
                onHoverStart={() => {
                  setHovered(i)
                  setActive(i)
                }}
                onHoverEnd={() => setHovered(null)}
              >
                <dt className="flex items-start gap-2.5 text-sm font-medium">
                  <req.Icon
                    aria-hidden
                    strokeWidth={1.5}
                    className={cn(
                      "mt-px size-4 shrink-0 transition-colors duration-300",
                      i === active ? "text-foreground" : "text-muted-foreground"
                    )}
                  />
                  {req.title}
                </dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  {req.description}
                </dd>
              </RevealItem>
            ))}
          </RevealGroup>

          <h3
            id="apply"
            className="label-micro mt-14 scroll-mt-24 text-muted-foreground"
          >
            How to apply
          </h3>
          <RevealGroup as="ol" className="mt-4">
            {applicationSteps.map((step) => (
              <RevealItem
                as="li"
                key={step.step}
                className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-t border-border py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-6"
              >
                <span className="font-mono text-sm text-[#6b7686] dark:text-[#a3adb8]">
                  {String(step.step).padStart(2, "0")}
                </span>
                <div>
                  <h4 className="text-sm font-medium">{step.title}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
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
