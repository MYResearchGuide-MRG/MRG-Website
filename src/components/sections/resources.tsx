import { ArrowUpRight, FileText, PanelsTopLeft, type LucideIcon } from "lucide-react"
import { Reveal } from "@/components/motion/reveal"

import styles from "./resources.module.css"

type ResourceLink = {
  label: string
  href: string
  platform: string
  icon: LucideIcon
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
        platform: "Google Docs",
        icon: FileText,
        href: "https://docs.google.com/document/d/1LkH0IUbS3c6RUpmnt_d95C1QCiYTAh88mH1R7GMbzLk/edit?usp=sharing",
      },
      {
        label: "Demo Day Slides Content Guidelines",
        platform: "Canva",
        icon: PanelsTopLeft,
        href: "https://canva.link/contentguidelinemyssp2026",
      },
      {
        label: "Demo Day Slides Template",
        platform: "Canva",
        icon: PanelsTopLeft,
        href: "https://canva.link/8rrag9g0rffl73v",
      },
    ],
  },
  {
    title: "Research Write-ups Materials",
    links: [
      {
        label: "Research Write-ups Guidelines",
        platform: "Google Docs",
        icon: FileText,
        href: "https://docs.google.com/document/d/1WHRzQ3t9Xy1Jkkp0DL20q70b6_437pXqs1vohcWY0rI/edit?usp=sharing",
      },
      {
        label: "Research Write-ups Template (Overleaf)",
        platform: "Overleaf",
        icon: FileText,
        href: "https://www.overleaf.com/read/mzbpvwfjszry#6fd3b0",
      },
    ],
  },
  {
    title: "Judging rubric",
    links: [
      {
        label: "Demo Day Judging Rubrics",
        platform: "Google Docs",
        icon: FileText,
        href: "https://docs.google.com/document/d/1n3VA7un4CZ7THHeRjW_6qN6YSI0C3-lmlL3f3mR8Tz4/edit?usp=sharing",
      },
    ],
  },
]

export function Resources() {
  return (
    <section className={styles.page} aria-labelledby="resources-heading">
      <div className={styles.container}>
        <Reveal as="header" className={styles.intro}>
          <h1 id="resources-heading">Resources</h1>
          <p>Guidelines and templates for MYSSP 2026.</p>
        </Reveal>

        <div className={styles.groups}>
          {resourceGroups.map((group, index) => (
            <Reveal as="section" key={group.title} aria-labelledby={`resource-group-${index}`}>
              <h2 id={`resource-group-${index}`} className={styles.groupTitle}>
                {group.title}
              </h2>
              <div className={styles.links}>
                {group.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.card}
                  >
                    <span className={styles.cardTop}>
                      <span className={styles.platform}>
                        <link.icon size={18} strokeWidth={1.5} aria-hidden="true" />
                        {link.platform}
                      </span>
                      <ArrowUpRight className={styles.arrow} size={18} aria-hidden="true" />
                    </span>
                    <span className={styles.cardTitle}>{link.label}</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
