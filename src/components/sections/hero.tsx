import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MaskedLines } from "@/components/motion/reveal"
import { HeroBackdrop } from "./backdrops"
import { BACKDROPS } from "./backdrops/registry"
import { easeOutExpo } from "@/components/motion/variants"
import { heroStats, siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

export function Hero() {
  const reduced = useReducedMotion()
  const [backdrop, setBackdrop] = React.useState(0)
  const current = BACKDROPS[backdrop % BACKDROPS.length]
  const next = BACKDROPS[(backdrop + 1) % BACKDROPS.length]
  const cycle = () => setBackdrop((i) => (i + 1) % BACKDROPS.length)
  const Figure = current.Figure

  /* Backdrops that own a right-half figure keep the original two-column
     layout, because centred text would run straight under the figure. The
     figure-less ones (neuron, waves, words) centre the whole stack. */
  const centred = !Figure

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
      <HeroBackdrop variant={current.id} />

      <div
        className={cn(
          "relative container flex-1 pb-16 md:flex md:flex-col md:justify-center",
          centred && "md:items-center md:text-center"
        )}
      >
        {/* Each variant owns the figure that fills the right half, so cycling
            swaps the figure out with the backdrop. */}
        <AnimatePresence mode="wait">
          {Figure && (
            <motion.div
              key={current.id}
              className="absolute top-1/2 right-0 hidden w-[26rem] -translate-y-1/2 lg:block xl:w-[30rem]"
              initial={reduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45, ease: easeOutExpo }}
            >
              <button
                type="button"
                onClick={cycle}
                className="block w-full cursor-pointer rounded-full transition-opacity duration-300 hover:opacity-75 focus-visible:opacity-75"
                aria-label={`Switch hero background to ${next.label}`}
              >
                <React.Suspense fallback={<div className="aspect-square w-full" />}>
                  <Figure />
                </React.Suspense>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kicker */}
        <motion.div
          className={cn(
            "flex flex-wrap items-center gap-3 sm:gap-4",
            centred && "md:justify-center"
          )}
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
        <h1 className="display-xl mt-8 md:mt-10">
          <MaskedLines lines={["Malaysia Science", "Scholar’s Programme"]} />
        </h1>

        <motion.p
          className={cn(
            "mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:mt-10",
            centred && "md:mx-auto"
          )}
          {...fade(0.5)}
        >
          Welcome to the Malaysia Science Scholar&rsquo;s Programme (MYSSP),
          Malaysia&rsquo;s first science research programme for pre-university
          students. MYSSP, crafted by MYResearchGuide, is an 8-week free
          mentorship programme pairing students with experienced researchers
          under a selection of STEM-based projects.
        </motion.p>

        <motion.p
          className={cn(
            "mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground",
            centred && "md:mx-auto"
          )}
          {...fade(0.55)}
        >
          For further information, refer to our participant information pack
          below. Applications close September 10th.
        </motion.p>

        <motion.div
          className={cn(
            "mt-10 flex flex-col gap-3 sm:flex-row sm:items-center",
            centred && "md:justify-center"
          )}
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

        {/* Backdrop control. Each tick selects its variant directly — with six
            of them, cycle-only would mean up to five clicks to compare two. */}
        <motion.div
          className={cn(
            "mt-10 flex flex-wrap items-center gap-x-4 gap-y-3",
            centred && "md:justify-center"
          )}
          {...fade(0.9)}
        >
          <span className="label-micro w-20 text-muted-foreground">
            {current.label}
          </span>
          <div role="group" aria-label="Hero background" className="flex gap-1.5">
            {BACKDROPS.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBackdrop(i)}
                aria-label={b.label}
                aria-pressed={b.id === current.id}
                className="group/tick p-1.5"
              >
                <span
                  className={cn(
                    "block h-px w-6 transition-colors duration-300",
                    b.id === current.id
                      ? "bg-foreground"
                      : "bg-border group-hover/tick:bg-[var(--color-accent-warm)]"
                  )}
                />
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Hairline stat row */}
      <motion.div
        className="relative border-t border-border bg-background/60 backdrop-blur-sm"
        {...fade(0.75)}
      >
        <div className="container">
          <dl className="grid grid-cols-1 sm:grid-cols-3">
            {heroStats.map((stat, i) => (
              <div
                key={stat.label}
                className={cn(
                  "py-6 md:py-8",
                  // Stacked on mobile: a rule between rows, none above the first
                  i > 0 && "border-t border-border sm:border-t-0",
                  // 3-up from sm: divider before every cell but the first
                  "sm:border-l sm:border-border sm:pl-6",
                  i === 0 && "sm:border-l-0 sm:pl-0"
                )}
              >
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
