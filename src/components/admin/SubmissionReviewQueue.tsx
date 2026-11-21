import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUpRight,
  Check,
  Circle,
  Download,
  ListChecks,
  RefreshCw,
  Search,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog"
import { type Board } from "../projectboard/data"
import { boardUrl } from "../projectboard/paths"
import { useBackend, useLiveBackend } from "./backend"
import { AdminSelect } from "./AdminSelect"
import {
  componentGroups,
  missingItems,
  reviewChecks,
  reviewCsv,
  reviewLabels,
  reviewStatus,
  type ReviewDecision,
  type ReviewRow,
} from "./review-model"
import {
  loadSubmissionReviews,
  saveSubmissionReview,
  reviewDemo,
} from "./submission-reviews"
import "./submission-review.css"

function date(value: string | null) {
  return value
    ? new Date(value).toLocaleString("en-MY", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kuala_Lumpur",
      })
    : "Not saved yet"
}
type Filter =
  "all" | "missing" | "ready" | "needs_changes" | "resubmitted" | "approved"
export function SubmissionReviewQueue({
  boards,
  year,
  onDeadline,
  onProjects,
  deadlineLabel,
  closed,
}: {
  boards: Board[]
  year: number
  onDeadline: () => void
  onProjects: () => void
  deadlineLabel: string
  closed: boolean
}) {
  const backend = useBackend()
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [component, setComponent] = useState("")
  const [selected, setSelected] = useState<ReviewRow | null>(null)
  const [notice, setNotice] = useState("")
  const request = useRef(0)
  const boardRef = useRef(boards)
  useEffect(() => {
    boardRef.current = boards
  }, [boards])
  const signature = boards
    .map((board) => `${board.id}:${backend.summaries[board.id]?.version || ""}`)
    .join("|")
  const refresh = useCallback(async () => {
    const ticket = ++request.current
    setLoading(true)
    setError("")
    try {
      const next = await loadSubmissionReviews(year, boardRef.current)
      if (ticket === request.current) setRows(next)
    } catch (cause) {
      if (ticket === request.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not check submissions."
        )
    } finally {
      if (ticket === request.current) setLoading(false)
    }
  }, [year])
  useEffect(() => {
    if (useLiveBackend && !backend.isAdmin) return
    const generation = request
    let active = true
    void Promise.resolve().then(() => {
      if (active) void refresh()
    })
    return () => {
      active = false
      generation.current++
    }
  }, [refresh, signature, backend.userId, backend.isAdmin])
  const counts = useMemo(
    () => ({
      all: rows.length,
      missing: rows.filter((row) => missingItems(row).length > 0).length,
      ready: rows.filter((row) => reviewStatus(row) === "ready").length,
      needs_changes: rows.filter((row) => reviewStatus(row) === "needs_changes")
        .length,
      resubmitted: rows.filter((row) => reviewStatus(row) === "resubmitted")
        .length,
      approved: rows.filter((row) => reviewStatus(row) === "approved").length,
    }),
    [rows]
  )
  const filtered = rows
    .filter(
      (row) =>
        (!query ||
          `${row.code} ${row.title} ${row.checklist
            .filter((i) => i.section === "team")
            .map((i) => i.label)
            .join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase().trim())) &&
        (filter === "all" || filter === "missing"
          ? filter === "all" || missingItems(row).length > 0
          : reviewStatus(row) === filter) &&
        (!component ||
          row.checklist.some(
            (item) =>
              !item.done &&
              componentGroups
                .find((group) => group.id === component)
                ?.match(item)
          ))
    )
    .sort(
      (a, b) =>
        missingItems(b).length - missingItems(a).length ||
        a.code.localeCompare(b.code, undefined, { numeric: true })
    )
  function download() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + reviewCsv(filtered)], {
        type: "text/csv;charset=utf-8",
      })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `MYSSP-${year}-submission-checklist.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <section className="rq-root" aria-label="Submission review queue">
      {reviewDemo && (
        <p className="rq-notice">
          Demo data and sample review decisions. Changes here do not affect live
          projects.
        </p>
      )}
      <div className="rq-schedule">
        <div>
          <span className={`rq-dot ${closed ? "is-closed" : ""}`} />
          <strong>
            {closed ? "Student editing closed" : "Student editing open"}
          </strong>
          <span>{deadlineLabel || "No automatic deadline"}</span>
        </div>
        <button className="ad-button" onClick={onDeadline}>
          Manage deadline
        </button>
      </div>
      <div className="rq-filters" aria-label="Review status">
        {(
          [
            ["all", "All projects"],
            ["missing", "Missing content"],
            ["ready", "Ready for review"],
            ["needs_changes", "Changes requested"],
            ["resubmitted", "Needs recheck"],
            ["approved", "Approved"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
            <span>{counts[id]}</span>
          </button>
        ))}
      </div>
      <div className="rq-toolbar">
        <label className="rq-search">
          <Search size={16} aria-hidden />
          <input
            aria-label="Search submissions"
            placeholder="Search project code, title or student"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <AdminSelect
          label="Missing component"
          value={component}
          onChange={setComponent}
          options={[
            { value: "", label: "Any component" },
            ...componentGroups.map((group) => ({
              value: group.id,
              label: `Missing ${group.label.toLowerCase()}`,
            })),
          ]}
        />
        <button
          className="ad-button"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw size={14} />
          <span>{loading ? "Checking…" : "Refresh"}</span>
        </button>
        <button
          className="ad-button"
          onClick={download}
          disabled={!filtered.length || loading || Boolean(error)}
        >
          <Download size={14} /> Export
        </button>
      </div>
      {notice && (
        <p className="rq-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="ad-error" role="alert">
          {error} <button onClick={() => void refresh()}>Try again</button>
        </p>
      )}
      <p className="rq-explainer">
        Checks show what is present. Review link access and quality before
        approving. Additional materials are optional.
      </p>
      <div className="rq-table-wrap" aria-busy={loading}>
        <table className="rq-table">
          <caption className="sr-only">
            Required components and committee review status for {year}
          </caption>
          <thead>
            <tr>
              <th scope="col">Project</th>
              {componentGroups.map((group) => (
                <th scope="col" key={group.id}>
                  {group.label}
                </th>
              ))}
              <th scope="col">Review</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const status = reviewStatus(row)
              const missing = missingItems(row)
              return (
                <tr key={row.id}>
                  <th scope="row">
                    <button
                      className="rq-project"
                      onClick={() => setSelected(row)}
                    >
                      <span className="rq-code">{row.code}</span>
                      <span>
                        <strong>{row.title}</strong>
                        <small>
                          {missing.length
                            ? `${missing.length} incomplete item${missing.length === 1 ? "" : "s"}`
                            : "All required content present"}{" "}
                          · {date(row.savedAt)}
                        </small>
                      </span>
                    </button>
                  </th>
                  {componentGroups.map((group) => {
                    const items = row.checklist.filter(group.match)
                    const absent = items.filter((i) => !i.done)
                    const done = items.length > 0 && !absent.length
                    const label = `${row.code} ${group.label}: ${done ? "complete" : absent.map((i) => `${i.label}: ${i.detail}`).join(" ") || "missing"}`
                    return (
                      <td key={group.id}>
                        <button
                          className={`rq-check ${done ? "is-done" : "is-missing"}`}
                          aria-label={label}
                          title={label}
                          onClick={() => setSelected(row)}
                        >
                          {done ? <Check size={15} /> : <Circle size={14} />}
                        </button>
                      </td>
                    )
                  })}
                  <td>
                    <button
                      className={`rq-status is-${status}`}
                      onClick={() => setSelected(row)}
                    >
                      {reviewLabels[status]}
                      <ArrowUpRight size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="rq-empty">
            <ListChecks size={26} />
            <strong>
              {loading
                ? "Checking submissions…"
                : rows.length
                  ? "No projects match these filters"
                  : "No projects in this cohort"}
            </strong>
            {!loading && (
              <button
                className="ad-button"
                onClick={() => {
                  if (!rows.length) onProjects()
                  else {
                    setQuery("")
                    setFilter("all")
                    setComponent("")
                  }
                }}
              >
                {rows.length ? "Clear filters" : "Manage projects"}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="rq-legend">
        <span>
          <Check size={13} /> Present
        </span>
        <span>
          <Circle size={12} /> Needs attention
        </span>
        <span>
          Approving a review does not publish a project or change editing
          access.
        </span>
      </div>
      {selected && (
        <ReviewDialog
          key={`${selected.id}-${selected.version}`}
          row={selected}
          boards={boards}
          closed={closed}
          onClose={() => setSelected(null)}
          onSaved={(message) => {
            setSelected(null)
            setNotice(message)
            void refresh()
          }}
        />
      )}
    </section>
  )
}

function ReviewDialog({
  row,
  boards,
  closed,
  onClose,
  onSaved,
}: {
  row: ReviewRow
  boards: Board[]
  closed: boolean
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const current = row.review?.version === row.version
  const [decision, setDecision] = useState<ReviewDecision>(
    current
      ? row.review!.status
      : missingItems(row).length
        ? "needs_changes"
        : "approved"
  )
  const [notes, setNotes] = useState(row.review?.notes || "")
  const [checks, setChecks] = useState<string[]>(
    current ? row.review!.checks : []
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const pending = useRef(false)
  const dirty =
    notes !== (row.review?.notes || "") ||
    checks.join() !== (current ? row.review!.checks.join() : "") ||
    Boolean(row.review && decision !== row.review.status)
  function close() {
    if (
      !busy &&
      (!dirty || window.confirm("Discard your unsaved review changes?"))
    )
      onClose()
  }
  async function save() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError("")
    try {
      await saveSubmissionReview(row, decision, notes, checks, boards)
      onSaved(
        decision === "approved"
          ? `${row.code} approved. Archive visibility is unchanged.`
          : `Changes requested for ${row.code}. The team can read your note on their project page.`
      )
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the review."
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent className="ad-modal rq-dialog" showClose={!busy}>
        <DialogTitle>Review {row.code}</DialogTitle>
        <DialogDescription>{row.title}</DialogDescription>
        <div className="rq-dialog-links">
          <a
            className="ad-button"
            href={boardUrl(row.id)}
            target="_blank"
            rel="noreferrer"
          >
            Open project page <ArrowUpRight size={14} />
          </a>
          <span>Last saved {date(row.savedAt)} MYT</span>
        </div>
        {row.review && !current && (
          <p className="rq-notice">
            The project changed after its last review. Check the updated content
            before approving again.
          </p>
        )}
        <div className="rq-checklist">
          <h3>
            Required content{" "}
            <span>
              {row.checklist.filter((i) => i.done).length}/
              {row.checklist.length}
            </span>
          </h3>
          {row.checklist.map((item) => (
            <div key={item.id} className={item.done ? "is-done" : "is-missing"}>
              {item.done ? <Check size={15} /> : <Circle size={14} />}
              <span>
                <strong>{item.label}</strong>
                {!item.done && <small>{item.detail}</small>}
              </span>
            </div>
          ))}
        </div>
        <fieldset disabled={busy} className="rq-review-form">
          <legend>Committee decision</legend>
          <div className="rq-decision">
            {(
              [
                ["needs_changes", "Request changes"],
                ["approved", "Approve"],
              ] as const
            ).map(([id, label]) => (
              <label key={id}>
                <input
                  type="radio"
                  name="review-decision"
                  checked={decision === id}
                  onChange={() => setDecision(id)}
                />
                {label}
              </label>
            ))}
          </div>
          {decision === "approved" && (
            <div className="rq-confirmations">
              {reviewChecks.map((check) => (
                <label key={check.id}>
                  <input
                    type="checkbox"
                    checked={checks.includes(check.id)}
                    onChange={(e) =>
                      setChecks((prev) =>
                        e.target.checked
                          ? [...prev, check.id]
                          : prev.filter((id) => id !== check.id)
                      )
                    }
                  />
                  {check.label}
                </label>
              ))}
            </div>
          )}
          <label className="rq-note-label">
            Note to the team{" "}
            {decision === "approved" && <small>(optional)</small>}
            <textarea
              rows={4}
              maxLength={3000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="List the specific changes the team needs to make."
            />
          </label>
          <p className="rq-explainer">
            Visible to this team on their project page. Saving a review does not
            send an email.
          </p>
          {decision === "needs_changes" && closed && (
            <p className="rq-notice">
              Student editing is closed. Use Manage deadline in the review queue
              to reopen corrections when ready.
            </p>
          )}
        </fieldset>
        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}
        <div className="ad-modal-actions">
          <button className="ad-button" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button
            className="ad-button ad-primary"
            onClick={() => void save()}
            disabled={busy}
          >
            {busy
              ? "Saving…"
              : decision === "approved"
                ? "Approve project"
                : "Save change request"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
