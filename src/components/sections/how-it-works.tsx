import {
  Reveal,
  RevealGroup,
  RevealItem,
  DrawRule,
} from "@/components/motion/reveal"
import { SectionHeading } from "./section-heading"

/**
 * The programme in four steps, so the words the rest of the page uses —
 * research area, project, mentor, Demo Day — are explained before they appear.
 * True of every cohort, so it never needs editing between years.
 */
const steps = [
  {
    title: "Pick a research area",
    body: "Browse six fields of science and the mentor-led projects running in each.",
  },
  {
    title: "Join a mentor's project",
    body: "Up to three scholars per project, working directly with an experienced researcher.",
  },
  {
    title: "Research for eight weeks",
    body: "Do real research with your mentor, with bi-weekly progress checks along the way.",
  },
  {
    title: "Present at Demo Day",
    body: "Share what you found at the Malaysia Science Scholars' Demo Day.",
  },
] as const

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20 md:py-28">
      <div className="container">
        <SectionHeading kicker="How it works" title="How MYSSP works" />

        <div className="relative mt-14">
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
                <span className="relative flex size-10 items-center justify-center rounded-full bg-foreground font-display text-sm font-semibold text-background">
                  {i + 1}
                </span>
                <h3 className="mt-6 font-display text-lg leading-snug">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}
