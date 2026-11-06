import * as React from "react"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Atom,
  ChevronDown,
  Cpu,
  Dna,
  FlaskConical,
  Grid2X2,
  Network,
  Search,
  Sigma,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Collapsible } from "radix-ui"
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog"
import {
  projectCodes,
  projects,
  trackOrder,
  type Project,
} from "@/data/competition-data"
import { projectsRouteHash } from "@/lib/results"
import { ProjectBrief } from "./project-brief"
import { ProjectAdvisor } from "./project-advisor"
import { ProjectWheel } from "./project-wheel"
import styles from "./projects.module.css"

const codes = projectCodes(projects)
const fields = ["All fields", ...trackOrder]
const fieldIcons: Record<string, LucideIcon> = {
  "All fields": Grid2X2,
  "AI & Computer Sciences": Cpu,
  Biology: Dna,
  Chemistry: FlaskConical,
  Mathematics: Sigma,
  "Interdisciplinary & Social Sciences": Network,
  Physics: Atom,
}
const skills = [
  ...new Set(projects.flatMap((project) => project.skills)),
].sort()
const mentors = [...new Set(projects.map((project) => project.mentor))].sort()
// Keep open-ended estimates (for example, 6+) distinct from fixed commitments.
const commitments = new Map(
  projects.map((project) => [
    project.id,
    project.timeInvestment.match(/^\d+\+? hours\/week/)?.[0] ??
      project.timeInvestment,
  ])
)
const availabilityOptions = [...new Set(commitments.values())].sort(
  (a, b) =>
    parseInt(a, 10) - parseInt(b, 10) ||
    Number(a.includes("+")) - Number(b.includes("+"))
)
const searchText = new Map(
  projects.map((p) => [
    p.id,
    [
      codes.get(p.id),
      p.title,
      p.mentor,
      p.affiliation,
      p.track,
      p.type,
      p.description,
      p.skillsDescription,
      ...p.skills,
    ]
      .join(" ")
      .toLowerCase(),
  ])
)

