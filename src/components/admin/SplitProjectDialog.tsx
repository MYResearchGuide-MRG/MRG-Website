import { useState } from "react"
import { GitFork, Plus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Board } from "../projectboard/data"
import { splitProject, useDemoAccess } from "./demo-access"
import { splitError, type ProjectSplit } from "./project-registry-model"
import { getProjectSplits, useProjectBoards } from "./project-registry"
import { useLiveBackend } from "./backend"

export function SplitProjectDialog({
  board,
  onClose,
  onCreated,
}: {
  board: Board
  onClose: () => void
  onCreated: (codes: string[]) => void
}) {
  const { people } = useDemoAccess()
  const originalBoards = useProjectBoards()
  const accounts = people.filter((person) => person.projectId === board.id)
  const [teams, setTeams] = useState(() =>
    ["A", "B"].map((suffix) => ({
      id: `${board.id}-${suffix.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
      code: `${board.code}${suffix}`,
      title: board.title,
    }))
  )
  const [students, setStudents] = useState<Record<number, string>>({})
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const split: ProjectSplit = {
    parentId: board.id,
    teams: teams.map((team) => ({
      ...team,
      memberIndices: board.team.flatMap((_, index) =>
        students[index] === team.id ? [index] : []
      ),
    })),
  }
  const allAssigned =
    board.team.every((_, index) =>
      teams.some((team) => team.id === students[index])
    ) &&
    accounts.every((person) =>
      teams.some((team) => team.id === assignments[person.id])
    )
  const validation = splitError(split, originalBoards, useLiveBackend ? [] : getProjectSplits())
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="ad-modal ad-split-modal">
        <DialogTitle>Split {board.code} into teams</DialogTitle>
        <DialogDescription>
          Each team gets its own project page, materials and editing access.
        </DialogDescription>
        <div className="ad-split-teams">
          {teams.map((team, index) => (
            <section className="ad-split-team" key={team.id}>
              <div className="ad-split-team-head">
                <strong>{team.code}</strong>
                <span>{split.teams[index].memberIndices.length} students</span>
                {index > 1 && (
                  <button
                    aria-label={`Remove team ${team.code}`}
                    onClick={() =>
                      setTeams((current) =>
                        current.filter((item) => item.id !== team.id)
                      )
                    }
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <label>
                Project title{" "}
                <input
                  maxLength={240}
                  value={team.title}
                  onChange={(event) =>
                    setTeams((current) =>
                      current.map((item) =>
                        item.id === team.id
                          ? { ...item, title: event.target.value }
                          : item
                      )
                    )
                  }
                  aria-label={`Project title for ${team.code}`}
                />
              </label>
            </section>
          ))}
        </div>
        {teams.length < Math.min(6, board.team.length) && (
          <button
            className="ad-add-split"
            onClick={() => {
              const suffix = "ABCDEF"
                .split("")
                .find(
                  (letter) =>
                    !teams.some(
                      (team) => team.code === `${board.code}${letter}`
                    )
                )!
              setTeams((current) => [
                ...current,
                {
                  id: `${board.id}-${suffix.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
                  code: `${board.code}${suffix}`,
                  title: board.title,
                },
              ])
            }}
          >
            <Plus size={14} /> Add another team
          </button>
        )}
        <section className="ad-split-roster">
          <h3>Team members</h3>
          <p>
            Choose a team for each student. These names appear on their project
            page.
          </p>
          {board.team.map((student, index) => (
            <label className="ad-split-person" key={`${board.id}:${index}`}>
              <span>
                <strong>{student.name}</strong>
                <small>{student.school}</small>
              </span>
              <select
                aria-label={`Team for ${student.name}`}
                value={students[index] || ""}
                onChange={(event) =>
                  setStudents((current) => ({
                    ...current,
                    [index]: event.target.value,
                  }))
                }
              >
                <option value="">Choose team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.code}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>
        <section className="ad-split-roster">
          <h3>Participant accounts</h3>
          {accounts.length ? (
            <>
              <p>
                Match each email to its new team. Existing access codes remain
                valid; the new assignment takes effect immediately.
              </p>
              {accounts.map((person) => (
                <label className="ad-split-person" key={person.id}>
                  <span>
                    <strong>{person.name || person.email}</strong>
                    <small>
                      {person.name ? person.email : ""}
                      {person.revoked ? " · Access revoked" : ""}
                    </small>
                  </span>
                  <select
                    aria-label={`Project access for ${person.email}`}
                    value={assignments[person.id] || ""}
                    onChange={(event) =>
                      setAssignments((current) => ({
                        ...current,
                        [person.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.code}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </>
          ) : (
            <p>
              No email accounts added yet. After splitting, use Add participants
              and assign their emails to{" "}
              {teams.map((team) => team.code).join(" or ")}.
            </p>
          )}
        </section>
        <div className="ad-split-note">
          <GitFork size={17} />
          <p>
            The new pages start hidden, using the original brief and mentor. The
            original page is retired and its saved draft is kept. Uploaded
            materials are not copied.
          </p>
        </div>
        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}
        {allAssigned && validation && <p className="ad-error">{validation}</p>}
        <div className="ad-modal-actions">
          <button className="ad-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ad-button ad-primary"
            disabled={!allAssigned || Boolean(validation)}
            onClick={async () => {
              const problem = await splitProject(split, assignments)
              if (problem) setError(problem)
              else onCreated(teams.map((team) => team.code))
            }}
          >
            Create {teams.length} team pages <GitFork size={15} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
