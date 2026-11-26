import { useState } from "react"
import { RotateCcw, Trash2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { purgeDeletedLive, setDeletedLive, useBackend } from "./backend"
import { AdminSelect } from "./AdminSelect"
import {
  purgeJudge,
  setJudgeDeleted,
  useCommitteeJudging,
} from "../judging/judging-admin"

export type RecordAction = {
  kind: "participant" | "project" | "judge"
  id: string
  label: string
  remove: boolean
  /** Permanently delete a record that is already in Trash. */
  purge?: boolean
  projectId?: string
}

export function Trash({
  onAction,
}: {
  onAction: (action: RecordAction) => void
}) {
  const { deletedPeople, deletedProjects } = useBackend()
  const deletedJudges = useCommitteeJudging().judges.filter(
    (judge) => judge.deletedAt
  )
  if (!deletedPeople.length && !deletedProjects.length && !deletedJudges.length)
    return (
      <div className="ad-empty">
        <Trash2 size={28} />
        <h2>Trash is empty</h2>
      </div>
    )
  return (
    <div className="ad-trash">
      {deletedProjects.length > 0 && (
        <section aria-label="Deleted projects">
          <h2>Projects</h2>
          {deletedProjects.map((project) => (
            <article className="ad-trash-row" key={project.id}>
              <div>
                <strong>
                  {project.payload.year} · {project.code}
                </strong>
                <p>{project.payload.title}</p>
                <small>Restores hidden, with editing locked.</small>
              </div>
              <div className="ad-trash-actions">
                <button
                  className="ad-button"
                  aria-label={`Restore ${project.code}`}
                  onClick={() =>
                    onAction({
                      kind: "project",
                      id: project.id,
                      label: project.code,
                      remove: false,
                    })
                  }
                >
                  <RotateCcw size={15} /> Restore
                </button>
                <button
                  className="ad-button ad-danger"
                  aria-label={`Delete ${project.code} forever`}
                  onClick={() =>
                    onAction({
                      kind: "project",
                      id: project.id,
                      label: project.code,
                      remove: true,
                      purge: true,
                    })
                  }
                >
                  <X size={15} /> Delete forever
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {deletedPeople.length > 0 && (
        <section aria-label="Deleted participants">
          <h2>Participants</h2>
          {deletedPeople.map((person) => (
            <article className="ad-trash-row" key={person.id}>
              <div>
                <strong>{person.name}</strong>
                <p>{person.email}</p>
              </div>
              <div className="ad-trash-actions">
                <button
                  className="ad-button"
                  aria-label={`Restore ${person.name}`}
                  onClick={() =>
                    onAction({
                      kind: "participant",
                      id: person.id,
                      label: person.name,
                      projectId: person.projectId,
                      remove: false,
                    })
                  }
                >
                  <RotateCcw size={15} /> Restore
                </button>
                <button
                  className="ad-button ad-danger"
                  aria-label={`Delete ${person.name} forever`}
                  onClick={() =>
                    onAction({
                      kind: "participant",
                      id: person.id,
                      label: person.name,
                      remove: true,
                      purge: true,
                    })
                  }
                >
                  <X size={15} /> Delete forever
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {deletedJudges.length > 0 && (
        <section aria-label="Deleted judges">
          <h2>Judges</h2>
          {deletedJudges.map((judge) => (
            <article className="ad-trash-row" key={judge.id}>
              <div>
                <strong>
                  {judge.cohortYear} · {judge.name}
                </strong>
                <p>{judge.email}</p>
                <small>Submitted reviews are kept.</small>
              </div>
              <div className="ad-trash-actions">
                <button
                  className="ad-button"
                  aria-label={`Restore ${judge.name}`}
                  onClick={() =>
                    onAction({
                      kind: "judge",
                      id: judge.id,
                      label: judge.name,
                      remove: false,
                    })
                  }
                >
                  <RotateCcw size={15} /> Restore
                </button>
                <button
                  className="ad-button ad-danger"
                  aria-label={`Delete ${judge.name} forever`}
                  onClick={() =>
                    onAction({
                      kind: "judge",
                      id: judge.id,
                      label: judge.name,
                      remove: true,
                      purge: true,
                    })
                  }
                >
                  <X size={15} /> Delete forever
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

export function RecordActionDialog({
  action,
  onClose,
  onComplete,
}: {
  action: RecordAction
  onClose: () => void
  onComplete: () => void
}) {
  const { boards, people, deletedProjects } = useBackend()
  const judgeReviews = useCommitteeJudging().reviews.filter(
    (review) => review.judgeId === action.id
  )
  const judgeSubmitted = judgeReviews.filter((review) => review.submittedAt).length
  const [destination, setDestination] = useState(
    boards.some((b) => b.id === action.projectId) ? action.projectId! : ""
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const purging = Boolean(action.purge)
  const restoringPerson = !action.remove && action.kind === "participant"
  const restoringProject = !action.remove && action.kind === "project"
    ? deletedProjects.find((project) => project.id === action.id)
    : undefined
  const conflictingProject = restoringProject && boards.find((board) =>
    board.id !== action.id && board.code === restoringProject.code && board.year === restoringProject.payload.year
  )
  const restoreError = conflictingProject
    ? `${conflictingProject.code} is now used by “${conflictingProject.title}” in ${conflictingProject.year}. Move that project to Trash before restoring this one.`
    : ""
  const assignedCount = people.filter((p) => p.projectId === action.id).length
  async function submit() {
    setBusy(true)
    setError("")
    try {
      if (action.kind === "judge")
        await (purging
          ? purgeJudge(action.id)
          : setJudgeDeleted(action.id, action.remove))
      else if (purging) await purgeDeletedLive(action.kind, action.id)
      else
        await setDeletedLive(
          action.kind,
          action.id,
          action.remove,
          restoringPerson ? destination : undefined
        )
      onComplete()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this change."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent
        className="ad-modal"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          document.getElementById("ad-record-cancel")?.focus()
        }}
      >
        <DialogTitle>
          {purging ? "Permanently delete" : action.remove ? "Delete" : "Restore"}{" "}
          {action.label}?
        </DialogTitle>
        <DialogDescription>
          {purging
            ? action.kind === "judge"
              ? judgeReviews.length
                ? `This erases this judge and their ${judgeReviews.length} review${judgeReviews.length === 1 ? "" : "s"}${judgeSubmitted ? ` (${judgeSubmitted} submitted)` : ""} for good. Their scores leave the project results and team feedback. It cannot be undone.`
                : "This erases their name and email for good. They have no reviews. It cannot be undone."
            : action.kind === "participant"
              ? "This erases their name, email and profile photo for good. It cannot be undone."
              : `This erases the project page, its submission and images, review notes, judge feedback${assignedCount ? ` and its ${assignedCount} assigned participant${assignedCount === 1 ? "" : "s"}` : ""} for good. It cannot be undone.`
            : action.remove
            ? action.kind === "participant"
              ? "This removes them from the student list and stops their project access. Their team's work is kept. You can restore them from Trash."
              : `This hides the project and stops access for its ${assignedCount} assigned participant${assignedCount === 1 ? "" : "s"}. Materials and assignments are kept in Trash.`
            : action.kind === "judge"
              ? "They return to the judge list with their submitted reviews and can sign in again. A special award judge whose award has since gone to someone else comes back without an award, so choose one for them."
            : restoringPerson
              ? "Their name and profile will return to the chosen project. Their previous access status is kept."
              : "The project and its team will be restored. It stays hidden and editing stays locked until you change those settings."}
        </DialogDescription>
        {restoringPerson && (
          <label className="ad-restore-project">
            Project
            <AdminSelect
              label="Restore to project"
              value={destination}
              onChange={setDestination}
              disabled={busy}
              options={[
                { value: "", label: "Choose a project" },
                ...boards.map((board) => ({
                  value: board.id,
                  label: `${board.code} · ${board.year}`,
                  description: board.title,
                })),
              ]}
            />
            {!boards.length && <small>Restore a project first.</small>}
          </label>
        )}
        {(error || restoreError) && (
          <p className="ad-form-error" role="alert">
            {error || restoreError}
          </p>
        )}
        <div className="ad-modal-actions">
          <button
            id="ad-record-cancel"
            className="ad-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className={`ad-button ${action.remove ? "ad-danger" : "ad-primary"}`}
            disabled={busy || Boolean(restoreError) || (restoringPerson && !destination)}
            onClick={() => void submit()}
          >
            {busy
              ? "Saving…"
              : purging
                ? "Delete forever"
                : action.remove
                  ? "Move to Trash"
                  : "Restore"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
