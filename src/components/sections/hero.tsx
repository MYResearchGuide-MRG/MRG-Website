import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NeuronBackdrop } from "./backdrops/neuron-backdrop"
import { easeOutExpo } from "@/components/motion/variants"
import {
  heroStats,
  isRegistrationOpen,
  registrationCutoff,
  siteConfig,
} from "@/lib/site"

/** Remaining time to the cutoff as days + HH:MM:SS, floored so it never shows 60. */
function formatCountdown(now: Date) {
  const total = Math.max(
    0,
    Math.floor((new Date(registrationCutoff).getTime() - now.getTime()) / 1000)
  )
  const d = Math.floor(total / 86400)
  const hh = String(Math.floor((total % 86400) / 3600)).padStart(2, "0")
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0")
  const ss = String(total % 60).padStart(2, "0")
  return `${d}d ${hh}:${mm}:${ss}`
}

export function Hero() {
  const reduced = useReducedMotion()

  // Ticks every second while registrations are open, so the countdown stays
  // live and the CTA flips to closed the moment the window ends — no refresh.
  const [now, setNow] = React.useState(() => new Date())
  const registrationOpen = isRegistrationOpen(now)

  React.useEffect(() => {
    if (!registrationOpen) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [registrationOpen])

  const stats = registrationOpen
    ? heroStats
    : heroStats.map((stat) =>
        stat.label === "Applications Close"
          ? { label: "Applications", value: "Closed" }
          : stat
      )

  const fade = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.7, ease: easeOutExpo },
        }

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pt-32 pb-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <NeuronBackdrop />
      </div>

      <div className="relative container flex flex-1 flex-col items-center justify-center pb-16 text-center">
        {/* Display headline. Its own entrance — scale+fade rather than the
            plain fade() used below — since it's the hero's signature mark,
            not another line of supporting copy. */}
        <motion.h1
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.3, ease: easeOutExpo }}
        >
          {/* The heading is a wordmark image, so the page's most important
              heading carried no actual text — search engines had only the alt
              attribute to work from. The real heading now lives in text and the
              logo is decorative, which also stops screen readers announcing the
              same name twice. sr-only does not affect layout. */}
          <span className="sr-only">
            Malaysia Science Scholar&rsquo;s Programme (MYSSP) 2026 &mdash;
            science research mentorship for Malaysian pre-university students
          </span>
          <img
            src={siteConfig.programmeLogoUrl}
            alt=""
            aria-hidden="true"
            width={1728}
            height={431}
            className="h-auto w-full max-w-xl invert dark:invert-0"
          />
        </motion.h1>

        <motion.p
          className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:mt-10"
          {...fade(0.5)}
        >
          Welcome to the Malaysia Science Scholar&rsquo;s Programme (MYSSP),
          Malaysia&rsquo;s first science research programme for pre-university
          students. MYSSP, crafted by{" "}
          <a
            href={siteConfig.mainSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link-wipe text-foreground"
          >
            MYResearchGuide
          </a>
          , is an 8-week free mentorship programme pairing students with
          experienced researchers under a selection of STEM-based projects.
        </motion.p>

        {/* <motion.p
          className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground md:mx-auto"
          {...fade(0.55)}
        >
          For further information, refer to our participant information pack
          below. Applications close September 10th.
        </motion.p> */}

        {registrationOpen && (
          <motion.p
            className="label-micro mt-8 text-muted-foreground tabular-nums"
            {...fade(0.55)}
          >
            Applications close in{" "}
            <span className="text-foreground">
              {formatCountdown(now)}
            </span>
          </motion.p>
        )}

        <motion.div
          className="mt-10 flex flex-wrap flex-col gap-3 sm:flex-row sm:items-center sm:justify-center"
          {...fade(0.6)}
        >
          {registrationOpen ? (
            <Button asChild size="lg" className="group">
              <a href={siteConfig.applicationFormUrl}>
                Apply now
                <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
              </a>
            </Button>
          ) : (
            <Button size="lg" disabled>
              Applications closed
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className="group">
            <a href="#projects">
              Browse projects
              <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="group">
            <a
              href={siteConfig.infopackUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Infopack
              <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
            </a>
          </Button>
        </motion.div>
      </div>

      {/* Hairline stat row */}
      <motion.div
        className="relative border-t border-border bg-background/60 backdrop-blur-sm"
        {...fade(0.75)}
      >
        <div className="container">
          <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stats.map((stat) => (
              <div key={stat.label} className="py-6 text-center md:py-8">
                <dd className="font-display text-2xl leading-none md:text-3xl">
                  {stat.value}
                </dd>
                <dt className="label-micro mt-3 text-muted-foreground">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </motion.div>
    </section>
  )
}
