import { useSyncExternalStore } from "react"
import { getProjectBoards, getProjectSplits, useProjectBoards } from "./project-registry"
import { generateCode } from "./access-model"
import { useBackend, getBackend, useLiveBackend, mentorSignInLive, saveLiveMentor, inviteLiveMentors, importLiveMentors, setMentorDeletedLive } from "./backend"
import { isLocalPreview } from "./local-preview"
import { mentorInputError, resolvePreviewMentorProjects, type Mentor, type MentorInput } from "./mentor-model"

const storageKey = "myssp-mentor-preview-v1"
const sessionKey = "myssp-mentor-session-v1"
type PreviewMentor = Mentor & { code?: string }
function readMentors(): PreviewMentor[] {
  if (!isLocalPreview || useLiveBackend) return []
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]")
    return Array.isArray(value) ? value.filter((mentor): mentor is PreviewMentor =>
      Boolean(mentor && typeof mentor === "object" && typeof mentor.id === "string" && typeof mentor.email === "string" && Array.isArray(mentor.projectIds))) : []
  } catch { return [] }
}
let localState = {
  mentors: readMentors(),
  session: isLocalPreview && !useLiveBackend ? sessionStorage.getItem(sessionKey) : null as string | null,
}
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
function publish(mentors = localState.mentors, session = localState.session) {
  localState = { mentors, session }
  if (isLocalPreview && !useLiveBackend) {
    localStorage.setItem(storageKey, JSON.stringify(mentors))
    if (session) sessionStorage.setItem(sessionKey, session)
    else sessionStorage.removeItem(sessionKey)
  }
  listeners.forEach(listener => listener())
}
if (typeof window !== "undefined") window.addEventListener("storage", event => {
  if (event.key === storageKey && !useLiveBackend) publish(readMentors(), localState.session)
})
export function useMentorAccess() {
  const local = useSyncExternalStore(subscribe, () => localState)
  const remote = useBackend()
  const boards = useProjectBoards()
  const mentors = useLiveBackend ? remote.mentors : local.mentors.map(mentor => ({
    ...mentor, projectIds: resolvePreviewMentorProjects(mentor.projectIds, boards, getProjectSplits()),
  }))
  const current = useLiveBackend
    ? mentors.find(mentor => mentor.userId === remote.userId && !mentor.revoked && !mentor.deletedAt) || null
    : mentors.find(mentor => mentor.id === local.session && !mentor.revoked && !mentor.deletedAt) || null
  return { mentors, current, error: useLiveBackend ? remote.mentorError : "" }
}
export async function saveMentor(input: MentorInput, id?: string) {
  const existing = useLiveBackend ? getBackend().mentors : localState.mentors
  const error = mentorInputError(input, getProjectBoards(), existing, id)
  if (error) throw new Error(error)
  if (useLiveBackend) return saveLiveMentor(input, id)
  if (!isLocalPreview) throw new Error("Local preview unavailable.")
  if (id) {
    const previous = localState.mentors.find(mentor => mentor.id === id)
    if (!previous || previous.deletedAt) throw new Error("Restore this mentor before editing their details.")
    const changedEmail = previous.email !== input.email.trim().toLowerCase()
    publish(localState.mentors.map(mentor => mentor.id === id ? {...mentor, ...input, name: input.name.trim(), email: input.email.trim().toLowerCase(), affiliation: input.affiliation.trim(), ...(changedEmail ? {userId: null, invitedAt: null, code: undefined} : {})} : mentor), changedEmail && localState.session === id ? null : localState.session)
  } else {
    publish([...localState.mentors, {...input, id: crypto.randomUUID(), name: input.name.trim(), email: input.email.trim().toLowerCase(), affiliation: input.affiliation.trim(), userId: null, invitedAt: null}])
  }
}
export async function setMentorDeleted(id: string, deleted: boolean) {
  if (useLiveBackend) return setMentorDeletedLive(id, deleted)
  if (!isLocalPreview) throw new Error("Local preview unavailable.")
  if (!localState.mentors.some(mentor => mentor.id === id)) throw new Error("Mentor not found.")
  publish(localState.mentors.map(mentor => mentor.id === id ? {...mentor, deletedAt: deleted ? new Date().toISOString() : null} : mentor), deleted && localState.session === id ? null : localState.session)
}
export async function importMentors(inputs: MentorInput[]) {
  if (!inputs.length || inputs.length > 100) throw new Error("Import 1 to 100 mentors at a time.")
  const boards = getProjectBoards()
  const existing = useLiveBackend ? getBackend().mentors : localState.mentors
  const seen = new Set(existing.map(mentor => mentor.email))
  for (const input of inputs) {
    const error = mentorInputError(input, boards, existing)
    if (error) throw new Error(error)
    if (seen.has(input.email)) throw new Error("This email appears more than once.")
    seen.add(input.email)
  }
  if (useLiveBackend) {
    // The RPC validates the entire batch and writes it in a single transaction.
    return importLiveMentors(inputs)
  }
  publish([...localState.mentors, ...inputs.map(input => ({...input, id: crypto.randomUUID(), userId: null, invitedAt: null}))])
}
export async function inviteMentors(ids: string[]) {
  if (useLiveBackend) return inviteLiveMentors(ids)
  if (!isLocalPreview) throw new Error("Local preview unavailable.")
  const now = Date.now()
  const next = localState.mentors.map(mentor => ids.includes(mentor.id) && !mentor.revoked && !mentor.deletedAt
    ? {...mentor, code: generateCode(), invitedAt: now} : mentor)
  publish(next)
  return { sent: 0, failed: 0, drafts: ids.length }
}
export function previewMentorCode(id: string) {
  return useLiveBackend ? null : localState.mentors.find(mentor => mentor.id === id)?.code || null
}
export async function mentorSignIn(email: string, code: string) {
  if (useLiveBackend) return mentorSignInLive(email, code)
  if (!isLocalPreview) return false
  const mentor = localState.mentors.find(mentor => mentor.email === email.trim().toLowerCase() && mentor.code === code.trim().toUpperCase() && !mentor.revoked && !mentor.deletedAt)
  if (!mentor) return false
  publish(localState.mentors, mentor.id)
  return true
}
export function signOutMentor() { if (!useLiveBackend) publish(localState.mentors, null) }
