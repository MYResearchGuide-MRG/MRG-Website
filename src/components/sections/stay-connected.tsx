import { ArrowUpRight, Mail } from "lucide-react"

import { Reveal } from "@/components/motion/reveal"
import { HalftoneBackdrop } from "./backdrops/halftone-backdrop"
import { siteConfig } from "@/lib/site"
import styles from "./stay-connected.module.css"

/**
 * Mailing-list sign-up, styled after MYResearchGuide's community invitation:
 * a black banner over a drifting halftone, a two-tone heading on the left and
 * one white action on the right. Shown all year: between cohorts it is the one
 * thing a visitor can do, and during applications it still catches people not
 * ready to apply yet.
 */
export function StayConnected() {
  return (
    <section className="section-y" aria-labelledby="stay-connected-title">
      <div className="container">
        <Reveal className={styles.banner}>
          <HalftoneBackdrop />
          <div className={styles.content}>
            <h2 id="stay-connected-title" className={styles.title}>
              Curious about the next cohort?
              <span>Stay in the loop.</span>
            </h2>
            <div className={styles.actions}>
              <a
                href={siteConfig.mailingListUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primary}
              >
                <Mail size={18} aria-hidden />
                Join the mailing list
                <ArrowUpRight size={16} aria-hidden />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
