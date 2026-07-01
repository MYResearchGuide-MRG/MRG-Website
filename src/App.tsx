import { useState } from "react"
import { ArrowRight, GraduationCap, Mail, CheckCircle2, Calendar, Users, Award, MessageCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/project-card"
import { WavePattern } from "@/components/wave-pattern"
import { ProjectDetailModal, FilterBar } from "@/components/project-detail-modal"
import FlowLinesBackground from "@/components/flow-lines-bg"
import { timeline, prizes, eligibility, applicationSteps, mentors, faqs, partners } from "@/data/competition-data"
import { cn } from "@/lib/utils"

const mainSiteUrl = "https://www.myresearchguide.org/"
const mrgLogoUrl = "https://www.myresearchguide.org/MRG1W.png"
const mailingListUrl = "https://forms.gle/Sk9JS3kcKe8qw1cU6"
const applicationFormUrl = "https://forms.gle/M4dHMyq5dXSGEHXT6"

const navItems = [
  { label: "Timeline", href: "#timeline" },
  { label: "Projects", href: "#projects" },
  { label: "Prizes", href: "#prizes" },
  { label: "Mentors", href: "#mentors" },
  { label: "Apply", href: "#apply" },
  { label: "FAQ", href: "#faq" },
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
    mentor: "Dr. Sarah Chen",
    participants: "3-5",
    time: "5-7 hours/week",
    abstract: "Build a lightweight workflow for turning student curiosity into tractable research questions. The project can later expand into literature mapping, dataset discovery, and prompt-aided hypothesis refinement.",
    status: "open" as const,
    prerequisites: "Basic programming knowledge, curiosity about ML",
    outcomes: "Research paper, working prototype, methodology documentation",
  },
  {
    id: "B-2",
    track: "BioScience",
    title: "Low-Cost Biology Research Pathways for Secondary Students",
    mentor: "Prof. Ahmad Rahman",
    participants: "2-4",
    time: "4-6 hours/week",
    abstract: "Design a practical map of beginner-friendly wet-lab, dry-lab, and review-based project options for students without institutional lab access.",
    status: "open" as const,
    prerequisites: "Interest in biology, basic science knowledge",
    outcomes: "Research guide, lab protocols, student handbook",
  },
  {
    id: "E-3",
    track: "Engineering",
    title: "Robotics and Embedded Systems Outreach Modules",
    mentor: "Dr. Emily Wong",
    participants: "3-6",
    time: "6 hours/week",
    abstract: "Prototype a modular engineering research challenge where participants can document design constraints, test logs, and technical tradeoffs.",
    status: "open" as const,
    prerequisites: "Basic electronics knowledge, problem-solving skills",
    outcomes: "Working prototype, technical documentation, teaching modules",
  },
  {
    id: "C-4",
    track: "Economics",
    title: "Regional Research Access and Student Opportunity Gaps",
    mentor: "Dr. Lim Wei Ming",
    participants: "2-5",
    time: "4 hours/week",
    abstract: "Investigate how Malaysian and regional students discover research opportunities, with an emphasis on transparent access, cost, and mentorship channels.",
    status: "open" as const,
    prerequisites: "Interest in policy, data analysis basics",
    outcomes: "Research paper, data analysis, policy recommendations",
  },
  {
    id: "P-5",
    track: "Policy",
    title: "Open Research Ethics and Youth Publication Standards",
    mentor: "Dr. Priya Sharma",
    participants: "3-5",
    time: "5 hours/week",
    abstract: "Create a clear student-facing guide for ethical authorship, data handling, mentor credit, and public communication of early research work.",
    status: "open" as const,
    prerequisites: "Critical thinking, interest in research ethics",
    outcomes: "Ethics guidebook, case studies, student workshops",
  },
]

const tracks = ["All", "AI & Data", "BioScience", "Engineering", "Economics", "Policy"]