function ProjectCatalogue({ preview = false }: { preview?: boolean }) {
  const [query, setQuery] = React.useState("")
  const [field, setField] = React.useState("All fields")
  const [skill, setSkill] = React.useState("")
  const [mentor, setMentor] = React.useState("")
  const [availability, setAvailability] = React.useState("")
  const [fieldsOpen, setFieldsOpen] = React.useState(true)
  const [advancedOpen, setAdvancedOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Project | null>(null)
  const [briefOpen, setBriefOpen] = React.useState(false)
  const opener = React.useRef<HTMLButtonElement | null>(null)
  const briefContent = React.useRef<HTMLDivElement | null>(null)
  const reducedMotion = useReducedMotion()
  const searchId = React.useId()
  const headingId = React.useId()
  const matching = projects.filter(
    (project) =>
      searchText.get(project.id)!.includes(query.trim().toLowerCase()) &&
      (!skill || project.skills.includes(skill)) &&
      (!mentor || project.mentor === mentor) &&
      (!availability || commitments.get(project.id) === availability)
  )
  const visible = preview
    ? projects
    : matching.filter(
        (project) => field === "All fields" || project.track === field
      )
  const advancedCount =
    Number(Boolean(skill)) +
    Number(Boolean(mentor)) +
    Number(Boolean(availability))
  const selectedIndex = selected
    ? visible.findIndex((project) => project.id === selected.id)
    : -1
  const activeFilters = [
    ...(query ? [{ label: `“${query}”`, clear: () => setQuery("") }] : []),
    ...(field !== "All fields"
      ? [{ label: field, clear: () => setField("All fields") }]
      : []),
    ...(skill ? [{ label: skill, clear: () => setSkill("") }] : []),
    ...(mentor ? [{ label: mentor, clear: () => setMentor("") }] : []),
    ...(availability
      ? [{ label: availability, clear: () => setAvailability("") }]
      : []),
  ]

  function clearFilters() {
    setQuery("")
    setField("All fields")
    setSkill("")
    setMentor("")
    setAvailability("")
  }

  function moveBrief(direction: number) {
    const next = visible[selectedIndex + direction]
    if (!next) return
    setSelected(next)
    briefContent.current?.scrollTo({ top: 0, behavior: "instant" })
  }

  return (
    <section
      id={preview ? "projects" : undefined}
      className={`${styles.catalogue} ${preview ? styles.preview : styles.page}`}
      aria-labelledby={headingId}
    >
      <div className={styles.container}>
        <div className={styles.heading}>
          <div>
            {preview ? (
              <h2 id={headingId}>2026 projects</h2>
            ) : (
              <h1 id={headingId}>Projects</h1>
            )}
            <p>Explore the research projects and mentors in MYSSP.</p>
          </div>
          {preview && (
            <a href={projectsRouteHash} className={styles.browse}>
              All {projects.length} projects{" "}
              <ArrowUpRight size={17} aria-hidden />
            </a>
          )}
        </div>
        {!preview && (
          <nav aria-label="Programme year" className={styles.years}>
            <a href={projectsRouteHash} aria-current="page">
              2026 <span>{projects.length} projects</span>
            </a>
          </nav>
        )}
        {preview ? (
          <ProjectWheel
            items={visible}
            codes={codes}
            iconFor={(track) => fieldIcons[track] ?? Grid2X2}
            onOpen={(project, card) => {
              opener.current = card
              setSelected(project)
              setBriefOpen(true)
            }}
          />
        ) : (
          <div className={styles.layout}>
            <aside className={styles.filters} aria-label="Filter projects">
              <label htmlFor={searchId} className={styles.label}>
                Search projects
              </label>
              <div className={styles.search}>
                <Search size={17} aria-hidden />
                <input
                  id={searchId}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Title, mentor or keyword"
                />
              </div>
              <Collapsible.Root
                open={fieldsOpen}
                onOpenChange={setFieldsOpen}
                className={styles.fields}
              >
                <Collapsible.Trigger className={styles.advancedTrigger}>
                  <Grid2X2 size={17} strokeWidth={1.5} aria-hidden />
                  Research field
                  {field !== "All fields" && (
                    <span
                      className={styles.advancedCount}
                      aria-label="1 selected"
                    >
                      1
                    </span>
                  )}
                  <ChevronDown
                    className={styles.advancedChevron}
                    size={16}
                    aria-hidden
                  />
                </Collapsible.Trigger>
                <Collapsible.Content className={styles.advancedContent}>
                  <fieldset
                    className={styles.fieldOptions}
                    aria-label="Research field"
                  >
                    <div className={styles.fieldList}>
                      {fields.map((item) => {
                        const Icon = fieldIcons[item]
                        const count =
                          item === "All fields"
                            ? matching.length
                            : matching.filter(
                                (project) => project.track === item
                              ).length
                        return (
                          <label key={item} className={styles.field}>
                            <input
                              type="radio"
                              name={`${searchId}-field`}
                              aria-label={item}
                              checked={field === item}
                              onChange={() => setField(item)}
                            />
                            {field === item && (
                              <motion.span
                                className={styles.fieldHighlight}
                                layoutId={`${searchId}-selection`}
                                transition={{
                                  duration: reducedMotion ? 0 : 0.26,
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                              />
                            )}
                            <Icon
                              className={styles.fieldIcon}
                              size={17}
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            <span className={styles.fieldName}>{item}</span>
                            <span className={styles.count} aria-hidden>
                              {count}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                </Collapsible.Content>
              </Collapsible.Root>
              <label className={`${styles.selectLabel} ${styles.mobileField}`}>
                Research field
                <span className={styles.selectWrap}>
                  <select
                    value={field}
                    onChange={(event) => setField(event.target.value)}
                  >
                    {fields.map((item) => (
                      <option key={item} value={item}>
                        {item} (
                        {item === "All fields"
                          ? matching.length
                          : matching.filter((project) => project.track === item)
                              .length}
                        )
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} aria-hidden />
                </span>
              </label>
              <Collapsible.Root
                open={advancedOpen}
                onOpenChange={setAdvancedOpen}
                className={styles.advanced}
              >
                <Collapsible.Trigger className={styles.advancedTrigger}>
                  <SlidersHorizontal size={17} strokeWidth={1.5} aria-hidden />
                  Advanced filters
                  {advancedCount > 0 && (
                    <span className={styles.advancedCount}>
                      {advancedCount}
                    </span>
                  )}
                  <ChevronDown
                    className={styles.advancedChevron}
                    size={16}
                    aria-hidden
                  />
                </Collapsible.Trigger>
                <Collapsible.Content className={styles.advancedContent}>
                  <div className={styles.advancedInner}>
                    <label
                      className={`${styles.selectLabel} ${styles.availability}`}
                    >
                      My availability
                      <span
                        id={`${searchId}-availability-hint`}
                        className={styles.filterHint}
                      >
                        Show projects that fit my schedule
                      </span>
                      <span className={styles.selectWrap}>
                        <select
                          aria-label="My availability"
                          aria-describedby={`${searchId}-availability-hint`}
                          value={availability}
                          onChange={(event) =>
                            setAvailability(event.target.value)
                          }
                        >
                          <option value="">Any time commitment</option>
                          {availabilityOptions.map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} aria-hidden />
                      </span>
                    </label>
                    <label className={styles.selectLabel}>
                      Skill
                      <span className={styles.selectWrap}>
                        <select
                          value={skill}
                          onChange={(event) => setSkill(event.target.value)}
                        >
                          <option value="">All skills</option>
                          {skills.map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} aria-hidden />
                      </span>
                    </label>
                    <label className={styles.selectLabel}>
                      Mentor
                      <span className={styles.selectWrap}>
                        <select
                          value={mentor}
                          onChange={(event) => setMentor(event.target.value)}
                        >
                          <option value="">All mentors</option>
                          {mentors.map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} aria-hidden />
                      </span>
                    </label>
                  </div>
                </Collapsible.Content>
              </Collapsible.Root>
              <ProjectAdvisor visible={visible} />
            </aside>
            <div className={styles.results}>
              <p className="sr-only" role="status">
                {visible.length} {visible.length === 1 ? "project" : "projects"}
                {activeFilters.length > 0 ? ` of ${projects.length}` : ""}
              </p>
              {activeFilters.length > 0 && (
                <div
                  className={styles.activeFilters}
                  aria-label="Applied filters"
                >
                  {activeFilters.map((filter, index) => (
                    <button
                      key={`${index}-${filter.label}`}
                      type="button"
                      onClick={filter.clear}
                      aria-label={`Remove ${filter.label} filter`}
                    >
                      {filter.label}
                      <X size={12} aria-hidden />
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.clear}
                    onClick={clearFilters}
                  >
                    Clear all
                  </button>
                </div>
              )}
              <div className={styles.list}>
                <AnimatePresence mode="popLayout">
                  {visible.map((project, index) => (
                    <motion.button
                      type="button"
                      className={styles.project}
                      key={project.id}
                      layout={reducedMotion ? false : "position"}
                      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                      transition={{
                        duration: reducedMotion ? 0 : 0.36,
                        ease: [0.22, 1, 0.36, 1],
                        delay: Math.min(index, 4) * 0.045,
                        layout: { duration: 0.3 },
                      }}
                      aria-haspopup="dialog"
                      aria-label={`Read ${codes.get(project.id)}: ${project.title}`}
                      onClick={(event) => {
                        opener.current = event.currentTarget
                        setSelected(project)
                        setBriefOpen(true)
                      }}
                    >
                      <img
                        className={styles.portrait}
                        src={project.photo}
                        alt=""
                        width={56}
                        height={56}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className={styles.projectBody}>
                        <div className={styles.projectTitle}>
                          <h3>{project.title}</h3>
                          <ArrowUpRight size={17} aria-hidden />
                        </div>
                        <p className={styles.mentor}>
                          <span>{project.mentor}</span>
                          <span className={styles.institution}>
                            {project.affiliation}
                          </span>
                        </p>
                        <p className={styles.excerpt}>{project.description}</p>
                        <div className={styles.tags}>
                          <span className={styles.code}>
                            {codes.get(project.id)}
                          </span>
                          <span>{project.track}</span>
                          <span>{project.type}</span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
                {visible.length === 0 && (
                  <div className={styles.empty}>
                    <h2>No projects found</h2>
                    <p>Try another keyword or research field.</p>
                    <button type="button" onClick={clearFilters}>
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent
          ref={briefContent}
          aria-describedby={undefined}
          showClose={false}
          className={`${styles.briefDialog} ${styles.animatedDialog}`}
          overlayClassName={styles.dialogOverlay}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            briefContent.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            opener.current?.focus({ preventScroll: true })
          }}
        >
          <div className={styles.briefToolbar}>
            <div className={styles.briefNavigation}>
              <span aria-live="polite">
                {selectedIndex + 1} / {visible.length}
              </span>
              <button
                type="button"
                onClick={() => moveBrief(-1)}
                disabled={selectedIndex <= 0}
                aria-label="Previous project"
              >
                <ArrowLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() => moveBrief(1)}
                disabled={selectedIndex >= visible.length - 1}
                aria-label="Next project"
              >
                <ArrowRight size={17} />
              </button>
              <DialogClose
                className={styles.briefClose}
                aria-label="Close project brief"
              >
                <X size={18} />
              </DialogClose>
            </div>
          </div>
          {selected && (
            <div key={selected.id} className={styles.briefBody}>
              <ProjectBrief project={selected} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

export function Projects() {
  return <ProjectCatalogue preview />
}
export function ProjectsCatalogue() {
  return <ProjectCatalogue />
}
