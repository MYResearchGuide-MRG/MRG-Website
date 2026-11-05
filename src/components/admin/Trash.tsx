import { useState } from "react"
import { RotateCcw, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { setDeletedLive, useBackend } from "./backend"
import { AdminSelect } from "./AdminSelect"

export type RecordAction = {
  kind: "participant" | "project"
  id: string
  label: string
  remove: boolean
  projectId?: string
}

export function Trash({
  onAction,
}: {
  onAction: (action: RecordAction) => void
}) {
  const { deletedPeople, deletedProjects } = useBackend()
  if (!deletedPeople.length && !deletedProjects.length)
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
  const { boards, people } = useBackend()
  const [destination, setDestination] = useState(
    boards.some((b) => b.id === action.projectId) ? action.projectId! : ""
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const restoringPerson = !action.remove && action.kind === "participant"
  const assignedCount = people.filter((p) => p.projectId === action.id).length
  async function submit() {
    setBusy(true)
    setError("")
    try {
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
          {action.remove ? "Delete" : "Restore"} {action.label}?
        </DialogTitle>
        <DialogDescription>
          {action.remove
            ? action.kind === "participant"
              ? "This removes them from the student list and stops their project access. Their team's work is kept. You can restore them from Trash."
              : `This hides the project and stops access for its ${assignedCount} assigned participant${assignedCount === 1 ? "" : "s"}. Materials and assignments are kept in Trash.`
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
        {error && (
          <p className="ad-form-error" role="alert">
            {error}
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
            disabled={busy || (restoringPerson && !destination)}
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : action.remove ? "Move to Trash" : "Restore"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