function App() {
  const [selectedProject, setSelectedProject] = useState<typeof projects[0] | null>(null)
  const [selectedTrack, setSelectedTrack] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      searchQuery === "" ||
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.track.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTrack = selectedTrack === "All" || project.track === selectedTrack

    return matchesSearch && matchesTrack
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

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
            <Button asChild variant="default" size="sm">
              <a href={applicationFormUrl}>Apply Now</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <FlowLinesBackground />
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
                Join Malaysia's premier student research competition. Collaborate with leading academics,
                tackle real-world research challenges, and gain publication opportunities that launch your
                research career. Prizes and judging panels to be announced.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button asChild size="lg">
                  <a href="#apply">
                    Apply Now - Deadline April 15
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#projects">
                    Browse Projects
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

        {/* Partners Section */}
        <section className="py-16 border-b bg-muted/30">
          <div className="container">
            <div className="text-center mb-8">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Our Partners
              </div>
              <p className="text-sm text-muted-foreground">
                Supported by leading educational institutions and research organizations
              </p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16">
              {partners.map((partner, index) => (
                <a
                  key={index}
                  href={partner.url}
                  className="transition-all duration-300 hover:scale-110"
                  title={partner.description}
                  target={partner.url.startsWith('http') ? '_blank' : undefined}
                  rel={partner.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="h-16 object-contain filter brightness-0 dark:brightness-100 dark:invert-0 hover:filter-none transition-all"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline Section */}
        <section id="timeline" className="py-24 border-b">
          <div className="container">
            <div className="max-w-3xl mb-16">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-4">
                <Calendar className="h-4 w-4" />
                Important Dates
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Competition Timeline
              </h2>
              <p className="text-lg text-muted-foreground">
                From application to final presentation, follow the complete journey of the 2026 research
                competition. Each milestone is carefully designed to support your growth as a researcher,
                with clear deadlines and structured support at every stage.
              </p>
            </div>

            <div className="max-w-4xl">
              <div className="space-y-8">
                {timeline.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-6 group"
                  >
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold transition-colors",
                        item.status === "complete" && "bg-green-500/10 border-green-500 text-green-600 dark:text-green-400",
                        item.status === "active" && "bg-primary/10 border-primary text-primary",
                        item.status === "upcoming" && "bg-muted border-border text-muted-foreground"
                      )}>
                        {item.status === "complete" ? <CheckCircle2 className="h-6 w-6" /> : index + 1}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 h-full min-h-[60px] bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="text-sm font-medium text-primary mb-1">{item.date}</div>
                      <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section with Filtering */}
        <section id="projects" className="py-24 border-b">
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
                Explore cutting-edge research opportunities across five distinct tracks. Each project is
                mentored by experienced researchers and designed to provide hands-on experience with real
                research methodologies. Whether you're interested in AI, biology, engineering, economics,
                or policy, there's a perfect project waiting for you.
              </p>
            </div>

            <FilterBar
              selectedTrack={selectedTrack}
              onTrackChange={setSelectedTrack}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              tracks={tracks}
            />

            <div className="mt-8">
              <div className="text-sm text-muted-foreground mb-6">
                Showing {filteredProjects.length} of {projects.length} projects
              </div>
              
              {filteredProjects.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project, index) => (
                    <div
                      key={project.id}
                      style={{ animationDelay: `${index * 100}ms` }}
                      className="animate-fade-in-up"
                    >
                      <ProjectCard
                        {...project}
                        onClick={() => setSelectedProject(project)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">No projects match your search criteria.</p>
                  <Button onClick={() => { setSearchQuery(""); setSelectedTrack("All"); }}>
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Prizes Section */}
        <section id="prizes" className="py-24 border-b bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mb-16 text-center mx-auto">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-4">
                <Award className="h-4 w-4" />
                Prizes & Recognition
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Prizes & Recognition
              </h2>
              <p className="text-lg text-muted-foreground">
                Prize amounts and judging panels to be confirmed. All participants receive certificates and recognition.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {prizes.map((prize, index) => (
                <div
                  key={index}
                  className="bg-card border rounded-xl p-6 hover:shadow-lg transition-shadow relative"
                >
                  {prize.placeholder && (
                    <div className="absolute top-4 right-4">
                      <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded border border-yellow-500/20">
                        TBC
                      </span>
                    </div>
                  )}
                  <div className="text-3xl font-bold text-primary mb-2">{prize.amount}</div>
                  <h3 className="text-xl font-semibold mb-2">{prize.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{prize.description}</p>
                  <ul className="space-y-2">
                    {prize.benefits.map((benefit, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Eligibility Section */}
        <section id="eligibility" className="py-24 border-b">
          <div className="container">
            <div className="max-w-3xl mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Eligibility Requirements
              </h2>
              <p className="text-lg text-muted-foreground">
                Check if you qualify for the 2026 competition.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {eligibility.requirements.map((req, index) => (
                <div key={index} className="bg-card border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">{req.title}</h3>
                  <p className="text-sm text-muted-foreground">{req.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-primary/5 border-l-4 border-primary rounded p-6 max-w-3xl mx-auto">
              <h3 className="font-semibold mb-4 text-lg">Important Notes</h3>
              <ul className="grid gap-3">
                {eligibility.notes.map((note, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <span className="text-primary mt-1">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Application Process */}
        <section id="apply" className="py-24 border-b bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mb-16 text-center mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                How to Apply
              </h2>
              <p className="text-lg text-muted-foreground">
                Follow these simple steps to submit your application.
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {applicationSteps.map((step, index) => (
                <div
                  key={index}
                  className="bg-card border rounded-lg p-6 flex gap-6 hover:border-primary/50 transition-colors"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                      <span className="text-sm text-muted-foreground">{step.duration}</span>
                    </div>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button size="lg" asChild>
                <a href={applicationFormUrl}>
                  Start Your Application
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Application portal opens January 15, 2026
              </p>
            </div>
          </div>
        </section>

        {/* Mentors Section */}
        <section id="mentors" className="py-24 border-b">
          <div className="container">
            <div className="max-w-3xl mb-16">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-4">
                <Users className="h-4 w-4" />
                Expert Guidance
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Meet Your Mentors
              </h2>
              <p className="text-lg text-muted-foreground">
                Learn from experienced researchers and industry experts across all five tracks.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mentors.map((mentor) => (
                <div key={mentor.id} className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4 flex items-center justify-center text-2xl font-bold text-primary">
                    {mentor.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded mb-3">
                    {mentor.track}
                  </span>
                  <h3 className="text-lg font-semibold mb-1">{mentor.name}</h3>
                  <p className="text-sm text-muted-foreground mb-1">{mentor.title}</p>
                  <p className="text-sm text-muted-foreground mb-3">{mentor.affiliation}</p>
                  <p className="text-sm mb-3">{mentor.bio}</p>
                  <div className="flex flex-wrap gap-2">
                    {mentor.expertise.map((skill, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-muted rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 border-b bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mb-16">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-4">
                <MessageCircle className="h-4 w-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Got Questions?
              </h2>
              <p className="text-lg text-muted-foreground">
                Find answers to common questions about the competition.
              </p>
            </div>

            <div className="max-w-3xl space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-card border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-semibold pr-4">{faq.question}</span>
                    {expandedFaq === index ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-4 text-muted-foreground">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">Still have questions?</p>
              <Button asChild variant="outline">
                <a href={`mailto:myresearchguide.org@gmail.com?subject=MRG Competition Question`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Us
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold">
                Ready to start your research journey?
              </h2>
              <p className="text-lg text-muted-foreground">
                Join the 2026 cohort and work with expert mentors on real research projects.
                Applications close April 15, 2026.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button asChild size="lg">
                  <a href={applicationFormUrl}>
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
              © 2026 MYResearchGuide. Research Competition Basecamp.
            </p>
            <div className="flex items-center gap-6">
              <a href={mainSiteUrl} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Main Website
              </a>
              <a href={mailingListUrl} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Mailing List
              </a>
              <a href="mailto:myresearchguide.org@gmail.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
