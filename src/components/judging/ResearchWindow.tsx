import { useState, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog"
import { researchDeadlineLabel, type JudgingSwitches } from "./judge-model"
import { setResearchWindow } from "./judging-admin"
import { useResearchDeadlinePassed } from "./use-research-deadline"

export function ResearchWindow({
  year,
  current,
  lineupSize,
  onNotice,
}: {
  year: number
  current: JudgingSwitches
  lineupSize: number
  onNotice: (message: string) => void
}) {
  const [editing, setEditing] = useState<JudgingSwitches | null>(null)
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const deadline = current.researchClosesAt
  const expired = useResearchDeadlinePassed(deadline)
  const open =
    !expired &&
    !current.feedbackReleased &&
    (current.researchMarking ?? current.judgingOpen)

  function edit() {
    setEditing(current)
    setValue(
      deadline
        ? new Date(Date.parse(deadline) + 8 * 3600000)
            .toISOString()
            .slice(0, 16)
        : ""
    )
    setError("")
  }
  async function save(
    enabled: boolean | null,
    cutoff: string,
    expected: JudgingSwitches
  ) {
    setBusy(true)
    setError("")
    try {
      await setResearchWindow(year, enabled, cutoff, expected)
      setEditing(null)
      onNotice("Research-only marking updated.")
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update research-only marking."
      )
    } finally {
      setBusy(false)
    }
  }
  function updateDeadline(event: FormEvent) {
    event.preventDefault()
    const ms = Date.parse(value + ":00+08:00")
    if (!editing || !Number.isFinite(ms) || ms <= Date.now()) {
      setError("Choose a future closing time in Malaysia time.")
      return
    }
    const previouslyExpired =
      editing.researchClosesAt &&
      Date.parse(editing.researchClosesAt) <= Date.now()
    void save(
      previouslyExpired ? false : (editing.researchMarking ?? null),
      new Date(ms).toISOString(),
      editing
    )
  }
  return (
    <div className="jd-switch-card jd-research-window">
      <div>
        <strong>
          Research-only marking ·{" "}
          {open ? "Open" : expired ? "Deadline passed" : "Closed"}
        </strong>
        <p>
          For judges who cannot attend Demo Day.
          {deadline && (
            <>
              {" "}
              Deadline:{" "}
              <time dateTime={deadline}>{researchDeadlineLabel(deadline)}</time>
              .
            </>
          )}
        </p>
        {!lineupSize && <p>Save a project lineup before opening marking.</p>}
      </div>
      <div className="jd-research-actions">
        <button
          className="ad-button"
          disabled={busy || current.feedbackReleased}
          onClick={edit}
        >
          {deadline ? "Edit deadline" : "Set deadline"}
        </button>
        <button
          className="ad-button"
          disabled={
            busy ||
            !deadline ||
            expired ||
            current.feedbackReleased ||
            (!open && !lineupSize)
          }
          onClick={() => deadline && void save(!open, deadline, current)}
        >
          {open ? "Pause research marking" : "Start research marking"}
        </button>
      </div>
      {error && !editing && (
        <p className="ad-error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <Dialog
          open
          onOpenChange={(show) => {
            if (!show && !busy) setEditing(null)
          }}
        >
          <DialogContent className="ad-modal ad-deadline-modal am-dialog">
            <DialogTitle>Research marking deadline</DialogTitle>
            <DialogDescription>
              Research-only judges can save and submit until this time.
              Attending judges use the general judging switch.
            </DialogDescription>
            <form className="ad-editor-form" onSubmit={updateDeadline}>
              <label>
                Closing time in Malaysia (GMT+8)
                <input
                  type="datetime-local"
                  required
                  step={60}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
              {error && (
                <p className="ad-error" role="alert">
                  {error}
                </p>
              )}
              <div className="ad-modal-actions">
                <button
                  type="button"
                  className="ad-button"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button
                  className="ad-button ad-primary"
                  disabled={busy || !value}
                >
                  Save deadline
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
