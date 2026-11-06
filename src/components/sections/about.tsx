import * as React from "react"

import {
  Reveal,
  RevealGroup,
  RevealItem,
  DrawRule,
} from "@/components/motion/reveal"
import { AnimatedIcon } from "@/components/icons"
import ClockIcon from "@/components/icons/clock-icon"
import RosetteDiscountCheckIcon from "@/components/icons/rosette-discount-check-icon"
import UsersGroupIcon from "@/components/icons/users-group-icon"

/**
 * "What is MYSSP?": the first thing after the hero, for a visitor who has
 * never heard of the programme. The answer is the three cards themselves
 * (what it is, who it connects, how long it runs), since that is where the
 * eye lands; a paragraph above them went unread. Then the programme as four
 * steps, so the words the rest of the page uses — research area, project,
 * mentor, Demo Day — are explained before they appear.
 *
 * Laid out as cards on the page grid: three facts in a row and the steps in
 * a wide card beneath, all in MYResearchGuide's black outlined panels.
 *
 * Written to be true of every cohort, so it never needs editing between years.
 */
const facts = [
  {
    icon: RosetteDiscountCheckIcon,
    title: "Malaysia’s 1st STEM Research Mentorship Programme",
    body: "Completely free and designed to kickstart beginners on their research journey, Malaysia Science Scholar’s Programme (MYSSP) bridges STEM-based curiosity and change for youth based across Malaysia.",
  },
  {
    icon: UsersGroupIcon,
    title: "Connect With Researchers",
    body: "Meet and work closely on research questions with research mentors selected from institutions both locally and internationally, including Cambridge, NUS, Warwick, HKUST, and many more.",
  },
  {
    icon: ClockIcon,
    title: "8-Week Guidance",
    body: "Participants collaborate through project-specific communication channels and weekly hands-on meetings with their mentors. Throughout the 8-week timeframe, team progress and feedback are actively monitored through programme-wide progress checks.",
  },
] as const

const steps = [
  {
    title: "Explore Research Opportunities",
    body: "Discover six STEM disciplines and explore research projects designed and led by experienced researchers.",
  },
  {
    title: "Join a Research Team",
    body: "Select and apply for projects that align with your interests and collaborate in a small team of up to three scholars under the guidance of MYSSP’s research mentors.",
  },
  {
    title: "Eight Weeks to Research",
    body: "Work alongside your mentor to investigate a STEM research question and develop your methodology to produce a live presentation, summary video, and written report.",
  },
  {
    title: "Showcase Your Findings",
    body: "Present your research, share your discoveries and celebrate your work at the Malaysia Science Scholars' Demo Day.",
  },
] as const

export function About() {
  return (
    <section id="about" className="section-y scroll-mt-24">
      <div className="container">
        <Reveal>
          <h2 className="display-lg">What is MYSSP?</h2>
        </Reveal>

        <RevealGroup as="ul" className="mt-10 grid gap-4 md:grid-cols-3">
          {facts.map((fact) => (
            <FactCard key={fact.title} {...fact} />
          ))}
        </RevealGroup>

        {/* The steps in a wide card under the facts, same surface and gap, so
            the whole answer reads as one block. */}
        <Reveal className="panel mt-4 p-6 md:p-8">
          <h3 className="label-micro text-muted-foreground">How it works</h3>
          <div className="relative mt-8">
            {/* The thread joining the four steps, drawn left to right as the
                section comes into view. Desktop only: stacked, the numbers
                already read as a sequence. */}
            <Reveal className="pointer-events-none absolute inset-x-0 top-5 hidden lg:block">
              <DrawRule className="block h-px w-full bg-border" delay={0.15} />
            </Reveal>

            <RevealGroup
              as="ol"
              className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
            >
              {steps.map((step, i) => (
                <RevealItem as="li" key={step.title} className="relative">
                  <span className="relative flex size-10 items-center justify-center rounded-full bg-foreground font-display text-sm font-semibold text-background ring-8 ring-card">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h4 className="mt-6 font-display text-lg leading-snug">
                    {step.title}
                  </h4>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/** One fact card. Its line icon plays its animation while the card is hovered. */
function FactCard({
  icon,
  title,
  body,
}: (typeof facts)[number]) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <RevealItem
      as="li"
      className="panel flex flex-col p-6 md:p-8"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <AnimatedIcon
        icon={icon}
        active={hovered}
        size={32}
        className="self-start text-foreground"
      />
      <h3 className="mt-6 font-display text-xl leading-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </RevealItem>
  )
}
