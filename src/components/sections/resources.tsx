import { ExternalLink } from "lucide-react"

type ResourceLink = {
  label: string
  href: string
}

type ResourceGroup = {
  title: string
  links: ResourceLink[]
}

const resourceGroups: ResourceGroup[] = [
  {
    title: "MYSSP Demo Day Presentation Materials",
    links: [
      {
        label: "Demo Day Presentation Guidelines",
        href: "https://docs.google.com/document/d/1LkH0IUbS3c6RUpmnt_d95C1QCiYTAh88mH1R7GMbzLk/edit?usp=sharing",
      },
      {
        label: "Demo Day Slides Content Guidelines",
        href: "https://canva.link/contentguidelinemyssp2026",
      },
      {
        label: "Demo Day Slides Template",
        href: "https://canva.link/8rrag9g0rffl73v",
      },
    ],
  },
  {
    title: "Research Write-ups Materials",
    links: [
      {
        label: "Research Write-ups Guidelines",
        href: "https://docs.google.com/document/d/1WHRzQ3t9Xy1Jkkp0DL20q70b6_437pXqs1vohcWY0rI/edit?usp=sharing",
      },
      {
        label: "Research Write-ups Template (Overleaf)",
        href: "https://www.overleaf.com/read/mzbpvwfjszry#6fd3b0",
      },
    ],
  },
  {
    title: "Judging rubric",
    links: [
      {
        label: "Demo Day Judging Rubrics",
        href: "https://docs.google.com/document/d/1n3VA7un4CZ7THHeRjW_6qN6YSI0C3-lmlL3f3mR8Tz4/edit?usp=sharing",
      },
    ],
  },
]

export function Resources() {
  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className="container max-w-5xl">
        <p className="label-micro text-muted-foreground">MYSSP 2026</p>
        <h1 className="display-lg mt-5">Resources</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Official guides and templates for preparing your Demo Day presentation,
          write-up, and final submission.
        </p>

        <div className="mt-16 space-y-14">
          {resourceGroups.map((group) => (
            <section key={group.title}>
              <div className="border-b border-border pb-4">
                <h2 className="font-display text-3xl tracking-tight md:text-4xl">
                  {group.title}
                </h2>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex min-h-28 flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground hover:bg-muted"
                  >
                    <span className="text-base font-medium leading-snug">{link.label}</span>
                    <ExternalLink className="mt-6 size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}
