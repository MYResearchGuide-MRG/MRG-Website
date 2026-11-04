import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FileText,
  FolderOpen,
  LockKeyhole,
  Mail,
  Pencil,
  Play,
  Presentation,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  awardCategories,
  boards,
  demoBoard,
  draftKey,
  loadDraft,
  programmeYears,
  trackLabels,
  trackOrder,
  validMaterialUrl,
  type AwardCategory,
  type Board,
  type Draft,
  type Track,
} from "./data"
import { ProjectArtwork } from "./ProjectArtwork"
import { OverviewContent, OverviewEditor } from "./OverviewEditor"
import "./projectboard.css"

const root = "#/projectboard"
const boardUrl = (id: string) => `${root}/project/${id}`
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback)
  return () => window.removeEventListener("hashchange", callback)
}
const snapshot = () => window.location.hash
const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")

function Cover({ board, large = false }: { board: Board; large?: boolean }) {
  return (
    <div className={`pb-cover ${large ? "pb-cover-large" : ""}`}>
      <div className="pb-cover-top">
        <span>{trackLabels[board.track]}</span>
        <span>{board.code}</span>
      </div>
      <ProjectArtwork track={board.track} variant={boards.indexOf(board)} />
      <div className="pb-cover-bottom">
        <span>MYSSP / {board.year}</span>
        <span>
          Research in progress <span className="pb-dot" />
        </span>
      </div>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="pb-filter-group">
      <h3>
        <button
          className="pb-filter-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          {title}
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </h3>
      <div className="pb-filter-reveal" data-open={open} id={id} inert={!open} aria-hidden={!open}>
        <div className="pb-filter-clip">{children}</div>
      </div>
    </div>
  )
}

