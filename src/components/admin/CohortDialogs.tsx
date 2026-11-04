import { useState, type FormEvent } from "react"
import { ArrowRight, FolderPlus, LockKeyhole } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog"
import { trackOrder, type Board, type Track } from "../projectboard/data"
import { AdminSelect } from "./AdminSelect"
import {
  cohortError,
  projectInputError,
  suggestedCode,
  type Cohort,
  type ProjectInput,
} from "./cohort-model"
import {
  createCohort,
  saveProjectBrief,
  useProjectBoards,
} from "./project-registry"

export function NewCohortDialog({
  cohorts,
  onClose,
  onCreated,
}: {
  cohorts: Cohort[]
  onClose: () => void
  onCreated: (year: number) => void
}) {
  const [year, setYear] = useState(
    String(
      Math.max(new Date().getFullYear(), ...cohorts.map((c) => c.year + 1))
    )
  )
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function submit(event: FormEvent) {
    event.preventDefault()
    const label = name.trim() || `MYSSP ${year}`
    const invalid = cohortError(Number(year), label, cohorts)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    try {
      await createCohort(Number(year), label)
      onCreated(Number(year))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create cohort.")
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
      <DialogContent className="ad-modal ad-create-modal">
        <DialogTitle>New cohort</DialogTitle>
        <DialogDescription>
          Start a year with its own projects and participant list.
        </DialogDescription>
        <form className="ad-editor-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <label>
              Programme year
              <input
                type="number"
                required
                min={2026}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </label>
            <label>
              Cohort name <span className="ad-optional">Optional</span>
              <input
                maxLength={80}
                value={name}
                placeholder={`MYSSP ${year}`}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </fieldset>
          <p className="ad-form-note">
            Next, add projects and assign participants. Existing cohorts stay
            unchanged.
          </p>
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
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="ad-button ad-primary" disabled={busy}>
              {busy ? "Creating…" : "Create cohort"}
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ProjectEditor({
  year,
  board,
  onClose,
  onSaved,
}: {
  year: number
  board?: Board
  onClose: () => void
  onSaved: (id: string, code: string) => void
}) {
  const boards = useProjectBoards()
  const [input, setInput] = useState<ProjectInput>(() => ({
    year,
    code: board?.code || suggestedCode(trackOrder[0], year, boards),
    title: board?.title || "",
    track: board?.track || trackOrder[0],
    mentor: board?.mentor || "",
    affiliation: board?.affiliation || "",
    description: board?.description || "",
  }))
  const [codeEdited, setCodeEdited] = useState(Boolean(board))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  function field(key: keyof ProjectInput, value: string) {
    setInput((current) => ({ ...current, [key]: value }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const invalid = projectInputError(input, boards, board?.id)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    try {
      const id = await saveProjectBrief(input, board)
      onSaved(id, input.code)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save project.")
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
      <DialogContent className="ad-modal ad-create-modal">
        <div className="ad-editor-heading">
          <span>
            <FolderPlus size={20} />
          </span>
          <div>
            <DialogTitle>
              {board ? "Edit project details" : "Add project"}
            </DialogTitle>
            <DialogDescription>{year} cohort</DialogDescription>
          </div>
        </div>
        <form className="ad-editor-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <div className="ad-project-form-grid">
              <label>
                Research field
                <AdminSelect
                  label="Research field"
                  value={input.track}
                  onChange={(value) =>
                    setInput((current) => ({
                      ...current,
                      track: value as Track,
                      code: codeEdited
                        ? current.code
                        : suggestedCode(value as Track, year, boards),
                    }))
                  }
                  options={trackOrder.map((track) => ({
                    value: track,
                    label: track,
                  }))}
                />
              </label>
              <label>
                Project code
                <input
                  required
                  readOnly={Boolean(board)}
                  maxLength={12}
                  value={input.code}
                  onChange={(e) => {
                    setCodeEdited(true)
                    field("code", e.target.value.toUpperCase())
                  }}
                />
                <small>
                  {board
                    ? "Code and cohort stay fixed."
                    : "Unique within this year."}
                </small>
              </label>
            </div>
            <label>
              Project title
              <input
                required
                maxLength={240}
                value={input.title}
                placeholder="Enter the research project title"
                onChange={(e) => field("title", e.target.value)}
              />
            </label>
            <label>
              Description <span className="ad-optional">Optional</span>
              <textarea
                rows={3}
                maxLength={4000}
                value={input.description}
                placeholder="A short introduction to the research"
                onChange={(e) => field("description", e.target.value)}
              />
            </label>
            <div className="ad-project-form-grid ad-project-mentor-grid">
              <label>
                Mentor <span className="ad-optional">Optional</span>
                <input
                  maxLength={200}
                  value={input.mentor}
                  onChange={(e) => field("mentor", e.target.value)}
                />
              </label>
              <label>
                Institution <span className="ad-optional">Optional</span>
                <input
                  maxLength={300}
                  value={input.affiliation}
                  onChange={(e) => field("affiliation", e.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <p className="ad-form-note">
            <LockKeyhole size={15} />
            {board
              ? "Saved student submissions and assignments are kept."
              : "Starts hidden in the library, with team editing locked. You can change both later."}
          </p>
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
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="ad-button ad-primary" disabled={busy}>
              {busy ? "Saving…" : board ? "Save changes" : "Create project"}
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
