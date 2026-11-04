import { motion, useReducedMotion } from "motion/react"

import { SlantLink } from "@/components/ui/slant-link"
import { CountdownPill } from "@/components/results-countdown"
import { CellsBackdrop } from "./backdrops/cells-backdrop"
import { easeOutExpo } from "@/components/motion/variants"
import { MysspLogo } from "@/components/layout/myssp-logo"
import { BookGlyph } from "@/components/icons/book-glyph"
import { siteConfig } from "@/lib/site"
import { usePhase } from "@/lib/phase"
export function Hero() {
  const reduced = useReducedMotion()
  const phase = usePhase()

  const fade = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.7, ease: easeOutExpo },
        }

  return (
    // The hero is an inset panel rather than a full-bleed band: a rounded card
    // a step darker than the page, so the page reads as sitting around it. It
    // starts a gutter below the header bar (62px, 70px from sm) rather than
    // butting against it, so it reads as a card floating on the page instead
    // of being cut off by the header, and shares the header's side gutter.
    // Its animated backdrop is dark in either theme, so the panel pins the
    // dark theme for its contents (the "dark" class).
    <section className="px-3 pt-[calc(62px+0.75rem)] pb-3 sm:px-6 sm:pt-[calc(70px+0.75rem)]">
      <div className="dark relative flex min-h-[calc(100svh-62px-1.5rem)] flex-col overflow-hidden rounded-2xl bg-[#162a2c] pt-16 text-foreground sm:min-h-[calc(100svh-70px-1.5rem)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <CellsBackdrop />
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
            <MysspLogo alt="" className="h-auto w-full max-w-xl" />
          </motion.h1>

          <motion.p
            className="mt-8 max-w-2xl text-[1.0625rem] leading-relaxed text-foreground md:mt-10 md:text-lg"
            {...fade(0.5)}
          >
            Welcome to the Malaysia Science Scholar&rsquo;s Programme (MYSSP),
            Malaysia&rsquo;s first science research programme for pre-university
            students.
            <br />
            Created by{" "}
            <a
              href={siteConfig.mainSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-wipe text-foreground"
            >
              MYResearchGuide
            </a>
            , MYSSP is an{" "}
            <strong className="font-semibold">
              8-week free mentorship programme pairing students with experienced
              researchers
            </strong>{" "}
            under a selection of STEM-based projects.
          </motion.p>

          {/* <motion.p
          className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground md:mx-auto"
          {...fade(0.55)}
        >
          For further information, refer to our participant information pack
          below. Applications close September 10th.
        </motion.p> */}

          {/* The status line and lead button are the only parts of the page
            that change with the programme phase. Everything else is the same
            all year. */}
          <motion.div
            className="mt-10 flex flex-col items-center gap-4"
            {...fade(0.6)}
          >
            <p className="inline-flex items-center gap-2 text-sm text-foreground">
              <BookGlyph className="size-4 shrink-0 text-white" />
              {phase.note}
            </p>
            {phase.cta ? (
              <SlantLink
                href={phase.cta.href}
                {...(phase.cta.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {phase.cta.label}
              </SlantLink>
            ) : (
              <CountdownPill />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
