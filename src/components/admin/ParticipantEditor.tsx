import { useState, type FormEvent } from "react"
import { ArrowUpRight, Check, Mail, UserRound } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog"
import type { Assignment } from "./access-model"
import {
  addParticipants,
  updateParticipantDetails,
  useDemoAccess,
} from "./demo-access"
import { useBackend } from "./backend"
import { useProjectBoards } from "./project-registry"
import { AdminSelect } from "./AdminSelect"
import { validateParticipantDetails } from "./participant-tools"

export function ParticipantEditor({
  cohortYear,
  initialProjectId,
  person,
  onClose,
  onSaved,
  onInvite,
}: {
  cohortYear: number
  initialProjectId?: string
  person?: Assignment
  onClose: () => void
  onSaved: () => void
  onInvite: (ids: string[]) => void
}) {
  const allBoards = useProjectBoards()
  const boards = person
    ? allBoards
    : allBoards.filter((b) => b.year === cohortYear)
  const { people } = useDemoAccess()
  const { deletedPeople } = useBackend()
  const [name, setName] = useState(
    person?.displayProfile?.name || person?.name || ""
  )
  const [school, setSchool] = useState(person?.displayProfile?.school || "")
  const [email, setEmail] = useState(person?.email || "")
  const [projectId, setProjectId] = useState(
    person?.projectId ||
      (boards.some((b) => b.id === initialProjectId)
        ? initialProjectId!
        : boards[0]?.id) ||
      ""
  )
  const [revoked, setRevoked] = useState(person?.revoked || false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const changed =
    !person ||
    name.trim() !== (person.displayProfile?.name || person.name) ||
    school.trim() !== (person.displayProfile?.school || "") ||
    projectId !== person.projectId ||
    revoked !== person.revoked
  async function submit(event: FormEvent) {
    event.preventDefault()
    const details = {
      name: name.trim(),
      school: school.trim(),
      projectId,
      revoked,
    }
    const invalid = validateParticipantDetails(details, boards)
    if (invalid) {
      setError(invalid)
      return
    }
    const address = email.trim().toLowerCase()
    if (
      !person &&
      [...people, ...deletedPeople].some((p) => p.email === address)
    ) {
      setError(
        "This email is already on the roster. Check Participants or Trash."
      )
      return
    }
    setBusy(true)
    setError("")
    try {
      const saved = person
        ? await updateParticipantDetails(person, details)
        : await addParticipants([
            {
              line: 1,
              name: details.name,
              email: address,
              projectId,
              error: "",
            },
          ])
      if (!saved)
        throw new Error("Could not save. Refresh the roster and try again.")
      onSaved()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save participant."
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
        className="ad-modal ad-person-editor"
        onInteractOutside={(event) => {
          if (busy || (changed && person)) event.preventDefault()
        }}
      >
        <div className="ad-editor-heading">
          <span>
            <UserRound size={20} />
          </span>
          <div>
            <DialogTitle>
              {person ? "Edit participant" : "Add participant"}
            </DialogTitle>
            <DialogDescription>
              {person
                ? "Profile and project access"
                : "Assign a participant to their team."}
            </DialogDescription>
          </div>
        </div>
        <form className="ad-editor-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <label>
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={100}
                autoComplete="off"
                placeholder="Participant's full name"
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                readOnly={Boolean(person)}
                required
                maxLength={254}
                placeholder="name@example.com"
                autoComplete="off"
              />
              {person && (
                <small>
                  Used for sign-in. Changing a profile does not change its
                  login.
                </small>
              )}
            </label>
            {person && (
              <label>
                School or college <span className="ad-optional">Optional</span>
                <input
                  value={school}
                  onChange={(event) => setSchool(event.target.value)}
                  maxLength={200}
                  placeholder="School or college name"
                />
                <small>
                  Name and school also update on the team's project page.
                </small>
              </label>
            )}
            <div className="ad-editor-divider" />
            <label>
              Assigned project
              <AdminSelect
                label="Assigned project"
                value={projectId}
                onChange={setProjectId}
                options={[
                  ...(!boards.some((b) => b.id === projectId)
                    ? [
                        {
                          value: projectId,
                          label: "Choose an available project",
                          disabled: true,
                        },
                      ]
                    : []),
                  ...boards.map((board) => ({
                    value: board.id,
                    label: `${board.code} · ${board.year}`,
                    description: board.title,
                  })),
                ]}
              />
            </label>
            {person && (
              <label className="ad-access-toggle">
                <span>
                  <strong>Project access</strong>
                  <small>
                    {revoked
                      ? "Participant cannot sign in to this project."
                      : "Participant can access their assigned project."}
                  </small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={!revoked}
                  onChange={(event) => setRevoked(!event.target.checked)}
                />
              </label>
            )}
            {person && projectId !== person.projectId && (
              <p className="ad-inline-note">
                Their profile moves to the new team. The original project's
                materials stay with that project.
              </p>
            )}
            {error && (
              <p className="ad-error" role="alert">
                {error}
              </p>
            )}
          </fieldset>
          <div className="ad-editor-footer">
            <button
              type="button"
              className="ad-button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="ad-button ad-primary"
              disabled={busy || !changed}
            >
              <Check size={15} />
              {busy ? "Saving…" : person ? "Save changes" : "Add participant"}
            </button>
          </div>
        </form>
        {person && (
          <div className="ad-editor-secondary">
            <a
              href={`#/projectboard/project/${person.projectId}`}
              onClick={onClose}
            >
              Open project <ArrowUpRight size={13} />
            </a>
            <button
              disabled={
                busy ||
                changed ||
                revoked ||
                !boards.some((b) => b.id === person.projectId)
              }
              onClick={() => {
                onClose()
                onInvite([person.id])
              }}
            >
              <Mail size={14} /> Send access code
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
