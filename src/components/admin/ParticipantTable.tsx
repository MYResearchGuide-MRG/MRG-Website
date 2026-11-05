import { useEffect, useRef, useState } from "react"
import {
  ArrowDownToLine,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Pencil,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react"
import type { Assignment } from "./access-model"
import { accessStatus } from "./access-model"
import type { Board } from "../projectboard/data"
import { useBackend, useLiveBackend } from "./backend"
import { AdminSelect } from "./AdminSelect"
import {
  downloadCsv,
  filterParticipants,
  participantInitials,
  participantsCsv,
} from "./participant-tools"

export function ParticipantTable({
  boards,
  people,
  project,
  onProject,
  busy,
  onEdit,
  onDelete,
  onInvite,
  onPreview,
  onAdd,
}: {
  boards: Board[]
  people: Assignment[]
  project: string
  onProject: (id: string) => void
  busy: boolean
  onEdit: (id: string) => void
  onDelete: (person: Assignment) => void
  onInvite: (ids: string[]) => void
  onPreview: (id: string) => void
  onAdd: () => void
}) {
  const backend = useBackend()
  const teamCount = new Set(
    people.filter((person) => !person.revoked).map((person) => person.projectId)
  ).size
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [sort, setSort] = useState("project")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [now, setNow] = useState(Date.now)
  const allCheckbox = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])
  const filtered = filterParticipants(
    people,
    boards,
    query,
    project,
    status,
    sort,
    now
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12))
  const currentPage = Math.min(page, pageCount)
  const shown = filtered.slice((currentPage - 1) * 12, currentPage * 12)
  // Selection covers the filtered roster, not just the current table page.
  // Only current matches can be included in a bulk action.
  const selectedIds = new Set(selected)
  const chosen = filtered.filter((person) => selectedIds.has(person.id))
  const eligible = chosen.filter(
    (person) =>
      !person.revoked && boards.some((board) => board.id === person.projectId)
  )
  const allSelected = filtered.length > 0 && chosen.length === filtered.length
  const partlySelected = chosen.length > 0 && !allSelected
  useEffect(() => {
    if (allCheckbox.current) allCheckbox.current.indeterminate = partlySelected
  }, [partlySelected])
  function resetSelection() {
    setPage(1)
    setSelected([])
  }
  function clearFilters() {
    setQuery("")
    setStatus("")
    onProject("")
    resetSelection()
  }
  return (
    <>
      <div className="ad-summary">
        <span>
          <strong>{people.length}</strong>{" "}
          {people.length === 1 ? "participant" : "participants"}
        </span>
        <span>
          <strong>{teamCount}</strong> {teamCount === 1 ? "team" : "teams"}
        </span>
        <span>
          <strong>
            {
              people.filter(
                (person) => !person.revoked && (person.invitedAt || person.code)
              ).length
            }
          </strong>{" "}
          invited
        </span>
        <button
          className="ad-export"
          disabled={!filtered.length}
          onClick={() =>
            downloadCsv(
              participantsCsv(filtered, boards, now),
              "myssp-participants.csv"
            )
          }
        >
          <ArrowDownToLine size={15} /> Export{" "}
          {query || project || status ? "results" : "CSV"}
        </button>
      </div>
      <section className="ad-table-panel" aria-label="Participant management">
        <div className="ad-toolbar">
          <label className="ad-search">
            <Search size={16} />
            <input
              aria-label="Search participants"
              placeholder="Search name, email or school"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                resetSelection()
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("")
                  resetSelection()
                }}
              >
                <X size={14} />
              </button>
            )}
          </label>
          <AdminSelect
            label="Filter by project"
            value={project}
            onChange={(value) => {
              onProject(value)
              resetSelection()
            }}
            options={[
              { value: "", label: "All projects" },
              ...boards.map((board) => ({
                value: board.id,
                label: board.code,
              })),
            ]}
          />
          <AdminSelect
            label="Filter by access status"
            value={status}
            onChange={(value) => {
              setStatus(value)
              resetSelection()
            }}
            options={[
              { value: "", label: "All statuses" },
              ...(useLiveBackend
                ? ["Not invited", "Invited", "Revoked"]
                : [
                    "Not invited",
                    "Code ready",
                    "Signed in",
                    "Temporarily locked",
                    "Revoked",
                  ]
              ).map((value) => ({ value, label: value })),
            ]}
          />
          <AdminSelect
            label="Sort participants"
            value={sort}
            onChange={(value) => {
              setSort(value)
              setPage(1)
            }}
            options={[
              { value: "project", label: "Project code" },
              { value: "name", label: "Name A–Z" },
              { value: "name-desc", label: "Name Z–A" },
              { value: "status", label: "Access status" },
            ]}
          />
        </div>
        {(query || project || status) && (
          <div className="ad-filter-summary">
            <span>{filtered.length} matching participants</span>
            <button onClick={clearFilters}>
              Reset filters <X size={12} />
            </button>
          </div>
        )}
        {chosen.length > 0 && (
          <div className="ad-selection">
            <span role="status">
              {chosen.length} of {filtered.length} selected
              {pageCount > 1 ? " across all pages" : ""}
            </span>
            <button
              disabled={!eligible.length || busy}
              onClick={() => onInvite(eligible.map((person) => person.id))}
            >
              <Mail size={15} />
              {busy ? "Sending…" : `Send access codes (${eligible.length})`}
            </button>
            {eligible.length !== chosen.length && (
              <small>
                {chosen.length - eligible.length} without access excluded
              </small>
            )}
            <button onClick={() => setSelected([])}>Clear selection</button>
          </div>
        )}
        <div className="ad-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col" className="ad-check-cell">
                  <label className="ad-select-all">
                    <input
                      ref={allCheckbox}
                      type="checkbox"
                      aria-label="Select all matching participants"
                      title={`Select all ${filtered.length} matching participants across all pages`}
                      checked={allSelected}
                      disabled={!filtered.length}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? filtered.map((person) => person.id)
                            : []
                        )
                      }
                    />
                    <span>Select all {filtered.length} participants</span>
                  </label>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sort === "name"
                      ? "ascending"
                      : sort === "name-desc"
                        ? "descending"
                        : "none"
                  }
                >
                  <button
                    className="ad-sort-heading"
                    onClick={() => {
                      setSort(sort === "name" ? "name-desc" : "name")
                      setPage(1)
                    }}
                  >
                    Participant <ArrowUpDown size={12} />
                  </button>
                </th>
                <th scope="col" className="ad-project-column">
                  Project
                </th>
                <th scope="col" className="ad-status-column">
                  Access
                </th>
                <th scope="col" className="ad-actions-column">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((person) => {
                const state = accessStatus(person, now)
                return (
                  <tr
                    key={person.id}
                    data-selected={selectedIds.has(person.id)}
                  >
                    <td className="ad-check-cell">
                      <input
                        type="checkbox"
                        aria-label={`Select ${person.email}`}
                        checked={selectedIds.has(person.id)}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setSelected((previous) =>
                            checked
                              ? [...new Set([...previous, person.id])]
                              : previous.filter((id) => id !== person.id)
                          )
                        }}
                      />
                    </td>
                    <td className="ad-person-cell">
                      <div className="ad-person">
                        <span className="ad-avatar" aria-hidden="true">
                          {participantInitials(person.name || person.email)}
                        </span>
                        <div>
                          <button
                            className="ad-person-name"
                            onClick={() => onEdit(person.id)}
                          >
                            {person.name || person.email.split("@")[0]}
                          </button>
                          <small title={person.email}>{person.email}</small>
                        </div>
                      </div>
                    </td>
                    <td className="ad-project-cell" data-label="Project">
                      <span className="ad-project-code">
                        {boards.find((board) => board.id === person.projectId)
                          ?.code ||
                          `${backend.deletedProjects.find((board) => board.id === person.projectId)?.code || "Project"} (deleted)`}
                      </span>
                    </td>
                    <td className="ad-access-cell" data-label="Access">
                      <span
                        className={`ad-status ${state === "Invited" || state === "Signed in" ? "ad-status-active" : state === "Revoked" ? "ad-status-revoked" : ""}`}
                      >
                        <i />
                        {state}
                      </span>
                    </td>
                    <td className="ad-row-actions">
                      <div className="ad-action-group">
                        <button
                          className="ad-manage-button"
                          aria-label={`Edit ${person.name || person.email}`}
                          onClick={() => onEdit(person.id)}
                        >
                          <Pencil size={14} />
                          <span>Edit</span>
                        </button>
                        {person.code && !person.revoked && (
                          <button
                            aria-label={`Preview invitation for ${person.email}`}
                            onClick={() => onPreview(person.id)}
                          >
                            <Mail size={15} />
                          </button>
                        )}
                        {useLiveBackend && (
                          <button
                            className="ad-delete-link"
                            aria-label={`Delete ${person.name || person.email}`}
                            onClick={() => onDelete(person)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="ad-empty">
            <Users size={25} />
            <h2>
              {people.length
                ? "No matching participants"
                : "Add your first participant"}
            </h2>
            <p>
              {people.length
                ? "Try another name, email or project."
                : "Add one person or import a team list."}
            </p>
            <button
              className="ad-button"
              onClick={people.length ? clearFilters : onAdd}
            >
              {people.length ? "Clear filters" : "Add participant"}
            </button>
          </div>
        )}
        <div className="ad-table-foot">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * 12 + 1}–${Math.min(currentPage * 12, filtered.length)}`
              : "0"}{" "}
            of {filtered.length} participants
          </span>
          <nav className="ad-pagination" aria-label="Participant pages">
            <button
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <button
              aria-label="Next page"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>
      </section>
    </>
  )
}
