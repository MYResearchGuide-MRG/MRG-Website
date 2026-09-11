import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, ChevronDown, Mail, Search } from "lucide-react"

import { Reveal } from "@/components/motion/reveal"
import { AnimatedIcon } from "@/components/icons"
import { trackIcons } from "@/components/icons/icon-map"
import { SectionHeading } from "./section-heading"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  projectCodes,
  projects,
  tracks,
  trackOrder,
  type Project,
} from "@/data/competition-data"
import { siteConfig } from "@/lib/site"
import { easeOutExpo } from "@/components/motion/variants"
import { cn } from "@/lib/utils"

const CODES = projectCodes(projects)

/** Every field a search should reach, flattened once per project. */
const HAYSTACK = new Map(
  projects.map((p) => [
    p.id,
    [
      CODES.get(p.id),
      p.title,
      p.mentor,
      p.affiliation,
      p.track,
      p.type,
      p.participants,
      p.timeInvestment,
      p.description,
      p.skillsDescription,
      ...p.skills,
      ...p.prepWork,
      ...p.tasks,
      ...p.deliverables,
    ]
      .join(" ")
      .toLowerCase(),
  ])
)

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border py-4">
      <dt className="label-micro text-muted-foreground">{label}</dt>
      <dd className="mt-2 leading-snug font-medium">{value}</dd>
    </div>
  )
}

/** The bulleted sections the committee's reference format uses verbatim. */
function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        // AccordionContent greys its children; these are content, not chrome.
        <li
          key={item}
          className="flex gap-3 text-sm leading-relaxed text-foreground"
        >
          <span
            aria-hidden
            className="mt-[0.65rem] h-0.5 w-3 shrink-0 bg-muted-foreground"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** True when the skill chips already carry everything the prose answer says. */
function tagsCoverProse(project: Project) {
  const prose = project.skillsDescription.toLowerCase()
  return (
    prose.length < 80 &&
    project.skills.every((s) => prose.includes(s.toLowerCase()))
  )
}

/** Mirrors the lg breakpoint the projects grid switches at. */
const COMPACT_QUERY = "(max-width: 1023.98px)"

