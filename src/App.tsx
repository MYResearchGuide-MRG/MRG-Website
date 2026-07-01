import { useEffect, type CSSProperties } from "react"

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Filter,
  GraduationCap,
  Landmark,
  Mail,
  MapPin,
  Search,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RevealStyle = CSSProperties & { "--reveal-index"?: number }

const mainSiteUrl = "https://www.myresearchguide.org/"
const mrgLogoUrl = "https://www.myresearchguide.org/MRG1W.png"
const mailingListUrl = "https://forms.gle/Sk9JS3kcKe8qw1cU6"
const applicationUrl =
  "mailto:myresearchguide.org@gmail.com?subject=MRG%20Research%20Competition%20Application"

const navItems = [
  { label: "Timeline", href: "#timeline" },
  { label: "Projects", href: "#projects" },
  { label: "Researchers", href: "#researchers" },
  { label: "Apply", href: "#apply" },
  { label: "FAQ", href: "#faq" },
]

const stats = [
  { label: "competition route", value: "2026" },
  { label: "mentor lanes", value: "External + UTAR" },
  { label: "project tracks", value: "5" },
]

const timeline = [
  {
    date: "June 28, 2026",
    title: "Competition Structure Established",
    body: "Navigation, programme structure, application directories, and content blocks are ready for confirmed details.",
    status: "complete",
  },
  {
    date: "July 2026",
    title: "Project Directory Opens",
    body: "Participants browse available projects, mentor categories, suggested prerequisites, and application routing.",
    status: "active",
  },
  {
    date: "August 2026",
    title: "Applicant Matching",
    body: "Teams indicate preferred project tracks and are routed toward external or UTAR researcher panels for review.",
    status: "upcoming",
  },
  {
    date: "September 2026",
    title: "Research Sprint Begins",
    body: "Selected cohorts move through guided milestones, check-ins, and evidence logs with MRG support.",
    status: "upcoming",
  },
  {
    date: "Final Showcase",
    title: "Panel Review and Recognition",
    body: "Researchers and partner organisations review outputs, select distinctions, and publish the showcase directory.",
    status: "upcoming",
  },
]

const tracks = [
  "All",
  "AI & Data",
  "BioScience",
  "Engineering",
  "Economics",
  "Policy",
]

const projects = [
  {
    id: "A-1",
    track: "AI & Data",
    title: "Machine Learning for Research Question Discovery",
    mentor: "External researcher panel",
    participants: "3-5",
    time: "5-7 hours/week",
    abstract:
      "Build a lightweight workflow for turning student curiosity into tractable research questions. The project can later expand into literature mapping, dataset discovery, and prompt-aided hypothesis refinement.",
    directory: "Apply through the AI & Data directory",
  },
  {
    id: "B-2",
    track: "BioScience",
    title: "Low-Cost Biology Research Pathways for Secondary Students",
    mentor: "UTAR and external life-science mentors",
    participants: "2-4",
    time: "4-6 hours/week",
    abstract:
      "Design a practical map of beginner-friendly wet-lab, dry-lab, and review-based project options for students without institutional lab access.",
    directory: "Apply through the BioScience directory",
  },
  {
    id: "E-3",
    track: "Engineering",
    title: "Robotics and Embedded Systems Outreach Modules",
    mentor: "UTAR engineering category",
    participants: "3-6",
    time: "6 hours/week",
    abstract:
      "Prototype a modular engineering research challenge where participants can document design constraints, test logs, and technical tradeoffs.",
    directory: "Apply through the Engineering directory",
  },
  {
    id: "C-4",
    track: "Economics",
    title: "Regional Research Access and Student Opportunity Gaps",
    mentor: "External social-science panel",
    participants: "2-5",
    time: "4 hours/week",
    abstract:
      "Investigate how Malaysian and regional students discover research opportunities, with an emphasis on transparent access, cost, and mentorship channels.",
    directory: "Apply through the Economics and Policy directory",
  },
  {
    id: "P-5",
    track: "Policy",
    title: "Open Research Ethics and Youth Publication Standards",
    mentor: "Mixed external and UTAR review panel",
    participants: "3-5",
    time: "5 hours/week",
    abstract:
      "Create a clear student-facing guide for ethical authorship, data handling, mentor credit, and public communication of early research work.",
    directory: "Apply through the Policy directory",
  },
]

