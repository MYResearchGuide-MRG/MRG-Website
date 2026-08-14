import { motion, useReducedMotion } from "motion/react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NeuronBackdrop } from "./backdrops/neuron-backdrop"
import { easeOutExpo } from "@/components/motion/variants"
import { heroStats, siteConfig } from "@/lib/site"

export function Hero() {
  const reduced = useReducedMotion()

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

      <div className="relative container flex-1 pb-16 md:flex md:flex-col md:items-center md:justify-center md:text-center">
        {/* Kicker */}
        <motion.div
          className="flex flex-wrap items-center gap-3 sm:gap-4 md:justify-center"
          {...fade(0.05)}
        >
          <span className="label-micro text-muted-foreground">
            MYResearchGuide
          </span>
          <motion.span
            aria-hidden
            className="h-px w-10 origin-left bg-border sm:w-16"
            initial={reduced ? undefined : { scaleX: 0 }}
            animate={reduced ? undefined : { scaleX: 1 }}
            transition={{ delay: 0.25, duration: 0.8, ease: easeOutExpo }}
          />
          <span className="label-micro text-muted-foreground">MYSSP 2026</span>
        </motion.div>

        {/* Display headline */}
        <h1 className="mt-8 md:mt-10">
          <img
            src={siteConfig.programmeLogoUrl}
            alt="Malaysia Science Scholar's Programme"
            width={1728}
            height={431}
            className="h-auto w-full max-w-xl invert dark:invert-0"
          />
        </h1>

        <motion.p
          className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:mt-10 md:mx-auto"
          {...fade(0.5)}
        >
          Welcome to the Malaysia Science Scholar&rsquo;s Programme (MYSSP),
          Malaysia&rsquo;s first science research programme for pre-university
          students. MYSSP, crafted by MYResearchGuide, is an 8-week free
          mentorship programme pairing students with experienced researchers
          under a selection of STEM-based projects.
        </motion.p>

        <motion.p
          className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground md:mx-auto"
          {...fade(0.55)}
        >
          For further information, refer to our participant information pack
          below. Applications close September 10th.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center md:justify-center"
          {...fade(0.6)}
        >
          <Button asChild size="lg" className="group">
            <a href={siteConfig.applicationFormUrl}>
              Apply now
              <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="group">
            <a href="#projects">
              Browse projects
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
            {heroStats.map((stat) => (
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
