import { motion, useReducedMotion } from "motion/react"

import { RevealGroup, RevealItem } from "@/components/motion/reveal"
import { partners } from "@/data/competition-data"
import { siteConfig } from "@/lib/site"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function Partners() {
  const { theme } = useTheme()
  const reduced = useReducedMotion()

  return (
    <section className="border-t border-border py-16 md:py-20">
      <div className="container">
        <RevealGroup className="flex flex-col items-center gap-10 md:flex-row md:justify-between md:gap-16">
          <RevealItem className="shrink-0">
            <p className="label-micro max-w-[14rem] text-center text-muted-foreground md:text-left">
              Delivered in partnership with
            </p>
          </RevealItem>

          <RevealItem className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8 md:justify-end">
            {partners.map((partner) => {
              const isMrg = partner.name === "MYResearchGuide"
              const src = isMrg
                ? theme === "dark"
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
                  <img
                    src={src}
                    alt={partner.name}
                    loading="lazy"
                    className={cn(
                      "w-auto object-contain opacity-55 transition-opacity duration-300 hover:opacity-100",
                      // Cap height is per-partner: see the note on `partners`.
                      partner.cap,
                      !isMrg && "logo-plate grayscale"
                    )}
                  />
                </motion.a>
              )
            })}
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  )
}