function ProjectLibrary() {
  const reduceMotion = useReducedMotion()
  const [query, setQuery] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [years, setYears] = useState<number[]>([])
  const [awards, setAwards] = useState<AwardCategory[]>([])
  const [sort, setSort] = useState("code")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount = tracks.length + years.length + awards.length
  const awardsAnnounced = boards.some((board) => board.awards.length > 0)
  const search = query.trim().toLowerCase()
  const filtered = boards
    .filter(
      (board) =>
        (!tracks.length || tracks.includes(board.track)) &&
        (!years.length || years.includes(board.year)) &&
        (!awards.length || board.awards.some((award) => awards.includes(award.category))) &&
        `${board.title} ${board.code} ${board.mentor} ${board.type} ${board.team.map((t) => t.name).join(" ")}`
          .toLowerCase()
          .includes(search)
    )
    .sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title) : a.code.localeCompare(b.code)
    )
  function reset() {
    setQuery("")
    setTracks([])
    setYears([])
    setAwards([])
  }

  return (
    <main className="pb-main">
      <section className="pb-library-intro">
        <h1>Projectboard</h1>
      </section>
      <div className="pb-library-toolbar">
        <div>
          <h2>Project library</h2>
          <span className="pb-count">{boards.length}</span>
        </div>
        <label className="pb-search">
          <Search size={18} />
          <span className="pb-sr-only">Search projects</span>
          <input
            type="search"
            placeholder="Search projects, students or mentors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          ) : null}
        </label>
      </div>
      <div className="pb-library-layout">
        <aside className={`pb-filters ${filtersOpen ? "is-open" : ""}`}>
          <button
            className="pb-mobile-filter pb-button"
            aria-expanded={filtersOpen}
            aria-controls="pb-library-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={16} /> Filter projects{" "}
            {activeFilterCount ? `(${activeFilterCount})` : ""}
          </button>
          <div className="pb-filter-content" id="pb-library-filters">
            <div className="pb-filter-heading">
              <h3>Filters</h3>
              {activeFilterCount || search ? <button onClick={reset}>Clear all</button> : null}
            </div>
            <FilterGroup title="Year">
              <div className="pb-filter-options">
                <label className="pb-check">
                  <input type="checkbox" checked={!years.length} onChange={() => setYears([])} />
                  <span>All years</span>
                  <small>{boards.length}</small>
                </label>
                {programmeYears.map((year) => (
                  <label className="pb-check" key={year}>
                    <input
                      type="checkbox"
                      checked={years.includes(year)}
                      onChange={() =>
                        setYears((current) =>
                          current.includes(year)
                            ? current.filter((value) => value !== year)
                            : [...current, year]
                        )
                      }
                    />
                    <span>{year}</span>
                    <small>{boards.filter((board) => board.year === year).length}</small>
                  </label>
                ))}
              </div>
            </FilterGroup>
            <FilterGroup title="Research field">
              <div className="pb-filter-options">
                <label className="pb-check">
                  <input type="checkbox" checked={!tracks.length} onChange={() => setTracks([])} />
                  <span>All fields</span>
                  <small>{boards.length}</small>
                </label>
                {trackOrder.map((track) => (
                  <label className="pb-check" key={track}>
                    <input
                      type="checkbox"
                      checked={tracks.includes(track)}
                      onChange={() =>
                        setTracks((current) =>
                          current.includes(track)
                            ? current.filter((t) => t !== track)
                            : [...current, track]
                        )
                      }
                    />
                    <span>{trackLabels[track]}</span>
                    <small>{boards.filter((board) => board.track === track).length}</small>
                  </label>
                ))}
              </div>
            </FilterGroup>
            <FilterGroup title="Award">
              <div className="pb-filter-options">
                <label className="pb-check">
                  <input type="checkbox" checked={!awards.length} onChange={() => setAwards([])} />
                  <span>All projects</span>
                  <small>{boards.length}</small>
                </label>
                {awardCategories.map(({ id, label }) => (
                  <label className="pb-check" key={id}>
                    <input
                      type="checkbox"
                      checked={awards.includes(id)}
                      onChange={() =>
                        setAwards((current) =>
                          current.includes(id)
                            ? current.filter((value) => value !== id)
                            : [...current, id]
                        )
                      }
                    />
                    <span>{label}</span>
                    <small>
                      {
                        boards.filter((board) =>
                          board.awards.some((award) => award.category === id)
                        ).length
                      }
                    </small>
                  </label>
                ))}
                {!awardsAnnounced ? (
                  <p className="pb-filter-note">Awards have not been announced yet.</p>
                ) : null}
              </div>
            </FilterGroup>
          </div>
        </aside>
        <section aria-label="Project results" className="pb-results">
          <div className="pb-result-bar">
            <span aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "project" : "projects"}
              {search || activeFilterCount ? " found" : " to explore"}
            </span>
            <label>
              Sort by{" "}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort projects"
              >
                <option value="code">Project code</option>
                <option value="title">Title A to Z</option>
              </select>
            </label>
          </div>
          <div className="pb-project-grid">
            <AnimatePresence mode="popLayout">
              {filtered.map((board, index) => (
                <motion.div
                  className="pb-card-item"
                  key={board.id}
                  layout={reduceMotion ? false : "position"}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.14 } }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.38,
                    ease: [0.22, 1, 0.36, 1],
                    opacity: {
                      duration: reduceMotion ? 0 : 0.28,
                      delay: reduceMotion ? 0 : Math.min(index, 5) * 0.035,
                    },
                    layout: { duration: reduceMotion ? 0 : 0.38 },
                  }}
                >
                  <a className="pb-project-card" href={boardUrl(board.id)}>
                    <Cover board={board} />
                    <div className="pb-project-card-copy">
                      <div className="pb-card-meta">
                        <span>{board.code}</span>
                        <span>{board.year} cohort</span>
                      </div>
                      <h3>{board.title}</h3>
                      <p>
                        {board.team.length
                          ? board.team.map((person) => person.name).join(", ")
                          : `MYSSP ${board.code} team`}
                      </p>
                      <div className="pb-card-footer">
                        <span>View project</span>
                        <ArrowUpRight size={18} />
                      </div>
                    </div>
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {!filtered.length && (
            <div className="pb-empty">
              <Search size={28} />
              <h3>
                {awards.length && !awardsAnnounced
                  ? "Award results are coming later."
                  : "No projects match these filters."}
              </h3>
              <p>
                {awards.length && !awardsAnnounced
                  ? "Main and special award recipients will appear here once announced."
                  : "Try another year, research field, award or search term."}
              </p>
              <button className="pb-button" onClick={reset}>
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

const materialSpecs = [
  {
    key: "slides",
    title: "Presentation slides",
    description: "The project at a glance",
    icon: Presentation,
  },
  {
    key: "paper",
    title: "Research write-up",
    description: "Methods, findings and references",
    icon: FileText,
  },
  {
    key: "video",
    title: "Video presentation",
    description: "Hear from the student team",
    icon: Play,
  },
] as const

function ProjectDetail({
  board,
  draft,
  owner,
  onSignIn,
}: {
  board: Board
  draft?: Draft
  owner: boolean
  onSignIn: () => void
}) {
  const [tab, setTab] = useState("overview")
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  async function share() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${window.location.pathname}${boardUrl(board.id)}`
      )
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }
  return (
    <main className="pb-main pb-detail">
      <div className="pb-breadcrumb">
        <a href={root}>
          <ArrowLeft size={15} /> Project library
        </a>
        <span>/</span>
        <span>{board.code}</span>
      </div>
      {draft ? (
        <div className="pb-draft-banner">
          <LockKeyhole size={16} />
          <span>Draft preview. Only saved in this browser.</span>
          <a href={`${root}/workspace`}>
            Back to editor <Pencil size={14} />
          </a>
        </div>
      ) : null}
      <div className="pb-project-hero">
        <div className="pb-project-hero-copy">
          <div className="pb-tag-row">
            <span className="pb-code">{board.code}</span>
            <span>{board.track}</span>
          </div>
          <h1>{draft?.title || board.title}</h1>
          <p>{board.type}</p>
          <div className="pb-hero-team">
            <div className="pb-avatar-stack">
              {board.team.slice(0, 3).map((person) => (
                <span key={person.name}>{initials(person.name)}</span>
              ))}
            </div>
            <span>
              {board.team.length
                ? `${board.team.length} student researchers`
                : "MYSSP student team"}
              <small>MYSSP 2026 · Malaysia</small>
            </span>
          </div>
        </div>
        <Cover board={board} large />
      </div>
      <div className="pb-board-layout">
        <div className="pb-board-content">
          <div className="pb-tabs" role="tablist" aria-label="Project sections">
            {["overview", "materials", "team"].map((name) => (
              <button
                role="tab"
                aria-selected={tab === name}
                aria-controls={`pb-panel-${name}`}
                id={`pb-tab-${name}`}
                key={name}
                onClick={() => setTab(name)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault()
                    const names = ["overview", "materials", "team"]
                    const next = names[(names.indexOf(name) + (e.key === "ArrowRight" ? 1 : 2)) % 3]
                    setTab(next)
                    document.getElementById(`pb-tab-${next}`)?.focus()
                  }
                }}
                tabIndex={tab === name ? 0 : -1}
              >
                {name === "overview"
                  ? "Overview"
                  : name === "materials"
                    ? "Project materials"
                    : "The team"}
              </button>
            ))}
          </div>
          <div
            className="pb-tab-panel"
            role="tabpanel"
            id={`pb-panel-${tab}`}
            aria-labelledby={`pb-tab-${tab}`}
            key={tab}
          >
            {tab === "overview" ? (
              <>
                <section>
                  <h2>About this research</h2>
                  <OverviewContent
                    text={draft?.summary || board.description}
                    format={draft?.overviewFormat}
                  />
                </section>
                {draft?.question ? (
                  <section className="pb-research-question">
                    <span>The research question</span>
                    <OverviewContent text={draft.question} format={draft.overviewFormat} />
                  </section>
                ) : null}
                <section>
                  <h2>Research approach</h2>
                  {draft?.overviewFormat === "markdown" && draft.method ? (
                    <OverviewContent text={draft.method} format="markdown" />
                  ) : (
                    <ol className="pb-method-list">
                      {(draft?.method || board.tasks.slice(0, 4).join("\n"))
                        .split("\n")
                        .filter(Boolean)
                        .map((task, i) => (
                          <li key={`${i}-${task}`}>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            <p>{task}</p>
                          </li>
                        ))}
                    </ol>
                  )}
                </section>
                <section>
                  <h2>Findings</h2>
                  {draft?.findings ? (
                    <OverviewContent text={draft.findings} format={draft.overviewFormat} />
                  ) : (
                    <div className="pb-in-progress">
                      <span className="pb-dot" />
                      <div>
                        <strong>The research is still underway.</strong>
                        <p>The team’s findings will appear here when they are ready to share.</p>
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : tab === "materials" ? (
              <section>
                <h2>From the project team</h2>
                <p className="pb-muted">
                  Slides, the full write-up and a short video presentation.
                </p>
                <div className="pb-material-list">
                  {materialSpecs.map(({ key, title, description, icon: Icon }) => (
                    <div className="pb-material" key={key}>
                      <Icon size={24} />
                      <div>
                        <h3>{title}</h3>
                        <p>{description}</p>
                      </div>
                      {draft?.[key] && validMaterialUrl(draft[key]) ? (
                        <a
                          className="pb-button"
                          href={draft[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open <ArrowUpRight size={15} />
                        </a>
                      ) : (
                        <span className="pb-not-yet">Not added yet</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="pb-small-note">
                  These are sample boards. Participant submissions have not been uploaded to this
                  preview.
                </p>
              </section>
            ) : (
              <section>
                <h2>The people behind the project</h2>
                <div className="pb-team-list">
                  {board.team.length ? (
                    board.team.map((person) => (
                      <div key={person.name}>
                        <span className="pb-avatar">{initials(person.name)}</span>
                        <div>
                          <h3>{person.name}</h3>
                          <p>{person.school}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="pb-muted">
                      Team profiles will be added by the programme committee.
                    </p>
                  )}
                </div>
                <h2>Research mentor</h2>
                <div className="pb-mentor">
                  <img src={board.photo} alt={board.mentor} loading="lazy" />
                  <div>
                    <h3>{board.mentor}</h3>
                    <p>{board.affiliation}</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
        <aside className="pb-project-sidebar">
          <div className="pb-info-card">
            <span className="pb-status">
              <span className="pb-dot" /> Research in progress
            </span>
            <dl>
              <div>
                <dt>Programme</dt>
                <dd>MYSSP 2026</dd>
              </div>
              <div>
                <dt>Project code</dt>
                <dd>{board.code}</dd>
              </div>
              <div>
                <dt>Mentor</dt>
                <dd>{board.mentor}</dd>
              </div>
              <div>
                <dt>Institution</dt>
                <dd>{board.affiliation}</dd>
              </div>
            </dl>
            <button className="pb-button pb-full" onClick={share}>
              {copied ? <Check size={16} /> : <ExternalLink size={16} />}
              {copied ? "Project link copied" : "Copy project link"}
            </button>
            {copyError ? (
              <p role="status" className="pb-small-note">
                Copy the address from your browser to share this project.
              </p>
            ) : null}
          </div>
          <div className="pb-owner-note">
            <LockKeyhole size={18} />
            <h3>Part of this team?</h3>
            <p>Sign in to update your project and add your submissions.</p>
            {owner && board.id === demoBoard.id ? (
              <a href={`${root}/workspace`}>
                Edit your project <ArrowRight size={15} />
              </a>
            ) : (
              <button onClick={onSignIn}>
                Participant sign in <ArrowRight size={15} />
              </button>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}

function AccessDialog({
  open,
  onClose,
  onEnter,
}: {
  open: boolean
  onClose: () => void
  onEnter: () => void
}) {
  const [invite, setInvite] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  function submit(e: FormEvent) {
    e.preventDefault()
    onEnter()
    onClose()
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose()
          setInvite(false)
        }
      }}
    >
      <DialogContent className="pb-modal">
        <div className="pb-auth-symbol">
          <LockKeyhole size={23} />
        </div>
        <p className="pb-eyebrow">MYSSP participant access</p>
        <DialogTitle>{invite ? "Your project is waiting." : "Welcome back."}</DialogTitle>
        <DialogDescription>
          {invite
            ? "You’ve been invited to join your team’s Projectboard."
            : "Sign in to work on your project. Your board, materials and team live here."}
        </DialogDescription>
        {invite ? (
          <div className="pb-invite-project">
            <span>{demoBoard.code} / MYSSP 2026</span>
            <strong>{demoBoard.title}</strong>
            <small>Sample invitation for the prototype</small>
          </div>
        ) : null}
        <form onSubmit={submit}>
          {invite ? (
            <label className="pb-field">
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="off"
              />
            </label>
          ) : null}
          <label className="pb-field">
            Participant email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="off"
              required
            />
          </label>
          <button type="submit" className="pb-button pb-primary pb-full">
            {invite ? "Accept invite (demo)" : "Open workspace (demo)"}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="pb-invite-info">
          <Mail size={18} />
          <p>
            New here? Account invitations are sent privately by the MYSSP team. There is no public
            sign-up.
          </p>
        </div>
        <button className="pb-text-button" onClick={() => setInvite(!invite)}>
          {invite ? "Back to sign in" : "Preview an invitation"}
          <ArrowUpRight size={14} />
        </button>
        <p className="pb-demo-note">
          Prototype only. No email is sent and no account is created. Use any example email to try
          the editor.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function Workspace({
  savedDraft,
  onSave,
  onPreview,
}: {
  savedDraft: Draft
  onSave: (draft: Draft) => boolean
  onPreview: (draft: Draft) => void
}) {
  const [draft, setDraft] = useState(savedDraft)
  const [section, setSection] = useState("basics")
  const [status, setStatus] = useState("")
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft)
  const steps = [
    { id: "basics", label: "Project overview", icon: FolderOpen },
    { id: "research", label: "Your research", icon: FileText },
    { id: "materials", label: "Submission materials", icon: Presentation },
  ]
  const filled = [
    draft.title,
    draft.summary,
    draft.question,
    draft.method,
    draft.findings,
    draft.slides,
    draft.paper,
    draft.video,
  ].filter((value) => value.trim()).length
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  function update<K extends Exclude<keyof Draft, "version" | "projectId" | "savedAt">>(
    key: K,
    value: Draft[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setStatus("")
  }
  function validate() {
    if (!draft.title.trim() || !draft.summary.trim()) {
      setStatus("Add a project title and summary before saving.")
      setSection("basics")
      return false
    }
    if (![draft.slides, draft.paper, draft.video].every(validMaterialUrl)) {
      setStatus("Use a full https:// or http:// link for each material.")
      setSection("materials")
      return false
    }
    return true
  }
  function save(preview = false) {
    if (!validate()) return
    const next = { ...draft, savedAt: new Date().toISOString() }
    if (onSave(next)) {
      setDraft(next)
      setStatus("Draft saved in this browser.")
      if (preview) onPreview(next)
    } else
      setStatus(
        "Your browser could not save this draft. Keep this page open and copy your changes."
      )
  }
  return (
    <main className="pb-main pb-workspace">
      <div className="pb-breadcrumb">
        <a href={root}>
          <ArrowLeft size={15} /> Project library
        </a>
        <span>/</span>
        <span>Participant workspace</span>
      </div>
      <div className="pb-workspace-heading">
        <div>
          <p className="pb-eyebrow">Your Projectboard / {demoBoard.code}</p>
          <h1>Edit project</h1>
        </div>
        <span className="pb-private">
          <LockKeyhole size={14} /> Private draft
        </span>
      </div>
      <div className="pb-workspace-grid">
        <aside className="pb-workspace-nav">
          <div className="pb-workspace-project">
            <span>{demoBoard.code}</span>
            <strong>{demoBoard.title}</strong>
            <small>MYSSP 2026</small>
          </div>
          <nav aria-label="Editor sections">
            {steps.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={section === id ? "is-active" : ""}
                onClick={() => setSection(id)}
              >
                <Icon size={18} />
                {label}
                <ChevronRight size={14} />
              </button>
            ))}
          </nav>
          <div className="pb-completion">
            <div>
              <span>Board checklist</span>
              <span>{filled}/8</span>
            </div>
            <progress value={filled} max={8} />
            <p>You can save and return at any time.</p>
          </div>
        </aside>
        <section className="pb-editor" aria-label="Project editor">
          <div className="pb-editor-top">
            <span>
              <span className="pb-dot" />{" "}
              {dirty ? "Unsaved changes" : savedDraft.savedAt ? "Draft saved" : "Sample draft"}
            </span>
            <button className="pb-text-button" onClick={() => save(true)}>
              Preview board <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="pb-editor-body" key={section}>
            <h2>{steps.find((step) => step.id === section)?.label}</h2>
            <p className="pb-muted">
              {section === "basics"
                ? "Start with a clear title and a short explanation of your project."
                : section === "research"
                  ? "Explain the question, how you approached it and what you found."
                  : "Link your final materials. You can add them when they are ready."}
            </p>
            {section !== "materials" && (
              <div className="pb-format-row">
                <span>Overview format</span>
                <div className="pb-format-switch" role="group" aria-label="Overview format">
                  <button
                    type="button"
                    aria-pressed={(draft.overviewFormat ?? "plain") === "plain"}
                    onClick={() => update("overviewFormat", "plain")}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    aria-pressed={draft.overviewFormat === "markdown"}
                    onClick={() => update("overviewFormat", "markdown")}
                  >
                    Markdown
                  </button>
                </div>
              </div>
            )}
            {section === "basics" ? (
              <>
                <label className="pb-field">
                  Project title{" "}
                  <input
                    value={draft.title}
                    maxLength={240}
                    onChange={(e) => update("title", e.target.value)}
                  />
                </label>
                <OverviewEditor
                  label="Project summary"
                  value={draft.summary}
                  format={draft.overviewFormat ?? "plain"}
                  onChange={(value) => update("summary", value)}
                  maxLength={3000}
                />
                <div className="pb-read-only">
                  <span>Research field</span>
                  <strong>{demoBoard.track}</strong>
                  <small>Assigned by the MYSSP committee</small>
                </div>
              </>
            ) : section === "research" ? (
              <>
                <OverviewEditor
                  label="Research question"
                  value={draft.question}
                  format={draft.overviewFormat ?? "plain"}
                  onChange={(value) => update("question", value)}
                  maxLength={1000}
                  rows={3}
                />
                <OverviewEditor
                  label="Method and approach"
                  value={draft.method}
                  format={draft.overviewFormat ?? "plain"}
                  onChange={(value) => update("method", value)}
                  maxLength={6000}
                />
                <OverviewEditor
                  label="Findings"
                  value={draft.findings}
                  format={draft.overviewFormat ?? "plain"}
                  onChange={(value) => update("findings", value)}
                  maxLength={6000}
                  rows={5}
                />
              </>
            ) : (
              <>
                {materialSpecs.map(({ key, title, description, icon: Icon }) => (
                  <label key={key} className="pb-field pb-material-field">
                    <span>
                      <Icon size={18} />
                      {title}
                    </span>
                    <small>{description}</small>
                    <input
                      type="url"
                      value={draft[key]}
                      onChange={(e) => update(key, e.target.value)}
                      placeholder="https://"
                    />
                    <small>Use a shareable link that viewers can open.</small>
                  </label>
                ))}
                <p className="pb-demo-note">
                  File uploads and private submission permissions will be connected with participant
                  accounts. This preview saves links locally.
                </p>
              </>
            )}
          </div>
          <div className="pb-editor-actions">
            <p role="status">{status || "Your draft stays private until you submit it."}</p>
            <button className="pb-button pb-primary" onClick={() => save()}>
              <CheckCheck size={16} />
              Save draft
            </button>
          </div>
        </section>
      </div>
      <div className="pb-workspace-note">
        <CircleHelp size={17} />
        <p>
          This is a sample participant workspace for {demoBoard.code}. Saving here does not change
          the public library or submit anything to MYSSP.
        </p>
      </div>
    </main>
  )
}

export default function Projectboard() {
  const hash = useSyncExternalStore(subscribe, snapshot)
  const [signedIn, setSignedIn] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [draft, setDraft] = useState(loadDraft)
  const path = hash.slice(root.length).split("?")[0]
  const projectId = path.startsWith("/project/") ? path.slice("/project/".length) : null
  const board = boards.find((project) => project.id === projectId)
  const isWorkspace = path === "/workspace"
  const isDraftPreview =
    signedIn &&
    board?.id === demoBoard.id &&
    new URLSearchParams(hash.split("?")[1] || "").get("draft") === "1"
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [hash])
  function save(next: Draft) {
    try {
      localStorage.setItem(draftKey, JSON.stringify(next))
      setDraft(next)
      return true
    } catch {
      return false
    }
  }
  function enter() {
    setSignedIn(true)
    window.location.hash = `${root}/workspace`
  }

  return (
    <div className="pb-root">
      <div className="pb-prototype-strip">
        <span>Local prototype</span>
        <p>Sample boards. No live submissions or accounts.</p>
      </div>
      <div className="pb-module-bar">
        <a className="pb-module-home" href={root}>
          <img src="/myssp-logo.png" alt="Malaysia Science Scholar’s Programme" />
          <span>Projectboard</span>
        </a>
        <div>
          {signedIn ? (
            <>
              <a className="pb-button" href={`${root}/workspace`}>
                <Pencil size={15} />
                My project
              </a>
              <button
                className="pb-text-button"
                onClick={() => {
                  setSignedIn(false)
                  window.location.hash = root
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button className="pb-button" onClick={() => setAccessOpen(true)}>
              <LockKeyhole size={15} />
              Participant sign in
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="pb-page-transition" key={path}>
        {isWorkspace ? (
          signedIn ? (
            <Workspace
              savedDraft={draft}
              onSave={save}
              onPreview={() => {
                window.location.hash = `${boardUrl(demoBoard.id)}?draft=1`
              }}
            />
          ) : (
            <main className="pb-main pb-access-required">
              <LockKeyhole size={32} />
              <h1>Your team’s workspace.</h1>
              <p>
                Participant access is by private invitation.
                <br />
                Sign in to continue to your project.
              </p>
              <button className="pb-button pb-primary" onClick={() => setAccessOpen(true)}>
                Participant sign in
                <ArrowRight size={16} />
              </button>
              <a href={root}>Return to the project library</a>
            </main>
          )
        ) : projectId ? (
          board ? (
            <ProjectDetail
              key={`${board.id}-${isDraftPreview}`}
              board={board}
              draft={isDraftPreview ? draft : undefined}
              owner={signedIn}
              onSignIn={() => setAccessOpen(true)}
            />
          ) : (
            <main className="pb-main pb-empty">
              <h1>Project not found.</h1>
              <a className="pb-button" href={root}>
                Back to project library
              </a>
            </main>
          )
        ) : (
          <ProjectLibrary />
        )}
      </div>
      <div className="pb-preview-end">
        <a href="#/">
          Back to MYSSP <ArrowUpRight size={14} />
        </a>
        <span>Projectboard component preview · 2026</span>
      </div>
      <AccessDialog open={accessOpen} onClose={() => setAccessOpen(false)} onEnter={enter} />
    </div>
  )
}
