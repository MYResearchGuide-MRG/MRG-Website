import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  ArrowDownWideNarrow,
  ArrowRight,
  Atom,
  CalendarDays,
  ChevronDown,
  Cpu,
  Dna,
  FlaskConical,
  Grid2X2,
  LockKeyhole,
  Search,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  awardCategories,
  demoBoard,
  projectDraftKey,
  loadDraft,
  newDraft,
  isDraft,
  trackLabels,
  trackOrder,
  type AwardCategory,
  type Board,
  type Draft,
  type Track,
} from "./data"
import { ProjectDetail } from "./ProjectDetail"
import { paginate } from "./pagination"
import { overviewError } from "./overview"
import { libraryHash as root, boardUrl } from "./paths"
import "./projectboard.css"
import { currentProject } from "../admin/demo-access"
import { isProjectEditable, useProjectEditing } from "../admin/project-editing"
import { useProjectBoards } from "../admin/project-registry"
import { useBackend, useLiveBackend, saveLiveDraft } from "../admin/backend"
import { useLibraryVisibility } from "../admin/library-visibility"
import {
  canViewProject,
  visibleProjects,
} from "../admin/library-visibility-model"

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback)
  return () => window.removeEventListener("hashchange", callback)
}
const snapshot = () => window.location.hash
const fieldIcons: Record<Track, LucideIcon> = {
  "AI & Computer Sciences": Cpu,
  Biology: Dna,
  Chemistry: FlaskConical,
  Mathematics: Sigma,
  "Interdisciplinary & Social Sciences": Users,
  Physics: Atom,
}

function FilterOption({
  label,
  icon: Icon,
  count,
  checked,
  onChange,
}: {
  label: string
  icon: LucideIcon
  count: number
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="pb-filter-option">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
      <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
      <span>{label}</span>
      <small aria-hidden="true">{count}</small>
    </label>
  )
}
function Cover({
  board,
}: {
  board: Board & { coverImage?: string; coverAlt?: string }
}) {
  return (
    <div className={`pb-cover ${board.coverImage ? "pb-cover-uploaded" : ""}`}>
      {board.coverImage ? (
        <img
          src={board.coverImage}
          alt={board.coverAlt || board.title}
          loading="lazy"
        />
      ) : (
        <span className="pb-cover-code" aria-hidden="true">
          {board.code}
        </span>
      )}
    </div>
  )
}

function FilterGroup({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string
  icon: LucideIcon
  count: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="pb-filter-group">
      <h3>
        <button
          type="button"
          className="pb-filter-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
          <span>{title}</span>
          {count > 0 && (
            <small
              className="pb-filter-selected-count"
              aria-label={`${count} selected`}
            >
              {count}
            </small>
          )}
          <ChevronDown
            className="pb-filter-chevron"
            size={16}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        className="pb-filter-reveal"
        data-open={open}
        id={id}
        inert={!open}
        aria-hidden={!open}
      >
        <div className="pb-filter-clip">{children}</div>
      </div>
    </div>
  )
}

