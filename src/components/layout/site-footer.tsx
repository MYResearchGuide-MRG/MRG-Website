import { contactMailto, navItems, siteConfig } from "@/lib/site"

const resourceLinks = [
  { label: "Main website", href: siteConfig.mainSiteUrl, external: true },
  { label: "Mailing list", href: siteConfig.mailingListUrl, external: true },
  { label: "Apply", href: siteConfig.applicationFormUrl, external: true },
  { label: "Contact", href: contactMailto, external: false },
]

export function SiteFooter() {
  return (
    <footer className="overflow-hidden border-t border-border">
      <div className="container pt-20 pb-10">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:gap-24">
          <div className="max-w-sm">
            <p className="label-micro text-muted-foreground">MYSSP 2026</p>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Malaysia&rsquo;s #1 research programme for pre-university students.
            </p>
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
