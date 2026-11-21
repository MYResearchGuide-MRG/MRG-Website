import { useRef, useState, type FormEvent } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog"
import { deadlineFromInput, deadlineToInput, submissionClosed, submissionDeadlineLabel } from "../projectboard/submission-deadline"
import { deadlineForYear } from "../projectboard/use-submission-deadline"
import { setPreviewDeadline } from "../projectboard/preview-deadlines"
import { setLiveSubmissionDeadline, useLiveBackend } from "./backend"
import { setProjectEditing } from "./project-editing"

export function SubmissionDeadlineDialog({year, closesAt, projectIds, enabledCount, onClose, onSaved}: {
  year:number; closesAt:string|null; projectIds:string[]; enabledCount:number;
  onClose:()=>void; onSaved:(message:string)=>void;
}) {
  const [expected] = useState(closesAt)
  const [value,setValue] = useState(() => deadlineToInput(closesAt))
  const [noDeadline,setNoDeadline] = useState(closesAt === null)
  const [reopenAll,setReopenAll] = useState(false)
  const [confirmClose,setConfirmClose] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState("")
  const pending = useRef(false)
  const wasClosed = submissionClosed(expected)
  const nextCutoff = noDeadline ? null : deadlineFromInput(value)
  const opening = noDeadline || Boolean(nextCutoff && !submissionClosed(nextCutoff))
  const editableCount = reopenAll ? projectIds.length : enabledCount
  const sameTime = (left:string|null,right:string|null) => left === right || Boolean(left && right && Date.parse(left) === Date.parse(right))
  const changed = (noDeadline ? expected !== null : expected === null || value !== deadlineToInput(expected)) || reopenAll

  async function save(closeNow = false) {
    if (pending.current) return
    setError("")
    if (!closeNow && (!noDeadline && !nextCutoff || nextCutoff && (submissionClosed(nextCutoff) || Date.parse(nextCutoff) > Date.parse("2101-01-01T00:00:00+08:00")))) {
      setError("Choose a future date and time, or select no automatic deadline.")
      return
    }
    pending.current = true; setBusy(true)
    try {
      if (useLiveBackend) {
        await setLiveSubmissionDeadline(year,closeNow ? null : nextCutoff,expected,!closeNow && reopenAll,closeNow)
      } else {
        if (!sameTime(deadlineForYear(year),expected)) throw new Error("The deadline changed. Close this window and try again.")
        if (!closeNow && reopenAll && !await setProjectEditing(projectIds,true)) throw new Error("Could not enable team editing. Please try again.")
        setPreviewDeadline(year,closeNow ? new Date().toISOString() : nextCutoff)
      }
      onSaved(closeNow ? `Student editing closed for ${year}.` : noDeadline
        ? `${year}: no automatic deadline. ${editableCount} project${editableCount === 1 ? "" : "s"} enabled for editing.`
        : `${year}: editing available through ${submissionDeadlineLabel(nextCutoff)} for ${editableCount} enabled project${editableCount === 1 ? "" : "s"}.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the deadline. Please try again.") }
    finally { pending.current = false; setBusy(false) }
  }
  function submit(event:FormEvent) { event.preventDefault(); void save() }

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent className="ad-modal ad-create-modal ad-deadline-modal" showClose={!busy}>
      <DialogTitle>Editing deadline · {year}</DialogTitle>
      <DialogDescription>Set a closing time for submissions or reopen editing for final corrections.</DialogDescription>
      {confirmClose ? <div className="ad-editor-form">
        <p className="ad-form-note">Close student editing for every project in {year} now? This also locks student names and photos. You can reopen it later.</p>
        {error && <p className="ad-error" role="alert">{error}</p>}
        <div className="ad-modal-actions">
          <button className="ad-button" disabled={busy} onClick={() => { setConfirmClose(false); setError("") }}>Back</button>
          <button className="ad-button ad-primary" disabled={busy} onClick={() => void save(true)}>{busy ? "Closing…" : "Close editing now"}</button>
        </div>
      </div> : <form className="ad-editor-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>Last editable date and time
            <input type="datetime-local" aria-describedby="deadline-time-help" value={value} disabled={noDeadline} required={!noDeadline} step={60}
              onChange={event => { setValue(event.target.value); setError("") }} />
          </label>
          <p className="ad-form-note" id="deadline-time-help">Malaysia time (MYT, UTC+8). Teams can save through this minute; editing closes automatically afterward.</p>
          <label className="ad-schedule-option">
            <input type="checkbox" checked={noDeadline} onChange={event => { setNoDeadline(event.target.checked); setError("") }} />
            <span><strong>No automatic deadline</strong><small>Keep editing available until the committee closes it.</small></span>
          </label>
          <label className="ad-schedule-option">
            <input type="checkbox" checked={reopenAll} disabled={!projectIds.length} onChange={event => setReopenAll(event.target.checked)} />
            <span><strong>Enable editing for all {projectIds.length} projects</strong><small>Use this to start a final review round for the whole cohort.</small></span>
          </label>
        </fieldset>
        <div className="ad-deadline-impact" aria-live="polite">
          <p>{opening ? `${editableCount} of ${projectIds.length} projects will be editable.` : "Choose a new deadline to reopen editing."}</p>
          <small>{reopenAll ? "You can lock individual teams afterward." : "Projects with team editing switched off will stay locked."} Hidden projects stay hidden.</small>
        </div>
        {error && <p className="ad-error" role="alert">{error}</p>}
        <div className="ad-modal-actions ad-schedule-actions">
          {!wasClosed && <button type="button" className="ad-button ad-close-editing" disabled={busy} onClick={() => { setConfirmClose(true); setError("") }}>Close now</button>}
          <button type="button" className="ad-button" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="submit" className="ad-button ad-primary" disabled={busy || !changed}>{busy ? "Saving…" : wasClosed ? "Reopen editing" : "Save deadline"}</button>
        </div>
      </form>}
    </DialogContent>
  </Dialog>
}
