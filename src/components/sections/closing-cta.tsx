import { Reveal } from "@/components/motion/reveal"
import { CountdownPill } from "@/components/results-countdown"

export function ClosingCta() {
  return (
    <section className="bg-foreground text-background">
      <div className="container py-28 md:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="label-micro text-background/55">MYSSP 2026 Cohort</p>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="display-xl mt-7 text-balance">
              Applications in review.
            </h2>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-background/70">
              Selection announcement opens 12 September 2026 at 10:00 PM — the
              countdown leads to the selected-applicants reveal.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <CountdownPill className="border-background/35 bg-transparent text-background hover:border-background hover:bg-background/10 hover:text-background dark:border-background/35 dark:bg-transparent dark:hover:bg-background/10" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
