export const siteConfig = {
  mainSiteUrl: "https://www.myresearchguide.org/",
  mailingListUrl: "https://forms.gle/Sk9JS3kcKe8qw1cU6",
  applicationFormUrl: "https://forms.gle/M4dHMyq5dXSGEHXT6",
  contactEmail: "myresearchguide.org@gmail.com",
  darkLogoUrl: "https://www.myresearchguide.org/MRG1W.png",
  lightLogoUrl: "/mrg-logo-inverted.png",
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
  { label: "Confirmed Projects", value: "11" },
  { label: "Research Tracks", value: "5" },
] as const
