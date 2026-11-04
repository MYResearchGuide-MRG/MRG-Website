import { motion, useReducedMotion } from "motion/react"

import { RevealGroup, RevealItem } from "@/components/motion/reveal"
import { partners } from "@/data/competition-data"
import { siteConfig } from "@/lib/site"

/**
 * Organiser credit and partner logos.
 *
 * MYResearchGuide runs the programme rather than partnering on it, so its
 * wordmark sits inside the heading line instead of in the logo row. Both
 * colourways are rendered and the theme class picks one, as with the MYSSP
 * logo, so there is no flash of the wrong one before the theme resolves.
 */
export function Partners() {
  const reduced = useReducedMotion()

  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <RevealGroup className="flex flex-col items-center gap-10">
          <RevealItem>
            <p className="label-micro flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-2 text-center text-muted-foreground">
              <span>A</span>
              <a
                href={siteConfig.mainSiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MYResearchGuide"
                className="inline-flex self-baseline opacity-90 transition-opacity hover:opacity-100"
              >
                <img
                  src={siteConfig.lightLogoUrl}
                  alt=""
                  className="block h-[14px] w-auto dark:hidden"
                />
                <img
                  src={siteConfig.darkLogoUrl}
                  alt=""
                  className="hidden h-[14px] w-auto dark:block"
                />
              </a>
              <span>flagship programme, with</span>
            </p>
          </RevealItem>

          <RevealItem className="flex flex-wrap justify-center gap-x-6 gap-y-8">
            {partners.map((partner) => (
              <motion.a
                key={partner.name}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-56 items-center justify-center"
                whileHover={reduced ? undefined : { y: -3 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  title={partner.description}
                  className="flex h-16 w-full items-center justify-center"
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    loading="lazy"
                    className={`w-auto max-w-full object-contain opacity-85 transition-opacity duration-300 group-hover:opacity-100 ${partner.cap}`}
                  />
                </span>
              </motion.a>
            ))}
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  )
}
