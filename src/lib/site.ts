export const siteConfig = {
  mainSiteUrl: "https://www.myresearchguide.org/",
  mailingListUrl: "https://forms.gle/Sk9JS3kcKe8qw1cU6",
  applicationFormUrl: "https://forms.gle/M4dHMyq5dXSGEHXT6",
  contactEmail: "myresearchguide.org@gmail.com",
  darkLogoUrl: "https://www.myresearchguide.org/MRG1W.png",
  lightLogoUrl: "/mrg-logo-inverted.png",
  programmeLogoUrl: "/myssp-logo.png",
  organiserLogoUrl: "/mrg-wordmark.png",
  infopackUrl:
    "https://docs.google.com/document/d/1C1uiwF5dlF23-1afMXPaueQCmacDuIg-aePrMAQUzMY/edit?usp=sharing",
  codeOfConductUrl:
    "https://docs.google.com/document/d/1gKMMqH_pu_H3xZAAuOzVJ-VIZde9qhlnc1OBasOP1ho/edit?tab=t.0",
} as const

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