function ProjectDetail({ project }: { project: Project }) {
  return (
    <div>
      {/* pr-12 keeps the code clear of the sheet's close button, which is
          absolutely positioned in this same corner. No close button exists in
          the desktop pane, so the reserve is dropped there. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pr-12 lg:pr-0">
        <span className="label-micro text-muted-foreground">
          {project.track} / {project.type}
        </span>
        <span aria-hidden className="h-px w-8 bg-border" />
        <span className="label-micro text-muted-foreground">
          {CODES.get(project.id)}
        </span>
        {project.status === "pending" && (
          <span className="label-micro border border-border px-2 py-1 text-muted-foreground">
            Awaiting mentor confirmation
          </span>
        )}
      </div>

      <h3 className="display-md mt-6 text-balance">{project.title}</h3>

      {/* Mentor gets its own band with the headshot: it is the single fact an
          applicant weighs hardest, and it was previously one grey cell among
          three. */}
      <div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
        <img
          src={project.photo}
          alt=""
          width={560}
          height={700}
          loading="lazy"
          decoding="async"
          className="h-auto w-14 shrink-0 border border-border object-cover"
          style={{ aspectRatio: "4 / 5" }}
        />
        <div className="min-w-0">
          <p className="label-micro text-muted-foreground">Mentor</p>
          <p className="mt-1.5 leading-snug font-medium">{project.mentor}</p>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
            {project.affiliation}
          </p>
        </div>
      </div>

      <dl className="mt-2 grid gap-x-10 sm:grid-cols-2">
        <MetaCell label="Participants" value={project.participants} />
        <MetaCell label="Time commitment" value={project.timeInvestment} />
      </dl>

      {/* The brief is the thing people came to read: full foreground, not the
          secondary grey the rest of the metadata sits in. */}
      <p className="mt-8 max-w-2xl leading-relaxed text-pretty">
        {project.description}
      </p>

      <div className="mt-9">
        <span className="label-micro text-muted-foreground">Skills</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {project.skills.map((skill) => (
            <span
              key={skill}
              className="border border-border px-2.5 py-1 text-sm text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
        {/* Some mentors answered with a bare list that the tags already say.
            Repeating it under the chips reads as a rendering bug. */}
        {!tagsCoverProse(project) && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {project.skillsDescription}
          </p>
        )}
      </div>

      <Accordion type="multiple" className="mt-10 border-t border-border">
        <AccordionItem value="mentor">
          <AccordionTrigger className="text-base md:text-lg">
            About the mentor
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm leading-relaxed">{project.mentorBio}</p>
          </AccordionContent>
        </AccordionItem>
        {/* Some mentors gave no prep work; an empty disclosure is worse than
            none at all. */}
        {project.prepWork.length > 0 && (
          <AccordionItem value="prep">
            <AccordionTrigger className="text-base md:text-lg">
              Prep Work
            </AccordionTrigger>
            <AccordionContent>
              <BulletList items={project.prepWork} />
            </AccordionContent>
          </AccordionItem>
        )}
        <AccordionItem value="tasks">
          <AccordionTrigger className="text-base md:text-lg">
            Example Project Tasks
          </AccordionTrigger>
          <AccordionContent>
            <BulletList items={project.tasks} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="deliverables">
          <AccordionTrigger className="text-base md:text-lg">
            Expected Deliverables
          </AccordionTrigger>
          <AccordionContent>
            <BulletList items={project.deliverables} />
          </AccordionContent>
        </AccordionItem>
        {project.preferences && (
          <AccordionItem value="preferences">
            <AccordionTrigger className="text-base md:text-lg">
              Who this suits
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed">{project.preferences}</p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="mt-10">
        <Button asChild size="lg" className="group">
          <a href={siteConfig.mailingListUrl}>
            <Mail />
            Get updates
            <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
          </a>
        </Button>
      </div>
    </div>
  )
}

/**
 * Master/detail project browser, following the format the committee pointed at
 * (EleutherAI SOAR): a list grouped by track on the left, one project's full
 * brief held open beside it.
 *
 * Replaces the previous row-list-plus-modal. A modal was fine for five one-line
 * abstracts; these briefs carry mentor, skills, prep work, tasks and
 * deliverables, and applicants compare them side by side rather than opening
 * and dismissing each one.
 */
export function Projects() {
  const [track, setTrack] = React.useState<string>("All")
  const [groupBy, setGroupBy] = React.useState<"track" | "mentor">("track")
  const [query, setQuery] = React.useState("")
  const [activeId, setActiveId] = React.useState(projects[0]?.id ?? "")
  const [hoveredTrack, setHoveredTrack] = React.useState<string | null>(null)
  // Collapsed rather than expanded track names, so the default is everything
  // open — a first-time visitor should see the whole catalogue, not five
  // closed drawers.
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(
    new Set()
  )
  const reduced = useReducedMotion()
  // Below lg the detail pane cannot sit beside the list, and stacking it under
  // the list meant every tap scrolled you away from the thing you were
  // browsing. On compact screens the brief opens as a sheet instead, so
  // dismissing it returns you to your exact place in the list.
  const [compact, setCompact] = React.useState(
    () =>
      typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches
  )
  const [sheetOpen, setSheetOpen] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY)
    // Both updates live in the listener rather than in a second effect that
    // watches `compact`: growing past the breakpoint has to close the sheet, or
    // a modal is left covering a layout that no longer needs one.
    const onChange = () => {
      setCompact(mql.matches)
      if (!mql.matches) setSheetOpen(false)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  const toggleTrack = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(name)) next.add(name)
      return next
    })

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      const matchesTrack = track === "All" || p.track === track
      const matchesQuery = q === "" || (HAYSTACK.get(p.id) ?? "").includes(q)
      return matchesTrack && matchesQuery
    })
  }, [track, query])

  // Keep the open brief inside the current filter, the way the reference does:
  // filtering to a track you are not reading should move you, not blank the pane.
  const active = visible.find((p) => p.id === activeId) ?? visible[0] ?? null

  /* Two ways into the same list. Mentors used to be a section of their own,
     which meant reading a researcher's background in one place and the work
     they actually own in another. Grouping by mentor puts both in the brief. */
  const groups = React.useMemo(() => {
    if (groupBy === "mentor") {
      const byMentor = new Map<string, typeof visible>()
      for (const p of visible) {
        const existing = byMentor.get(p.mentor)
        if (existing) existing.push(p)
        else byMentor.set(p.mentor, [p])
      }
      return [...byMentor.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mentor, items]) => ({
          key: mentor,
          label: mentor,
          photo: items[0]?.photo,
          items,
        }))
    }

    return trackOrder
      .map((t) => ({
        key: t as string,
        label: t as string,
        photo: undefined as string | undefined,
        items: visible.filter((p) => p.track === t),
      }))
      .filter((g) => g.items.length > 0)
  }, [groupBy, visible])

  const select = (id: string) => {
    setActiveId(id)
    if (compact) setSheetOpen(true)
  }

  return (
    <section
      id="projects"
      className="scroll-mt-24 border-t border-border py-24 md:py-32"
    >
      <div className="container">
        <SectionHeading
          kicker="Research Programme"
          index="01"
          title="Projects"
          lede="Each project is a real research question owned by a mentor, scoped so a first-time researcher finishes the eight weeks with something to show: a paper, a prototype, a documented method. Open a brief to read the mentor's background and what the work involves."
        />

        {/* Filters */}
        <Reveal delay={0.12}>
          <div className="mt-12 flex flex-col gap-6 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              {tracks.map((t) => {
                const activeTrack = t === track
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrack(t)}
                    className={cn(
                      "relative pb-1.5 text-sm transition-colors",
                      activeTrack
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                    {activeTrack && (
                      <motion.span
                        layoutId="track-underline"
                        // Sits under its own button, not on the container's
                        // bottom rule: once the filters wrap to two lines, a
                        // container-anchored underline strikes through the
                        // second row.
                        className="absolute inset-x-0 bottom-0 h-px bg-foreground"
                        transition={{ duration: 0.35, ease: easeOutExpo }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              {/* Grouping, not filtering: both views show every project that
                  survives the track pills and the search box. */}
              <div
                role="group"
                aria-label="Group projects by"
                className="flex items-center gap-1 rounded-full border border-border p-1"
              >
                {(
                  [
                    { id: "track", label: "By track" },
                    { id: "mentor", label: "By mentor" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setGroupBy(option.id)}
                    aria-pressed={groupBy === option.id}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs whitespace-nowrap transition-colors",
                      groupBy === option.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="relative md:w-56">
                <Search className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects"
                  aria-label="Search projects"
                  className="w-full border-0 border-b border-transparent bg-transparent py-1.5 pl-6 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
                />
              </div>
            </div>
          </div>
        </Reveal>

        {visible.length === 0 ? (
          <div className="border-b border-border py-24 text-center">
            <p className="text-muted-foreground">
              No projects match the current search.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setTrack("All")
              }}
              className="link-wipe mt-4 text-sm font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-10 grid gap-x-14 gap-y-12 lg:grid-cols-[19rem_1fr]">
            {/* List, grouped by track */}
            <div>
              {groups.map((group) => {
                const open = !collapsed.has(group.key)
                const Icon = trackIcons[group.key]
                return (
                  <section key={group.key} className="mb-8 last:mb-0">
                    <h3>
                      <button
                        type="button"
                        onClick={() => toggleTrack(group.key)}
                        aria-expanded={open}
                        onMouseEnter={() => setHoveredTrack(group.key)}
                        onMouseLeave={() => setHoveredTrack(null)}
                        className="label-micro group/track flex w-full items-center gap-2 pb-3 text-left text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {group.photo ? (
                          <img
                            src={group.photo}
                            alt=""
                            aria-hidden
                            loading="lazy"
                            className="size-5 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          Icon && (
                            <AnimatedIcon
                              icon={Icon}
                              active={hoveredTrack === group.key}
                              size={16}
                            />
                          )
                        )}
                        {/* Track names are labels and read fine in caps; a
                            person's name in letterspaced caps does not. */}
                        <span
                          className={cn(
                            "flex-1",
                            groupBy === "mentor" &&
                              "text-sm font-medium tracking-normal normal-case"
                          )}
                        >
                          {group.label}
                        </span>
                        {/* Count earns its place: collapsed, it is the only clue
                          to how much is hidden. */}
                        <span className="tabular-nums">
                          {group.items.length}
                        </span>
                        <ChevronDown
                          aria-hidden
                          className={cn(
                            "size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                            !open && "-rotate-90"
                          )}
                        />
                      </button>
                    </h3>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          key="items"
                          initial={reduced ? false : { height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={reduced ? undefined : { height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: easeOutExpo }}
                          className="overflow-hidden"
                        >
                          {group.items.map((project) => {
                            const isActive = active?.id === project.id
                            return (
                              <button
                                key={project.id}
                                type="button"
                                onClick={() => select(project.id)}
                                aria-current={isActive}
                                className={cn(
                                  "group block w-full border-t border-border py-4 pr-3 pl-4 text-left transition-colors duration-200",
                                  isActive ? "bg-muted" : "hover:bg-muted/60"
                                )}
                              >
                                <span className="relative block">
                                  {isActive && !reduced && (
                                    <motion.span
                                      layoutId="project-marker"
                                      aria-hidden
                                      className="absolute top-0 -left-4 h-full w-px bg-foreground"
                                      transition={{
                                        duration: 0.3,
                                        ease: easeOutExpo,
                                      }}
                                    />
                                  )}
                                  {/* Titles stay at full contrast whether or not the
                              row is open — greying the nine you are not reading
                              made the list hard to scan, which is the one job
                              it has. Selection is carried by the rule and the
                              fill instead. */}
                                  <span
                                    className={cn(
                                      "block leading-snug text-balance",
                                      isActive && "font-medium"
                                    )}
                                  >
                                    {project.title}
                                  </span>
                                  <span className="label-micro mt-2 flex items-center justify-between gap-3 text-muted-foreground">
                                    <span>{project.type}</span>
                                    <span className="whitespace-nowrap">
                                      {CODES.get(project.id)}
                                    </span>
                                  </span>
                                </span>
                              </button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                )
              })}

              <p className="label-micro mt-6 border-t border-border pt-4 text-muted-foreground">
                Showing {visible.length} of {projects.length}
              </p>
            </div>

            {/* Detail. Sticky beside the list on wide screens; below lg it is
                not rendered here at all — the sheet takes over. */}
            <div className="hidden lg:block">
              <div className="border border-border bg-background p-6 md:p-9 lg:sticky lg:top-24">
                <AnimatePresence mode="wait" initial={false}>
                  {active && (
                    <motion.div
                      key={active.id}
                      initial={reduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.3, ease: easeOutExpo }}
                    >
                      <ProjectDetail project={active} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile sheet. Slides up over the list, so closing it puts you back
          exactly where you were instead of at the top of a long page. */}
      <Dialog open={sheetOpen && compact} onOpenChange={setSheetOpen}>
        {active && compact && (
          <DialogContent className="top-auto bottom-0 left-0 max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 border-x-0 border-b-0 p-6 data-[state=closed]:translate-y-full data-[state=closed]:scale-100">
            {/* Radix needs a title for the dialog's accessible name; the
                heading inside ProjectDetail is an h3, not a DialogTitle. */}
            <DialogTitle className="sr-only">{active.title}</DialogTitle>
            <ProjectDetail project={active} />
          </DialogContent>
        )}
      </Dialog>
    </section>
  )
}
