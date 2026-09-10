export const siteConfig = {
  mainSiteUrl: "https://www.myresearchguide.org/",
  mailingListUrl: "https://forms.gle/Sk9JS3kcKe8qw1cU6",
  applicationFormUrl: "https://forms.gle/fkaLs78uJuGnu7Kw7",
  contactEmail: "myresearchguide.org@gmail.com",
  darkLogoUrl: "/mrg-wordmark.png",
  lightLogoUrl: "/mrg-logo-inverted.png",
  programmeLogoUrl: "/myssp-logo.png",
  organiserLogoUrl: "/mrg-wordmark.png",
  infopackUrl:
    "https://docs.google.com/document/d/1C1uiwF5dlF23-1afMXPaueQCmacDuIg-aePrMAQUzMY/edit?usp=sharing",
  codeOfConductUrl:
    "https://docs.google.com/document/d/1gKMMqH_pu_H3xZAAuOzV-JVIZde9qhlnc1OBasOP1ho/edit?tab=t.0",
} as const

/**
 * Registrations close at midnight at the end of 10 September 2026 (MYT, UTC+8),
 * i.e. 2026-09-11T00:00:00+08:00. Kept as an explicit offset so the cutoff is
 * stable regardless of the visitor's timezone.
 */
export const registrationCutoff = "2026-09-11T00:00:00+08:00"

export function isRegistrationOpen(now = new Date()): boolean {
  return now.getTime() < new Date(registrationCutoff).getTime()
}

export const contactMailto = `mailto:${siteConfig.contactEmail}?subject=MYSSP%20Question`

export const navItems = [
  { label: "Projects", href: "#projects" },
  { label: "Eligibility", href: "#eligibility" },
  { label: "Timeline", href: "#timeline" },
  { label: "FAQ", href: "#faq" },
] as const

export const heroStats = [
  { label: "Applications Close", value: "10 Sept" },
  { label: "Confirmed Projects", value: "12" },
  { label: "Research Tracks", value: "6" },
] as const