function ProjectLibrary({
  draft,
  libraryBoards,
  assignedProjectId,
}: {
  draft?: Draft
  libraryBoards: Board[]
  assignedProjectId: string | null
}) {
  const programmeYears = [...new Set(libraryBoards.map(board => board.year))].sort((a, b) => b - a)
  const backend = useBackend()
  const reduceMotion = useReducedMotion()
  const [query, setQuery] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [years, setYears] = useState<number[]>([])
  const [awards, setAwards] = useState<AwardCategory[]>([])
  const [sort, setSort] = useState("code")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [pagination, setPagination] = useState({ key: "", page: 1 })
  const activeFilterCount = tracks.length + years.length + awards.length
  const search = query.trim().toLowerCase()
  const filterKey = JSON.stringify([
    query,
    tracks,
    years,
    awards,
    sort,
    libraryBoards.map((board) => board.id),
  ])
  const filtered = libraryBoards
    .map((board) => {
      const content = useLiveBackend ? backend.drafts[board.id] : draft?.projectId === board.id ? draft : undefined
      return content
        ? {
            ...board,
            title: content.title,
            coverImage: content.coverImage,
            coverAlt: content.coverAlt,
            team: board.team.map((person, index) => ({
              ...person,
              name: content.teamMembers?.[index]?.name ?? person.name,
              school: content.teamMembers?.[index]?.school ?? person.school,
            })),
          }
        : board
    })
    .filter(
      (board) =>
        (!tracks.length || tracks.includes(board.track)) &&
        (!years.length || years.includes(board.year)) &&
        (!awards.length ||
          board.awards.some((award) => awards.includes(award.category))) &&
        `${board.title} ${board.code} ${board.mentor} ${board.type} ${board.team.map((t) => t.name).join(" ")}`
          .toLowerCase()
          .includes(search)
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : a.code.localeCompare(b.code)
    )
  const page = paginate(
    filtered,
    pagination.key === filterKey ? pagination.page : 1
  )
  function changePage(next: number) {
    setPagination({ key: filterKey, page: next })
    document
      .getElementById("project-library-heading")
      ?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" })
  }
  function reset() {
    setPagination({ key: "", page: 1 })
    setQuery("")
    setTracks([])
    setYears([])
    setAwards([])
  }

  return (
    <main className="pb-main">
      <section className="pb-library-intro">
        <h1 id="project-library-heading" tabIndex={-1}>
          Project Archive
        </h1>
        {assignedProjectId && <a className="pb-button" href={boardUrl(assignedProjectId)}>My project <ArrowRight size={16} /></a>}
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
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </button>
          ) : null}
        </label>
      </section>
      <div className="pb-library-layout">
        <aside
          className={`pb-filters ${filtersOpen ? "is-open" : ""}`}
          aria-label="Filter projects"
        >
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
              {activeFilterCount || search ? (
                <button onClick={reset}>Clear all</button>
              ) : null}
            </div>
            <FilterGroup title="Year" icon={CalendarDays} count={years.length}>
              <div className="pb-filter-options">
                <FilterOption
                  label="All years"
                  icon={Grid2X2}
                  count={libraryBoards.length}
                  checked={!years.length}
                  onChange={() => setYears([])}
                />
                {programmeYears.map((year) => (
                  <FilterOption
                    key={year}
                    label={String(year)}
                    icon={CalendarDays}
                    count={
                      libraryBoards.filter((board) => board.year === year)
                        .length
                    }
                    checked={years.includes(year)}
                    onChange={() =>
                      setYears((current) =>
                        current.includes(year)
                          ? current.filter((value) => value !== year)
                          : [...current, year]
                      )
                    }
                  />
                ))}
              </div>
            </FilterGroup>
            <FilterGroup
              title="Research field"
              icon={Grid2X2}
              count={tracks.length}
            >
              <div className="pb-filter-options">
                <FilterOption
                  label="All fields"
                  icon={Grid2X2}
                  count={libraryBoards.length}
                  checked={!tracks.length}
                  onChange={() => setTracks([])}
                />
                {trackOrder.map((track) => (
                  <FilterOption
                    key={track}
                    label={trackLabels[track]}
                    icon={fieldIcons[track]}
                    count={
                      libraryBoards.filter((board) => board.track === track)
                        .length
                    }
                    checked={tracks.includes(track)}
                    onChange={() =>
                      setTracks((current) =>
                        current.includes(track)
                          ? current.filter((t) => t !== track)
                          : [...current, track]
                      )
                    }
                  />
                ))}
              </div>
            </FilterGroup>
            <FilterGroup title="Award" icon={Trophy} count={awards.length}>
              <div className="pb-filter-options">
                <FilterOption
                  label="All projects"
                  icon={Grid2X2}
                  count={libraryBoards.length}
                  checked={!awards.length}
                  onChange={() => setAwards([])}
                />
                {awardCategories.map(({ id, label }) => (
                  <FilterOption
                    key={id}
                    label={label}
                    icon={id === "main" ? Trophy : Sparkles}
                    count={
                      libraryBoards.filter((board) =>
                        board.awards.some((award) => award.category === id)
                      ).length
                    }
                    checked={awards.includes(id)}
                    onChange={() =>
                      setAwards((current) =>
                        current.includes(id)
                          ? current.filter((value) => value !== id)
                          : [...current, id]
                      )
                    }
                  />
                ))}
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
            <label className="pb-sort">
              <span>Sort by</span>
              <span className="pb-sort-control">
                <ArrowDownWideNarrow
                  className="pb-sort-icon"
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort projects"
                >
                  <option value="code">Project code</option>
                  <option value="title">Title A to Z</option>
                </select>
                <ChevronDown
                  className="pb-sort-chevron"
                  size={14}
                  aria-hidden="true"
                />
              </span>
            </label>
          </div>
          <div className="pb-project-grid">
            <AnimatePresence mode="popLayout">
              {page.items.map((board, index) => (
                <motion.div
                  className="pb-card-item"
                  key={board.id}
                  layout={reduceMotion ? false : "position"}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    transition: { duration: reduceMotion ? 0 : 0.14 },
                  }}
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
                    </div>
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {filtered.length > 0 && (
            <nav className="pb-pagination" aria-label="Project pages">
              <button
                className="pb-button"
                disabled={page.page === 1}
                onClick={() => changePage(page.page - 1)}
              >
                Previous
              </button>
              <div>
                {Array.from({ length: page.totalPages }, (_, i) => i + 1).map(
                  (number) => (
                    <button
                      key={number}
                      className="pb-button"
                      aria-label={`Page ${number}`}
                      aria-current={page.page === number ? "page" : undefined}
                      onClick={() => changePage(number)}
                    >
                      {number}
                    </button>
                  )
                )}
              </div>
              <button
                className="pb-button"
                disabled={page.page === page.totalPages}
                onClick={() => changePage(page.page + 1)}
              >
                Next
              </button>
            </nav>
          )}
          {!filtered.length && (
            <div className="pb-empty">
              <Search size={28} />
              <h3>
                {!libraryBoards.length
                  ? "Research projects are coming soon."
                  : "No projects match these filters."}
              </h3>
              <p>
                {!libraryBoards.length
                  ? "Completed team projects will be shared here when they are ready."
                  : "Try another year, research field, award or search term."}
              </p>
              {libraryBoards.length > 0 && (
                <button className="pb-button" onClick={reset}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default function Projectboard({
  assignedProjectId,
  onSignIn,
  onEditStateChange,
}: {
  assignedProjectId: string | null
  onSignIn: () => void
  onEditStateChange: (state: { dirty: boolean; busy: boolean }) => void
}) {
  const hash = useSyncExternalStore(subscribe, snapshot)
  const boards = useProjectBoards()
  const visibility = useLibraryVisibility()
  const editingPermissions = useProjectEditing()
  const backend = useBackend()
  const assignedBoard = boards.find((p) => p.id === assignedProjectId)
  const signedIn = Boolean(assignedBoard)
  const [draft, setDraft] = useState(() =>
    loadDraft(assignedBoard || demoBoard)
  )
  const path = hash.slice(root.length).split("?")[0]
  const projectId = path.startsWith("/project/")
    ? path.slice("/project/".length)
    : null
  const isWorkspace = path === "/workspace"
  const board =
    isWorkspace && signedIn
      ? assignedBoard
      : boards.find((project) => project.id === projectId)
  useEffect(() => {
    if (isWorkspace && assignedBoard)
      window.location.hash = boardUrl(assignedBoard.id)
  }, [isWorkspace, assignedBoard])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [hash])
  async function save(next: Draft, expectedRevision:number) {
    // The live submission RPC also enforces membership, locks and revisions.
    if (
      !assignedBoard ||
      !isProjectEditable(assignedBoard.id) ||
      !isDraft(next, assignedBoard) ||
      next.projectId !== currentProject() ||
      next.overviewFormat !== "markdown" ||
      overviewError(next) ||
      !next.title.trim() ||
      next.title.length > 240
    )
      return false
    try {
      if (useLiveBackend) return await saveLiveDraft(next, expectedRevision)
      localStorage.setItem(projectDraftKey(assignedBoard), JSON.stringify(next))
      setDraft(next)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="pb-root">
      <div className="pb-page-transition" key={path}>
        {isWorkspace && !signedIn ? (
          <main className="pb-main pb-access-required">
            <LockKeyhole size={32} />
            <h1>Your team’s workspace.</h1>
            <p>
              Participant access is by private invitation.
              <br />
              Sign in to continue to your project.
            </p>
            <button className="pb-button pb-primary" onClick={onSignIn}>
              Participant sign in
              <ArrowRight size={16} />
            </button>
            <a href={root}>Return to the project archive</a>
          </main>
        ) : projectId || isWorkspace ? (
          board && canViewProject(visibility, board.id, assignedProjectId) ? (
            <ProjectDetail
              key={`${board.id}-${signedIn}`}
              board={board}
              editable={board.id === assignedProjectId && editingPermissions[board.id] === true}
              owner={board.id === assignedProjectId}
              revision={backend.revisions[board.id] || 0}
              savedDraft={
                useLiveBackend ? backend.drafts[board.id] || (board.id === assignedProjectId ? newDraft(board) : undefined) : signedIn && board.id === assignedProjectId ? draft : undefined
              }
              onSave={save}
              onEditStateChange={onEditStateChange}
            />
          ) : (
            <main className="pb-main pb-empty">
              <h1>Project not available.</h1>
              <a className="pb-button" href={root}>
                Back to project archive
              </a>
            </main>
          )
        ) : (
          <ProjectLibrary
            assignedProjectId={assignedProjectId}
            libraryBoards={visibleProjects(boards, visibility)}
            draft={signedIn ? draft : undefined}
          />
        )}
      </div>
    </div>
  )
}
