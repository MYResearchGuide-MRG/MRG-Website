import { useSyncExternalStore } from "react"
import { getProjectBoards, saveProjectSplit } from "./project-registry"
import type { ProjectSplit } from "./project-registry-model"
import { isLocalPreview } from "./local-preview"
import { useBackend, getBackend, useLiveBackend, importLiveParticipants, changeLiveAssignment, participantSignIn, liveProject, signOutLive, splitLiveProject } from "./backend"
import { applyProjectSplits } from "./project-registry-model"
import { saveLiveParticipant } from "./backend"
import { validateParticipantDetails, type ParticipantDetails } from "./participant-tools"
export { isLocalPreview } from "./local-preview"
import {
  canEdit,
  changeAssignment,
  issueCode,
  verifyCode,
  type Assignment,
  type ImportRow,
  type ParticipantSession,
} from "./access-model"

type State = { people: Assignment[]; session: ParticipantSession | null }
const rosterKey = "myssp-committee-roster-v1"
function readPeople(): Assignment[] {
  if (!isLocalPreview) return []
  try {
    const data = JSON.parse(localStorage.getItem(rosterKey) || "[]")
    if (!Array.isArray(data)) return []
    return data.filter(p => typeof p.id === "string" && typeof p.name === "string" && typeof p.email === "string" && typeof p.projectId === "string").map(p => ({
      id: p.id, name: p.name, email: p.email, projectId: p.projectId,
      displayProfile: p.displayProfile,
      revision: Number.isInteger(p.revision) ? p.revision : 1, revoked: p.revoked === true,
      code: null, expiresAt: 0, usedAt: null, attempts: 0, lockedUntil: 0,
    }))
  } catch { return [] }
}
let state: State = { people: readPeople(), session: null }
const listeners = new Set<() => void>()
function publish(next: State) {
  if (isLocalPreview) localStorage.setItem(rosterKey, JSON.stringify(next.people.map(({id,name,email,projectId,revision,revoked,displayProfile}) => ({id,name,email,projectId,revision,revoked,displayProfile}))))
  state = next
  listeners.forEach((fn) => fn())
}
if (typeof window !== "undefined") window.addEventListener("storage", event => {
  if (event.key === rosterKey || event.key === null) {
    state = { people: readPeople(), session: null }
    listeners.forEach(fn => fn())
  }
})
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export function useDemoAccess() {
  const local = useSyncExternalStore(subscribe, () => state)
  const remote = useBackend()
  return useLiveBackend ? { people: remote.people, session: remote.userId ? {participantId:remote.userId} : null } : local
}

export async function addParticipants(rows: ImportRow[]) {
  if (useLiveBackend) return importLiveParticipants(rows)
  const boards = getProjectBoards()
  if (
    !isLocalPreview ||
    rows.length > 200 ||
    rows.some((r) => r.error) ||
    !rows.length
  )
    return false
  const seen = new Set(state.people.map((p) => p.email))
  if (
    rows.some((r) => {
      const duplicate = seen.has(r.email)
      seen.add(r.email)
      return duplicate || !boards.some((b) => b.id === r.projectId)
    })
  )
    return false
  const people = rows.map((r) => ({
    id: crypto.randomUUID(),
    name: r.name,
    email: r.email,
    projectId: r.projectId,
    revision: 1,
    revoked: false,
    code: null,
    expiresAt: 0,
    usedAt: null,
    attempts: 0,
    lockedUntil: 0,
  }))
  publish({ ...state, people: [...state.people, ...people] })
  return true
}
export function prepareInvitations(ids: string[]) {
  if (!isLocalPreview) return
  publish({
    ...state,
    people: state.people.map((p) =>
      ids.includes(p.id) && !p.revoked ? issueCode(p) : p
    ),
  })
}
export async function updateAssignment(
  id: string,
  projectId: string,
  revoked: boolean
) {
  if (useLiveBackend) return changeLiveAssignment(id, projectId, revoked)
  const boards = getProjectBoards()
  if (!isLocalPreview || !boards.some((b) => b.id === projectId)) return
  publish({
    ...state,
    people: state.people.map((p) =>
      p.id === id ? changeAssignment(p, projectId, revoked) : p
    ),
  })
  return true
}
export async function updateParticipantDetails(person: Assignment, details: ParticipantDetails) {
  const error = validateParticipantDetails(details, getProjectBoards())
  if (error) throw new Error(error)
  if (useLiveBackend) return saveLiveParticipant(person, details)
  if (!isLocalPreview) return false
  publish({ ...state, people: state.people.map(p => p.id === person.id ? {
    ...(details.projectId !== p.projectId || details.revoked !== p.revoked ? changeAssignment(p, details.projectId, details.revoked) : p),
    name: details.name.trim(), displayProfile: { ...p.displayProfile, name: details.name.trim(), school: details.school.trim() },
  } : p) })
  return true
}
export async function authenticate(email: string, code: string): Promise<boolean> {
  if (useLiveBackend) return participantSignIn(email, code)
  if (!isLocalPreview) return false
  const person = state.people.find(
    (p) => p.email === email.trim().toLowerCase()
  )
  if (!person) return false
  const result = verifyCode(person, code)
  publish({
    people: state.people.map((p) => (p.id === person.id ? result.person : p)),
    session: result.session,
  })
  return Boolean(result.session)
}
export function currentProject(): string | null {
  if (useLiveBackend) return liveProject()
  const person = state.people.find((p) => p.id === state.session?.participantId)
  return isLocalPreview &&
    person &&
    getProjectBoards().some((board) => board.id === person.projectId) &&
    canEdit(state.session, person, person.projectId)
    ? person.projectId
    : null
}
export function signOutParticipant() {
  if (useLiveBackend) { void signOutLive(); return }
  publish({ ...state, session: null })
}

export async function splitProject(
  split: ProjectSplit,
  assignments: Record<string, string>
): Promise<string | null> {
  if (useLiveBackend) {
    const original = getBackend().boards
    const children = applyProjectSplits(original, [split]).filter(b => split.teams.some(t => t.id === b.id))
    return splitLiveProject(split, children, assignments)
  }
  if (!isLocalPreview)
    return "Project splitting is only available in the local preview."
  const members = state.people.filter(
    (person) => person.projectId === split.parentId
  )
  if (
    members.some(
      (person) =>
        !split.teams.some((team) => team.id === assignments[person.id])
    )
  )
    return "Choose a new project for every participant account on the original project."
  const error = saveProjectSplit(split)
  if (error) return error
  publish({
    ...state,
    people: state.people.map((person) =>
      person.projectId === split.parentId
        ? changeAssignment(person, assignments[person.id])
        : person
    ),
  })
  return null
}
