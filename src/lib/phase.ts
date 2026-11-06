import * as React from "react"

import { registrationCutoff, siteConfig } from "@/lib/site"
import { resultsRouteHash, selectionAnnouncementDate } from "@/lib/results"

/**
 * Where the programme is right now, picked from the clock rather than set by
 * hand. The hero's status line and lead button used to be hard-coded, and
 * "Applications in review" outlived the review by two months. Every other
 * section on the home page is phase-independent, so this list is the only
 * thing that needs touching from one cohort to the next.
 *
 * All moments are MYT (UTC+8) with an explicit offset, like the cutoffs they
 * sit beside, so a phase flips at the same instant for every visitor.
 */
export type Phase = {
  id:
    | "applications"
    | "review"
    | "research"
    | "demo-day"
    | "wrapped"
    | "off-season"
  /** Phase ends at this moment; the last phase has none. */
  until?: string
  /** One-line "where things stand", shown above the lead button. */
  note: string
  /** Lead hero button. Omitted during review, when the countdown takes its place. */
  cta?: { label: string; href: string; external?: boolean }
}

export const phases: Phase[] = [
  {
    id: "applications",
    until: registrationCutoff,
    note: "Applications for the 2026 cohort are now open.",
    cta: {
      label: "Apply now",
      href: siteConfig.applicationFormUrl,
      external: true,
    },
  },
  {
    id: "review",
    until: selectionAnnouncementDate,
    note: "Applications are closed and under review.",
  },
  {
    id: "research",
    until: "2026-11-19T00:00:00+08:00",
    note: "The current cohort is now in the research phase of the programme.",
    cta: { label: "Meet the cohort", href: resultsRouteHash },
  },
  {
    id: "demo-day",
    until: "2026-11-29T00:00:00+08:00",
    note: "Projects are in. The cohort presents at Demo Day on 28 November.",
    cta: { label: "Meet the cohort", href: resultsRouteHash },
  },
  {
    id: "wrapped",
    until: "2027-01-01T00:00:00+08:00",
    note: "MYSSP 2026 has wrapped up. Thank you to every scholar and mentor.",
    cta: { label: "See the awards", href: "#/awards" },
  },
  {
    id: "off-season",
    note: "Applications for the next cohort open soon.",
    cta: {
      label: "Get notified",
      href: siteConfig.mailingListUrl,
      external: true,
    },
  },
]

export function phaseAt(now: Date = new Date()): Phase {
  const t = now.getTime()
  return phases.find((p) => !p.until || t < new Date(p.until).getTime())!
}

/**
 * Current phase, rechecked every minute so an open tab flips at the boundary
 * without a refresh. Minute precision is plenty: no phase is shorter than a day.
 */
export function usePhase(): Phase {
  const [phase, setPhase] = React.useState(() => phaseAt())
  React.useEffect(() => {
    const id = window.setInterval(() => setPhase(phaseAt()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return phase
}
