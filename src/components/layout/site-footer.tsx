import type { SVGProps } from "react"
import { Mail } from "lucide-react"

import { contactMailto, navItems, siteConfig } from "@/lib/site"

function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0 -2 -2 2 2 0 0 0 -2 2v7h-4v-7a6 6 0 0 1 6 -6z" />
      <path d="M2 9h4v12h-4z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3" />
      <path d="M16.5 7.5v.001" />
    </svg>
  )
}

const socialLinks = [
  {
    label: "MYResearchGuide on LinkedIn",
    href: "https://www.linkedin.com/company/myresearchguide/",
    icon: LinkedinIcon,
  },
  {
    label: "MYResearchGuide on Instagram",
    href: "https://www.instagram.com/myresearchguide?igsh=MWo3bHlwNGZ3ODU5aw%3D%3D&utm_source=qr",
    icon: InstagramIcon,
    note: "Main account",
  },
  {
    label: "MYSSP on Instagram",
    href: "https://www.instagram.com/myssp.official?igsh=MXR4NGUweDdjNGxkcw%3D%3D&utm_source=qr",
    icon: InstagramIcon,
    note: "MYSSP account",
  },
  {
    label: "Email MYResearchGuide",
    href: contactMailto,
    icon: Mail,
  },
]

const resourceLinks = [
  { label: "Main website", href: siteConfig.mainSiteUrl, external: true },
  { label: "Mailing list", href: siteConfig.mailingListUrl, external: true },
  { label: "Apply", href: siteConfig.applicationFormUrl, external: true },
  { label: "Contact", href: contactMailto, external: false },
  {
    label: "Code of Conduct",
    href: siteConfig.codeOfConductUrl,
    external: true,
  },
]

export function SiteFooter() {
  return (
    <footer className="overflow-hidden border-t border-border">
      <div className="container pt-20 pb-10">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:gap-24">
          <div className="max-w-sm">
            <p className="label-micro text-muted-foreground">MYSSP 2026</p>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Malaysia&rsquo;s #1 science research programme for pre-university students.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {socialLinks.map((link) => {
                const external = link.href.startsWith("http")
                const Icon = link.icon
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    aria-label={link.label}
                    title={link.label}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="group flex items-center gap-1.5"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:text-foreground">
                      <Icon className="size-4" />
                    </span>
                    {link.note && (
                      <span className="text-xs whitespace-nowrap text-muted-foreground transition-colors group-hover:text-foreground">
                        ({link.note})
                      </span>
                    )}
                  </a>
                )
              })}
            </div>
          </div>

          <nav>
            <h2 className="label-micro text-muted-foreground">Sections</h2>
            <ul className="mt-5 space-y-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="link-wipe text-sm">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav>
            <h2 className="label-micro text-muted-foreground">Elsewhere</h2>
            <ul className="mt-5 space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="link-wipe text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="label-micro mt-20 text-muted-foreground">
          &copy; 2026 MYResearchGuide &middot; Malaysia Science Scholar&rsquo;s
          Programme
        </p>
      </div>

      {/* Oversized wordmark, spanning the container at any viewport width. */}
      <div aria-hidden className="container pb-6">
        <img
          src={siteConfig.organiserLogoUrl}
          alt=""
          width={960}
          height={95}
          className="h-auto w-full select-none invert dark:invert-0"
        />
      </div>
    </footer>
  )
}
