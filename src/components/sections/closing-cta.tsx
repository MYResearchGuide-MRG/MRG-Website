import { ArrowRight, Mail } from "lucide-react"

import { Reveal } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { isRegistrationOpen, siteConfig } from "@/lib/site"

export function ClosingCta() {
  const registrationOpen = isRegistrationOpen()

  return (
    <section className="bg-foreground text-background">
      <div className="container py-28 md:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className="label-micro text-background/55">MYSSP 2026 Cohort</p>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="display-xl mt-7 text-balance">
              Start your research journey.
            </h2>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-background/70">
              {registrationOpen
                ? "Work with expert mentors on a science research project. Applications close September 10, 2026."
                : "Work with expert mentors on a science research project. Applications for the 2026 cohort are now closed."}
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {registrationOpen ? (
                <Button asChild size="xl" variant="inverse" className="group">
                  <a href={siteConfig.applicationFormUrl}>
                    Apply now
                    <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
                  </a>
                </Button>
              ) : (
                <Button size="xl" variant="inverse" disabled>
                  Applications closed
                </Button>
              )}
              <Button asChild size="xl" variant="inverse-outline">
                <a href={siteConfig.mailingListUrl}>
                  <Mail />
                  Get updates
                </a>
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
