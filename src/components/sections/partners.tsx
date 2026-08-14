import { motion, useReducedMotion } from "motion/react"

import { RevealGroup, RevealItem } from "@/components/motion/reveal"
import { partners } from "@/data/competition-data"
import { siteConfig } from "@/lib/site"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function Partners() {
  const { resolvedTheme } = useTheme()
  const reduced = useReducedMotion()

  return (
    <section className="border-t border-border py-16 md:py-20">
      <div className="container">
        <RevealGroup className="flex flex-col items-center gap-10">
          <RevealItem>
            <p className="label-micro text-center text-muted-foreground">
              A MYResearchGuide flagship programme, with
            </p>
          </RevealItem>

          <RevealItem className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
            {partners.map((partner) => {
              const isMrg = partner.name === "MYResearchGuide"
              const src = isMrg
                ? resolvedTheme === "dark"
                  ? siteConfig.darkLogoUrl
                  : siteConfig.lightLogoUrl
                : partner.logo
              const external = partner.url.startsWith("http")

              return (
                <motion.a
                  key={partner.name}
                  href={partner.url}
                  title={partner.description}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="flex h-20 items-center"
                  whileHover={reduced ? undefined : { y: -3 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* UTAR and MABECS ship as opaque white-background JPEGs. In
                      colour they need that white to stay white, which a
                      dark-themed page will not give them — so they sit on their
                      own plate. MRG has a real light/dark pair and needs none. */}
                  <span
                    className={cn(
                      "flex items-center transition-opacity duration-300",
                      isMrg
                        ? "opacity-90 hover:opacity-100"
                        : "rounded-md bg-white px-4 py-2 opacity-90 hover:opacity-100"
                    )}
                  >
                    <img
                      src={src}
                      alt={partner.name}
                      loading="lazy"
                      // Cap height is per-partner: see the note on `partners`.
                      className={cn("w-auto object-contain", partner.cap)}
                    />
                  </span>
                </motion.a>
              )
            })}
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  )
}