const researcherGroups = [
  {
    label: "External Researchers",
    icon: GraduationCap,
    body: "International mentors, graduate researchers, and field specialists connected through the MYResearchGuide network.",
    people: [
      "AI safety and machine learning",
      "Bioengineering and data science",
      "Physics, mathematics, and materials",
    ],
  },
  {
    label: "UTAR Researchers",
    icon: Landmark,
    body: "UTAR-aligned academic reviewers and category mentors for local institutional continuity.",
    people: [
      "Engineering and robotics",
      "Life sciences and biotechnology",
      "Economics, policy, and community research",
    ],
  },
  {
    label: "Reviewer Bench",
    icon: Users,
    body: "A flexible panel used for application review, midpoint feedback, and final project recognition.",
    people: [
      "Methodology review",
      "Presentation and poster review",
      "Sponsor and partner review",
    ],
  },
]

const applicationDirectories = [
  {
    title: "Participant Applications",
    description: "For students applying into a project cohort.",
    items: [
      "Preferred tracks",
      "Background and prerequisites",
      "Portfolio or short statement",
    ],
  },
  {
    title: "Project Proposals",
    description: "For researchers proposing or refining project briefs.",
    items: ["Mentor category", "Time expectation", "Output and merge criteria"],
  },
  {
    title: "Sponsor and Partner Interest",
    description:
      "For organisations supporting prizes, judging, venues, or outreach.",
    items: [
      "Sponsor tier",
      "Organisation profile",
      "Preferred contribution lane",
    ],
  },
]

const organisations = [
  {
    label: "MYResearchGuide",
    type: "Host platform",
    description:
      "Student-led research guidance, interviews, and community infrastructure.",
  },
  {
    label: "UTAR",
    type: "Institutional research lane",
    description:
      "Local academic continuity for researcher panels, category review, and student pathways.",
  },
  {
    label: "Sponsors",
    type: "Awards and operations",
    description:
      "Prize funding, event support, research resources, and final showcase support.",
  },
  {
    label: "Partner Organisations",
    type: "Community reach",
    description:
      "Outreach partners, STEM societies, university communities, and field-specific groups.",
  },
]

const faqs = [
  {
    question: "Who can apply?",
    answer:
      "The competition is structured for secondary, pre-university, and early undergraduate students. Final eligibility details can be added once the organising team confirms the cohort scope.",
  },
  {
    question: "Can a team choose more than one project?",
    answer:
      "Yes. The application directory asks for ranked project preferences so reviewers can route applicants toward the best-fit mentor lane.",
  },
  {
    question: "Where do UTAR and external researchers appear?",
    answer:
      "The researcher panel separates external categories, UTAR categories, and flexible reviewers so confirmed names can be added without redesigning the page.",
  },
  {
    question: "How is this connected to MYResearchGuide?",
    answer:
      "The header, footer, and calls to action link directly back to the main MRG site and mailing-list flow. This microsite can be deployed as a competition route or linked from the main navigation.",
  },
  {
    question: "What still needs to be filled in later?",
    answer:
      "Final dates, application URLs, confirmed project mentors, sponsor logos, prize details, and official UTAR contact language are intentionally structured as editable content blocks.",
  },
]

function revealStyle(index: number): RevealStyle {
  return { "--reveal-index": index }
}

function useRevealMotion() {
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    )
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    )

    if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
      return
    }

    document.documentElement.dataset.motionReady = "true"

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          entry.target.setAttribute("data-revealed", "true")
          observer.unobserve(entry.target)
        })
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12,
      }
    )

    targets.forEach((target) => observer.observe(target))

    const revealAllTimer = window.setTimeout(() => {
      targets.forEach((target) => {
        target.setAttribute("data-revealed", "true")
        observer.unobserve(target)
      })
    }, 1400)

    return () => {
      window.clearTimeout(revealAllTimer)
      observer.disconnect()
      delete document.documentElement.dataset.motionReady
    }
  }, [])
}

