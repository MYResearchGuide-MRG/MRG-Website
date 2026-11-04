import { ArrowUpRight, Mail } from "lucide-react"

import {
  DiscordIcon,
  InstagramIcon,
  LinkedinIcon,
  TikTokIcon,
} from "@/components/layout/social-icons"
import { MysspLogo } from "@/components/layout/myssp-logo"
import { homeRouteHash } from "@/lib/results"
import { contactMailto, navItems, siteConfig } from "@/lib/site"

const socialLinks = [
  {
    label: "MYResearchGuide on Instagram",
    href: "https://www.instagram.com/myresearchguide",
    icon: InstagramIcon,
  },
  {
    label: "MYSSP on Instagram",
    href: "https://www.instagram.com/myssp.official",
    icon: InstagramIcon,
  },
  {
    label: "MYResearchGuide on TikTok",
    href: "https://www.tiktok.com/@myresearchguide",
    icon: TikTokIcon,
  },
  {
    label: "MYResearchGuide on LinkedIn",
    href: "https://www.linkedin.com/company/myresearchguide/",
    icon: LinkedinIcon,
  },
  {
    label: "MYResearchGuide on Discord",
    href: siteConfig.discordUrl,
    icon: DiscordIcon,
  },
  { label: "Email MYResearchGuide", href: contactMailto, icon: Mail },
]

const linkGroups = [
  { title: "MYSSP 2026", links: navItems.map(({ label, href }) => ({ label, href })) },
  {
    title: "MYResearchGuide",
    links: [
      { label: "Main website", href: siteConfig.mainSiteUrl },
      { label: "Research Handbook", href: siteConfig.handbookUrl },
      { label: "Code of Conduct", href: siteConfig.codeOfConductUrl },
    ],
  },
  {
    title: "Get in touch",
    links: [
      { label: "Contact Us", href: contactMailto },
      { label: "Mailing List", href: siteConfig.mailingListUrl },
      { label: "All our links", href: siteConfig.linktreeUrl },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border text-muted-foreground max-[700px]:mt-14">
      <div className="mx-auto max-w-[1440px] px-6 pt-11 pb-6 min-[701px]:px-8 min-[701px]:pt-16 min-[701px]:pb-7 min-[1101px]:px-12 min-[1101px]:pt-[76px] min-[1101px]:pb-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 min-[701px]:grid-cols-[1.6fr_1fr_1fr] min-[701px]:gap-x-8 min-[701px]:gap-y-10 min-[1101px]:grid-cols-[minmax(280px,1.8fr)_repeat(3,minmax(0,1fr))] min-[1101px]:gap-14">
          <div className="col-span-full min-w-0 min-[701px]:col-span-1 min-[701px]:row-span-2 min-[1101px]:row-span-1">
            <a href={homeRouteHash} aria-label="MYSSP home" className="inline-block max-w-full">
              <MysspLogo className="h-auto w-[200px] max-w-full" />
            </a>
            <a
              href={siteConfig.mainSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-fit items-baseline gap-1 text-xs transition-colors hover:text-foreground"
            >
              by MYResearchGuide
              <ArrowUpRight className="size-3 shrink-0 self-center opacity-50" aria-hidden />
            </a>
            <p className="mt-5 mb-[18px] max-w-[310px] text-sm leading-[1.75] min-[701px]:max-w-[285px]">
              Malaysia&rsquo;s #1 science research programme for pre-university
              students.
            </p>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="text-[13px] leading-relaxed [overflow-wrap:anywhere] transition-colors hover:text-foreground"
            >
              {siteConfig.contactEmail}
            </a>
            <nav aria-label="Social media" className="mt-[18px] -ml-2.5 flex items-center gap-1.5">
              {socialLinks.map(({ label, href, icon: Icon }) => {
                const external = href.startsWith("http")
                return (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    title={label}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="flex size-10 items-center justify-center transition-colors hover:text-foreground"
                  >
                    <Icon className="size-[19px]" />
                  </a>
                )
              })}
            </nav>
          </div>

          {linkGroups.map(({ title, links }) => (
            <nav key={title} aria-label={`Footer ${title}`}>
              <h2 className="mb-4 text-sm leading-relaxed font-medium text-foreground min-[701px]:mb-[22px]">
                {title}
              </h2>
              <ul className="grid gap-3 min-[701px]:gap-3.5">
                {links.map(({ label, href }) => {
                  const external = href.startsWith("http")
                  return (
                    <li key={label}>
                      <a
                        href={href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer" : undefined}
                        className="inline-flex items-baseline gap-[5px] text-[13px] leading-relaxed transition-colors hover:text-foreground min-[701px]:text-sm"
                      >
                        {label}
                        {external && (
                          <ArrowUpRight className="size-3 shrink-0 opacity-50" aria-hidden />
                        )}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-1.5 border-t border-border pt-[22px] text-xs leading-[1.7] min-[701px]:mt-16 min-[701px]:flex-row min-[701px]:flex-wrap min-[701px]:justify-between min-[701px]:gap-x-6 min-[701px]:gap-y-3 min-[701px]:pt-7">
          <p>&copy; 2026 MYResearchGuide. All rights reserved.</p>
          <p>By Malaysians, for Malaysians.</p>
        </div>

        {/* Long wordmark fading into the footer. */}
        <div
          aria-hidden
          className="pointer-events-none mt-10 w-full opacity-[0.38] select-none [mask-image:linear-gradient(to_bottom,#000_0%,rgb(0_0_0/0.65)_40%,transparent_100%)] min-[701px]:mt-[60px]"
        >
          <img
            src={siteConfig.organiserLogoUrl}
            alt=""
            width={960}
            height={95}
            draggable={false}
            className="block h-auto w-full invert dark:invert-0"
          />
        </div>
      </div>
    </footer>
  )
}
