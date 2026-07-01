import { ArrowRight, GraduationCap, Mail, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ProjectCard } from "@/components/project-card"
import { WavePattern } from "@/components/wave-pattern"

const mainSiteUrl = "https://www.myresearchguide.org/"
const mrgLogoUrl = "https://www.myresearchguide.org/MRG1W.png"
const mailingListUrl = "https://forms.gle/Sk9JS3kcKe8qw1cU6"

const navItems = [
  { label: "Timeline", href: "#timeline" },
  { label: "Projects", href: "#projects" },
  { label: "Researchers", href: "#researchers" },
  { label: "Apply", href: "#apply" },
]

const stats = [
  { label: "Competition Route", value: "2026" },
  { label: "Mentor Lanes", value: "External + UTAR" },
  { label: "Project Tracks", value: "5" },
  { label: "Expected Participants", value: "50+" },
]

const projects = [
  {
    id: "A-1",
    track: "AI & Data",
    title: "Machine Learning for Research Question Discovery",
    mentor: "External researcher panel",
    participants: "3-5",
    time: "5-7 hours/week",
    abstract: "Build a lightweight workflow for turning student curiosity into tractable research questions. The project can later expand into literature mapping, dataset discovery, and prompt-aided hypothesis refinement.",
    status: "open" as const,
  },
  {
    id: "B-2",
    track: "BioScience",
    title: "Low-Cost Biology Research Pathways for Secondary Students",
    mentor: "UTAR and external life-science mentors",
    participants: "2-4",
    time: "4-6 hours/week",
    abstract: "Design a practical map of beginner-friendly wet-lab, dry-lab, and review-based project options for students without institutional lab access.",
    status: "open" as const,
  },
  {
    id: "E-3",
    track: "Engineering",
    title: "Robotics and Embedded Systems Outreach Modules",
    mentor: "UTAR engineering category",
    participants: "3-6",
    time: "6 hours/week",
    abstract: "Prototype a modular engineering research challenge where participants can document design constraints, test logs, and technical tradeoffs.",
    status: "open" as const,
  },
  {
    id: "C-4",
    track: "Economics",
    title: "Regional Research Access and Student Opportunity Gaps",
    mentor: "External social-science panel",
    participants: "2-5",
    time: "4 hours/week",
    abstract: "Investigate how Malaysian and regional students discover research opportunities, with an emphasis on transparent access, cost, and mentorship channels.",
    status: "open" as const,
  },
  {
    id: "P-5",
    track: "Policy",
    title: "Open Research Ethics and Youth Publication Standards",
    mentor: "Mixed external and UTAR review panel",
    participants: "3-5",
    time: "5 hours/week",
    abstract: "Create a clear student-facing guide for ethical authorship, data handling, mentor credit, and public communication of early research work.",
    status: "open" as const,
  },
]

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <a href={mainSiteUrl} className="flex items-center gap-2">
              <img src={mrgLogoUrl} alt="MRG Logo" className="h-8" />
            </a>
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <a href={mailingListUrl}>
                <Mail className="mr-2 h-4 w-4" />
                Join Mailing List
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <WavePattern />
          <div className="container hero-content">
            <div className="max-w-4xl space-y-6 animate-fade-in-up">
              <div className="inline-flex items-center gap-3 text-sm font-medium text-primary">
                <span>MRG x UTAR research basecamp</span>
                <span className="h-px w-12 bg-primary" />
                <span>2026 programme</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                Research Competition<br />Base Camp
              </h1>

              <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                A structured competition hub for timelines, researcher panels, available projects,
                application directories, and sponsor or UTAR involvement.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button asChild size="lg">
                  <a href="#projects">
                    Explore Projects
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href={mainSiteUrl}>
                    Return to main MRG
                    <ExternalLink className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="absolute bottom-0 left-0 right-0 border-t bg-background/50 backdrop-blur">
            <div className="container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Projects Grid */}
        <section id="projects" className="py-24">
          <div className="container">
            <div className="max-w-3xl mb-16">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-4">
                <GraduationCap className="h-4 w-4" />
                Research Programme
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Available Research Projects
              </h2>
              <p className="text-lg text-muted-foreground">
                Browse our curated collection of research projects across five tracks.
                Each project provides hands-on research experience with structured mentorship.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="animate-fade-in-up"
                >
                  <ProjectCard
                    id={project.id}
                    track={project.track}
                    title={project.title}
                    mentor={project.mentor}
                    participants={project.participants}
                    time={project.time}
                    abstract={project.abstract}
                    status={project.status}
                    onClick={() => {
                      window.location.hash = `project-${project.id}`
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t py-24">
          <div className="container text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold">
                Ready to start your research journey?
              </h2>
              <p className="text-lg text-muted-foreground">
                Join the 2026 cohort and work with expert mentors on real research projects.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button asChild size="lg">
                  <a href="#apply">
                    Apply Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href={mailingListUrl}>
                    <Mail className="mr-2 h-5 w-5" />
                    Get Updates
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 MYResearchGuide. Attached competition route.
            </p>
            <div className="flex items-center gap-6">
              <a href={mainSiteUrl} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Main Website
              </a>
              <a href={mailingListUrl} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Mailing List
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