function App() {
  useRevealMotion()

  const featuredProject = projects[0]

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header className="site-header sticky top-0 border-b border-border/70 bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/78">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <a
            className="flex items-center gap-3 no-underline"
            href={mainSiteUrl}
          >
            <span className="flex size-11 items-center justify-center rounded-md border border-border bg-foreground text-sm font-semibold text-background">
              MRG
            </span>
            <span className="flex flex-col">
              <span className="text-sm leading-tight font-semibold">
                MYResearchGuide
              </span>
              <span className="text-xs text-muted-foreground">
                Research Competition
              </span>
            </span>
          </a>
          <nav
            aria-label="Competition navigation"
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {item.label}
              </a>
            ))}
            <Button asChild size="sm" variant="outline">
              <a href={mainSiteUrl}>
                Main MRG
                <ExternalLink data-icon="inline-end" />
              </a>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="hero-dark relative overflow-hidden">
          <div className="hero-rule absolute inset-x-0 top-0 h-px bg-primary" />
          <div className="mx-auto grid min-h-[86dvh] max-w-7xl gap-10 px-4 py-16 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:py-24">
            <div className="flex flex-col gap-8">
              <div className="motion-rise dark-muted flex flex-wrap items-center gap-3 text-xs font-semibold tracking-[0.08em] uppercase">
                <span>MRG x UTAR research basecamp</span>
                <span className="h-px w-12 bg-primary" />
                <span>2026 programme</span>
              </div>
              <div className="flex flex-col gap-6">
                <h1 className="motion-rise motion-delay-1 max-w-4xl text-[clamp(3rem,9vw,7rem)] leading-[0.9] font-medium">
                  Research Competition Base Camp
                </h1>
                <p className="motion-rise motion-delay-2 dark-soft max-w-2xl text-lg leading-8">
                  A structured competition hub for timelines, researcher panels,
                  available projects, application directories, and sponsor or
                  UTAR involvement. Built as the attachable companion route for
                  MYResearchGuide.
                </p>
              </div>
              <div className="motion-rise motion-delay-3 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#apply">
                    Open application directories
                    <ArrowRight data-icon="inline-end" />
                  </a>
                </Button>
                <Button
                  asChild
                  className="dark-outline-button"
                  size="lg"
                  variant="outline"
                >
                  <a href={mainSiteUrl}>
                    Return to main MRG
                    <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              </div>
            </div>

            <aside
              aria-label="Competition quick facts"
              className="hero-fact-grid motion-panel grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-1"
            >
              <div className="hero-logo-cell">
                <img
                  src={mrgLogoUrl}
                  alt="MYResearchGuide"
                  className="h-10 w-auto object-contain"
                />
                <span className="hero-wordmark">MYResearchGuide</span>
                <p className="dark-muted mt-3 text-sm">
                  Attached competition route for Malaysia's student research
                  guide.
                </p>
              </div>
              {stats.map((stat) => (
                <div key={stat.label} className="hero-fact p-5">
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="dark-muted mt-2 text-xs font-semibold tracking-[0.08em] uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </aside>
          </div>
        </section>

        <section className="border-b border-border bg-secondary/70" data-reveal>
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
            <p>
              <span className="font-semibold text-foreground">
                Competition route:
              </span>{" "}
              timeline, projects, researchers, applications, and organisation
              sections are ready for confirmed details.
            </p>
            <a
              className="inline-flex items-center gap-2 font-semibold text-primary"
              href={mailingListUrl}
            >
              Join the MRG mailing list
              <ArrowRight data-icon="inline-end" />
            </a>
          </div>
        </section>

        <section id="timeline" className="light-band py-16 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-col gap-5" data-reveal>
              <p className="section-kicker">Important dates</p>
              <h2 className="text-4xl leading-tight font-medium md:text-6xl">
                Competition Timeline
              </h2>
              <p className="max-w-md text-muted-foreground">
                A clean timeline mirrors the reference structure while keeping
                dates editable as organisers finalise the programme.
              </p>
            </div>
            <ol className="relative flex flex-col gap-6 border-l border-border pl-6">
              {timeline.map((item, index) => (
                <li
                  key={item.title}
                  className="relative"
                  data-reveal
                  style={revealStyle(index)}
                >
                  <span
                    className={cn(
                      "absolute -left-[43px] flex size-9 items-center justify-center rounded-full border bg-card text-sm font-semibold shadow-sm",
                      item.status === "active" &&
                        "border-primary bg-primary text-primary-foreground",
                      item.status === "complete" &&
                        "border-primary/30 text-primary"
                    )}
                  >
                    {index + 1}
                  </span>
                  <div
                    className={cn(
                      "rounded-lg border border-transparent p-5",
                      item.status === "active" && "border-primary/25 bg-accent"
                    )}
                  >
                    <p className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
                      {item.date}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="projects" className="project-section py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.18fr]">
              <div className="flex flex-col gap-6" data-reveal>
                <div>
                  <p className="section-kicker">Projects</p>
                  <h2 className="mt-3 text-5xl leading-none font-light">
                    Available projects
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {projects.map((project, index) => (
                    <button
                      key={project.id}
                      className={cn(
                        "project-row text-left",
                        index === 0 && "project-row-active"
                      )}
                      data-reveal
                      style={revealStyle(index)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {project.title}
                        </span>
                        <span className="dark-muted mt-2 block text-xs tracking-[0.08em] uppercase">
                          {project.track}
                        </span>
                      </span>
                      <span className="dark-muted font-mono text-xs">
                        {project.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="project-detail min-w-0"
                data-reveal
                style={revealStyle(2)}
              >
                <div className="project-filter-grid grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                  <label className="dark-muted flex flex-col gap-2 text-xs font-semibold tracking-[0.08em] uppercase">
                    <span className="inline-flex items-center gap-2">
                      <Search data-icon="inline-start" />
                      Search
                    </span>
                    <input
                      className="project-input h-10 border-0 border-b bg-transparent text-sm font-normal tracking-normal normal-case outline-none focus:border-primary"
                      placeholder="Search keywords..."
                      readOnly
                    />
                  </label>
                  <label className="dark-muted flex flex-col gap-2 text-xs font-semibold tracking-[0.08em] uppercase">
                    <span className="inline-flex items-center gap-2">
                      <Filter data-icon="inline-start" />
                      Track
                    </span>
                    <select className="project-select h-10 border px-3 text-sm font-normal tracking-normal normal-case">
                      {tracks.map((track) => (
                        <option key={track}>{track}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <article className="p-6 md:p-8">
                  <p className="text-xs font-bold tracking-[0.08em] text-primary uppercase">
                    {featuredProject.track}
                  </p>
                  <h3 className="mt-5 max-w-3xl font-serif text-4xl leading-tight font-semibold md:text-5xl">
                    {featuredProject.title}
                  </h3>
                  <div className="project-meta-grid mt-6 grid gap-3 py-4 text-sm md:grid-cols-3">
                    <p>
                      <span className="meta-label">Mentor</span>{" "}
                      {featuredProject.mentor}
                    </p>
                    <p>
                      <span className="meta-label">Participants</span>{" "}
                      {featuredProject.participants}
                    </p>
                    <p>
                      <span className="meta-label">Time</span>{" "}
                      {featuredProject.time}
                    </p>
                  </div>
                  <div className="project-abstract mt-6 border-l-4 border-primary p-5">
                    <p className="meta-label mb-3">Abstract</p>
                    <p className="dark-soft leading-8">
                      {featuredProject.abstract}
                    </p>
                  </div>
                  <div className="dark-muted mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p>{featuredProject.directory}</p>
                    <Button
                      asChild
                      className="dark-outline-button"
                      variant="outline"
                    >
                      <a href="#apply">
                        View directories
                        <ArrowRight data-icon="inline-end" />
                      </a>
                    </Button>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="researchers" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
              <div data-reveal>
                <p className="section-kicker">Researcher panel</p>
                <h2 className="mt-3 text-4xl leading-tight font-medium md:text-6xl">
                  External categories and UTAR lanes
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {researcherGroups.map((group, index) => {
                  const Icon = group.icon

                  return (
                    <article
                      key={group.label}
                      className="entity-card"
                      data-reveal
                      style={revealStyle(index)}
                    >
                      <Icon aria-hidden="true" />
                      <h3>{group.label}</h3>
                      <p>{group.body}</p>
                      <ul>
                        {group.people.map((person) => (
                          <li key={person}>{person}</li>
                        ))}
                      </ul>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="apply" className="bg-secondary/65 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col gap-5" data-reveal>
                <p className="section-kicker">Application directories</p>
                <h2 className="text-4xl leading-tight font-medium md:text-6xl">
                  Clear paths for applicants, mentors, and sponsors
                </h2>
                <p className="max-w-xl text-muted-foreground">
                  Each path is separated so the organising team can connect
                  final forms, mentor review, and sponsor intake without
                  redesigning the page.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <a href={applicationUrl}>
                      Start application
                      <Mail data-icon="inline-end" />
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href={mailingListUrl}>
                      Mailing list
                      <ExternalLink data-icon="inline-end" />
                    </a>
                  </Button>
                </div>
              </div>
              <div className="grid gap-4">
                {applicationDirectories.map((directory, index) => (
                  <article
                    key={directory.title}
                    className="directory-card"
                    data-reveal
                    style={revealStyle(index)}
                  >
                    <div>
                      <h3>{directory.title}</h3>
                      <p>{directory.description}</p>
                    </div>
                    <ul>
                      {directory.items.map((item) => (
                        <li key={item}>
                          <CheckCircle2 data-icon="inline-start" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="organisations" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div
              className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
              data-reveal
            >
              <div>
                <p className="section-kicker">Organisations involved</p>
                <h2 className="mt-3 text-4xl font-medium md:text-6xl">
                  Sponsors, partners, and UTAR
                </h2>
              </div>
              <p className="max-w-md text-muted-foreground">
                Sponsor tiers and confirmed partner logos can be inserted into
                this section without changing the layout.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {organisations.map((org, index) => (
                <article
                  key={org.label}
                  className="organisation-card"
                  data-reveal
                  style={revealStyle(index)}
                >
                  <Building2 aria-hidden="true" />
                  <p className="text-xs font-bold tracking-[0.08em] text-primary uppercase">
                    {org.type}
                  </p>
                  <h3>{org.label}</h3>
                  <p>{org.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="light-band py-16 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-[0.65fr_1.35fr]">
            <div data-reveal>
              <p className="section-kicker">FAQ</p>
              <h2 className="mt-3 text-4xl font-medium md:text-6xl">
                Frequently asked questions
              </h2>
            </div>
            <div className="grid gap-4">
              {faqs.map((faq, index) => (
                <article
                  key={faq.question}
                  className="faq-card"
                  data-reveal
                  style={revealStyle(index)}
                >
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="hero-dark" data-reveal>
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1fr_auto] md:px-6">
          <div>
            <p className="text-xl font-semibold">MRG Research Competition</p>
            <p className="dark-muted mt-3 max-w-2xl text-sm leading-6">
              Attached competition microsite for MYResearchGuide. Organisers can
              now add confirmed names, dates, prizes, and forms into stable
              sections.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <a className="footer-link" href={mainSiteUrl}>
              <MapPin data-icon="inline-start" />
              Main MYResearchGuide site
            </a>
            <a
              className="footer-link"
              href="mailto:myresearchguide.org@gmail.com"
            >
              <Mail data-icon="inline-start" />
              myresearchguide.org@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
