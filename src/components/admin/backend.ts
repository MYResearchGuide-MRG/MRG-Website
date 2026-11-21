import { useSyncExternalStore } from "react"
import { supabase } from "@/lib/supabase"
import { isLocalPreview } from "./local-preview"
import type { Assignment, ImportRow } from "./access-model"
import type { Board, Draft } from "../projectboard/data"
import { isDraft } from "../projectboard/data"
import type { ProjectSplit } from "./project-registry-model"
import type { ParticipantDetails } from "./participant-tools"
import type { Cohort, ProjectInput } from "./cohort-model"
import type { ResearchField } from "./research-fields-model"
import { sendInvitationBatches } from "./invitation-batches"
import type { Mentor, MentorInput } from "./mentor-model"

// Device-only preparation stays available on localhost. Production never uses it.
export const useLiveBackend = !isLocalPreview || import.meta.env.VITE_ACCESS_MODE === "supabase"
export type ProjectRecord = { id: string; code: string; payload: Board; published: boolean; editing_enabled: boolean; retired: boolean; deleted_at: string | null }
export type SubmissionSummary = Pick<Draft, "title" | "savedAt" | "slides" | "paper" | "video" | "coverAlt"> & { project_id: string; version: string; revision: number; hasCover: boolean }
type Delta<T> = { id: string; version: string; record: T | null }
type Cached<T> = Record<string, { version: string; record: T }>
type PersonRecord = { id:string; user_id:string|null; name:string; email:string; project_id:string; revoked:boolean; invited_at:string|null; deleted_at:string|null; display_profile?: Assignment["displayProfile"] }
type AdminProfile = { name:string; photo:string }
type Snapshot = {
  projects: Delta<ProjectRecord>[]; people: Delta<PersonRecord>[]; submissions: SubmissionSummary[];
  isAdmin: boolean; fields: ResearchField[]; cohorts: Cohort[]; adminProfile: Delta<AdminProfile> | null;
  mentors: {id:string;user_id:string|null;name:string;email:string;affiliation:string;revoked:boolean;invited_at:string|null;deleted_at:string|null}[];
  mentorProjects: {mentor_id:string;project_id:string}[]; deadlines: {year:number;closes_at:string|null}[];
}
type State = {
  ready: boolean; error: string; isAdmin: boolean; userId: string | null;
  accountEmail: string; accountName: string; accountPhoto: string;
  people: Assignment[]; projects: ProjectRecord[]; drafts: Record<string, Draft>; revisions: Record<string, number>;
  visibility: Record<string, boolean>; editing: Record<string, boolean>; boards: Board[];
  deletedPeople: Assignment[]; deletedProjects: ProjectRecord[];
  cohorts: Cohort[]; cohortError: string;
  researchFields: ResearchField[]; researchFieldError: string;
  mentors: Mentor[]; mentorError: string;
  submissionDeadlines: Record<number, string | null>;
  summaries: Record<string, SubmissionSummary>; draftVersions: Record<string, string>;
  covers: Record<string, { version:string; image:string }>; contentErrors: Record<string,string>;
}
const empty: State = { ready: false, error: "", isAdmin: false, userId: null, accountEmail: "", accountName: "", accountPhoto: "", people: [], projects: [], drafts: {}, revisions: {}, visibility: {}, editing: {}, boards: [], deletedPeople: [], deletedProjects: [], cohorts: [], cohortError: "", researchFields: [], researchFieldError: "", mentors: [], mentorError: "", submissionDeadlines: {}, summaries: {}, draftVersions: {}, covers: {}, contentErrors: {} }
let state = empty
const listeners = new Set<() => void>()
let epoch = 0
let identityEpoch = 0
let projectCache: Cached<ProjectRecord> = {}, peopleCache: Cached<PersonRecord> = {}, profileCache: Cached<AdminProfile> = {}
function publish(next: State) {
  if (next === empty) { identityEpoch++; projectCache = {}; peopleCache = {}; profileCache = {} }
  state = next; listeners.forEach(fn => fn())
}
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export const getBackend = () => state
export const useBackend = () => useSyncExternalStore(subscribe, getBackend)

// Keep private data in memory, scoped to this auth identity. Each manifest is
// authoritative: disappeared IDs are removed even when other rows are unchanged.
function mergeDelta<T>(rows: Delta<T>[], previous: Cached<T>): Cached<T> {
  return Object.fromEntries(rows.map(row => {
    const record = row.record ?? (previous[row.id]?.version === row.version ? previous[row.id].record : undefined)
    if (!record) throw new Error("Could not load updated records. Refresh and try again.")
    return [row.id, {version:row.version,record}]
  }))
}
function versions<T>(cache: Cached<T>) { return Object.fromEntries(Object.entries(cache).map(([id,row]) => [id,row.version])) }
let refreshFlight: Promise<void> | null = null
let refreshAgain = false
// Mutations request a trailing read; timers/auth events share an existing read.
export function refreshBackend(afterMutation = true): Promise<void> {
  if (refreshFlight) { refreshAgain ||= afterMutation; return refreshFlight }
  refreshFlight = (async () => {
    do { refreshAgain = false; await readBackend() } while (refreshAgain)
  })().finally(() => { refreshFlight = null })
  return refreshFlight
}
async function readBackend() {
  if (!useLiveBackend || !supabase) return
  const ticket = ++epoch
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (ticket !== epoch) return
    const userId = session?.user.id || null
    // Expiry/storage clearing must remove private cached data even if the next
    // public-data request fails. A temporary refresh error above is not logout.
    if (state.userId && state.userId !== userId) publish(empty)
    const { data, error } = await supabase.rpc("myssp_backend_snapshot", { known: {
      projects: versions(projectCache), people: versions(peopleCache), adminProfile: userId ? profileCache[userId]?.version : undefined,
    } })
    if (error) throw new Error(error.code === "PGRST202" ? "The database needs the latest read optimisation update." : "Could not refresh project access. Please try again.")
    if (ticket !== epoch) return
    const snapshot = data as Snapshot
    const nextProjects = mergeDelta(snapshot.projects, projectCache)
    const nextPeople = mergeDelta(snapshot.people, peopleCache)
    const nextProfile = mergeDelta(snapshot.adminProfile ? [snapshot.adminProfile] : [], profileCache)
    const allProjects = Object.values(nextProjects).map(row => row.record)
    const records = allProjects.filter(p => !p.deleted_at)
    const activeProjectIds = new Set(records.map(project => project.id))
    const allPeople = Object.values(nextPeople).map(({record:p}) => ({id:p.id, userId:p.user_id, name:p.name, email:p.email, projectId:p.project_id, revision:1, revoked:p.revoked, code:null, expiresAt:0, usedAt:null, invitedAt:p.invited_at ? Date.parse(p.invited_at) : null, attempts:0, lockedUntil:0, deletedAt:p.deleted_at, displayProfile:p.display_profile || {}}))
    const mentorAssignments = new Map<string,string[]>()
    for (const link of snapshot.mentorProjects) mentorAssignments.set(link.mentor_id, [...(mentorAssignments.get(link.mentor_id) || []), link.project_id])
    const mentorRecords: Mentor[] = snapshot.mentors.map(mentor => ({
      id: mentor.id, userId: mentor.user_id, name: mentor.name, email: mentor.email,
      affiliation: mentor.affiliation, revoked: mentor.revoked,
      invitedAt: mentor.invited_at ? Date.parse(mentor.invited_at) : null,
      deletedAt: mentor.deleted_at || null,
      // Split triggers retain the retired parent link as well as the children.
      // Only active pages belong in the picker, dashboard and save payload.
      projectIds: (mentorAssignments.get(mentor.id) || []).filter(id => activeProjectIds.has(id)),
    }))
    const summaries = Object.fromEntries(snapshot.submissions.filter(s => activeProjectIds.has(s.project_id)).map(s => [s.project_id,s]))
    const retain = <T,>(items: Record<string,T>) => Object.fromEntries(Object.entries(items).filter(([id]) => activeProjectIds.has(id) && summaries[id]))
    projectCache = nextProjects; peopleCache = nextPeople; profileCache = nextProfile
    publish({
      ready: true, error: "", isAdmin: snapshot.isAdmin, userId,
      accountEmail: session?.user.email || "",
      accountName: (userId && nextProfile[userId]?.record.name) || (typeof session?.user.user_metadata?.full_name === "string" ? session.user.user_metadata.full_name : ""),
      accountPhoto: (userId && nextProfile[userId]?.record.photo) || "",
      projects: records, boards: records.map(p => ({...p.payload, id: p.id, code: p.code})),
      visibility: Object.fromEntries(records.map(p => [p.id,p.published])),
      editing: Object.fromEntries(records.map(p => [p.id,p.editing_enabled])),
      drafts: retain(state.drafts), summaries, draftVersions: retain(state.draftVersions),
      covers: retain(state.covers), contentErrors: retain(state.contentErrors),
      revisions: Object.fromEntries(snapshot.submissions.map(s => [s.project_id,s.revision])),
      people: allPeople.filter(p => !p.deletedAt),
      deletedPeople: allPeople.filter(p => p.deletedAt),
      deletedProjects: allProjects.filter(p => p.deleted_at),
      cohorts: snapshot.cohorts, cohortError: "",
      researchFields: snapshot.fields, researchFieldError: "",
      mentors: mentorRecords,
      mentorError: "",
      submissionDeadlines: Object.fromEntries(snapshot.deadlines.map(row => [row.year, row.closes_at])),
    })
  } catch (error) {
    // A failed refresh is not a sign-out. Preserve the current editor and let
    // server policies reject writes if permissions have changed meanwhile.
    if (ticket === epoch) publish({...state, error: error instanceof Error ? error.message : "Could not connect to the database."})
  }
}

const contentFlights = new Map<string, Promise<void>>()
// Only the open project page needs the full submission. Archive tiles request
// just their visible cover. Both reuse data until the server version changes.
export function loadLiveProjectContent(projectId: string, coverOnly = false): Promise<void> {
  if (!supabase || !useLiveBackend || !state.ready || !state.boards.some(b => b.id === projectId)) return Promise.resolve()
  const summary = state.summaries[projectId]
  if (!summary) return Promise.resolve()
  if (coverOnly ? !summary.hasCover || state.covers[projectId]?.version === summary.version : state.draftVersions[projectId] === summary.version) return Promise.resolve()
  const identity = identityEpoch
  const key = `${identity}:${projectId}:${summary.version}:${coverOnly}`
  const pending = contentFlights.get(key)
  if (pending) return pending
  const client = supabase
  const task = (async () => {
    const {data,error} = await client.from("myssp_submissions")
      .select(coverOnly ? "cache_version,cover:content->>coverImage" : "cache_version,content,revision")
      .eq("project_id",projectId).maybeSingle()
    if (identity !== identityEpoch || !state.summaries[projectId] || !state.boards.some(b => b.id === projectId)) return
    if (error) {
      publish({...state,contentErrors:{...state.contentErrors,[projectId]:"Could not load this project. Please try again."}})
      return
    }
    // A concurrent save/revocation can race the manifest. Recheck access rather
    // than pairing stale content with a newer optimistic-lock revision.
    const row = data as unknown as {cache_version:string;content?:Draft;revision?:number;cover?:string} | null
    if (!row || row.cache_version !== state.summaries[projectId]?.version) {
      await refreshBackend(false)
      if (identity === identityEpoch && state.summaries[projectId]?.version === summary.version) {
        publish({...state,contentErrors:{...state.contentErrors,[projectId]:"This project changed while loading. Please try again."}})
      }
      return
    }
    const board = state.boards.find(b => b.id === projectId)!
    if (!coverOnly && (!row.content || !isDraft(row.content,board))) {
      publish({...state,contentErrors:{...state.contentErrors,[projectId]:"The saved project could not be loaded. Contact the committee."}})
      return
    }
    publish({...state,
      contentErrors:{...state.contentErrors,[projectId]:""},
      covers:{...state.covers,[projectId]:{version:row.cache_version,image:(coverOnly ? row.cover : row.content?.coverImage) || ""}},
      ...(!coverOnly ? {drafts:{...state.drafts,[projectId]:row.content!},draftVersions:{...state.draftVersions,[projectId]:row.cache_version}} : {}),
    })
  })().catch(() => {
    if (identity === identityEpoch && state.summaries[projectId]) {
      publish({...state,contentErrors:{...state.contentErrors,[projectId]:"Could not load this project. Please try again."}})
    }
  }).finally(() => { contentFlights.delete(key) })
  contentFlights.set(key,task)
  return task
}

export async function adminSignIn(email: string, password: string) {
  if (!supabase) throw new Error("Sign-in is not configured yet.")
  const {error} = await supabase.auth.signInWithPassword({email:email.trim(),password})
  if (error) throw new Error("Could not sign in. Check your email and password.")
  const role = await supabase.rpc("myssp_is_admin")
  if (role.error || role.data !== true) { await supabase.auth.signOut(); throw new Error("This account does not have committee access. Ask the project owner to complete setup.") }
  await refreshBackend()
}
export async function participantSignIn(email: string, token: string) {
  if (!supabase) return false
  const {data, error} = await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password:token.trim().toUpperCase()})
  if (error || !data.user) return false
  // Auth also triggers a background refresh. Check this user's assignment directly
  // so a competing refresh cannot reject a valid code before state is published.
  const [assignment, role] = await Promise.all([
    supabase.from("myssp_participants").select("id").eq("user_id", data.user.id).eq("revoked", false).limit(1),
    supabase.rpc("myssp_is_admin"),
  ])
  const allowed = !assignment.error && !role.error && role.data !== true && Boolean(assignment.data?.length)
  if (!allowed) await supabase.auth.signOut()
  else await refreshBackend()
  return allowed
}
export async function mentorSignInLive(email: string, token: string) {
  if (!supabase) return false
  const {data, error} = await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password:token.trim().toUpperCase()})
  if (error || !data.user) return false
  const [mentor, role] = await Promise.all([
    supabase.from("myssp_mentors").select("id").eq("user_id",data.user.id).eq("revoked",false).limit(1),
    supabase.rpc("myssp_is_admin"),
  ])
  const allowed = !mentor.error && !role.error && role.data !== true && Boolean(mentor.data?.length)
  if (!allowed) await supabase.auth.signOut()
  else await refreshBackend()
  return allowed
}
export async function signOutLive() {
  if (!supabase) throw new Error("Sign-in is not configured yet.")
  const { error } = await supabase.auth.signOut({ scope: "local" })
  if (error) throw error
  epoch++
  publish(empty)
  await refreshBackend()
}
export function liveProject() { return state.ready && !state.isAdmin ? state.people.find(p => !p.revoked && state.boards.some(b => b.id === p.projectId))?.projectId || null : null }
export async function saveOwnProfileLive(name: string, photo: string) {
  if (!supabase || !state.userId) throw new Error("Sign in to update your profile.")
  if (state.isAdmin) {
    const { error } = await supabase.from("myssp_admin_profiles").upsert({ user_id: state.userId, name, photo })
    if (error) throw new Error("Could not update your profile. Please try again.")
  } else {
    const { error } = await supabase.rpc("myssp_update_own_profile", { full_name: name, profile_photo: photo })
    if (error) throw new Error(error.code === "PGRST202" ? "Profile editing needs the latest database update." : "Could not update your profile. Please try again.")
  }
  await refreshBackend()
}
export async function setDeletedLive(kind: "participant" | "project", id: string, remove: boolean, destination?: string) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const { error } = await supabase.rpc("myssp_set_deleted", {kind, record_id:id, remove, destination:destination ?? null})
  if (error) throw new Error(remove ? "Could not delete this record. Refresh and try again." : "Could not restore this record. Check the destination project and try again.")
  await refreshBackend()
}
export async function importLiveParticipants(rows: ImportRow[]) {
  if (!supabase || !state.isAdmin) return false
  const {error} = await supabase.rpc("myssp_import_participants", {rows:rows.map(r => ({name:r.name,email:r.email,project_id:r.projectId}))})
  if (error) return false
  await refreshBackend(); return true
}
export async function setProjectControl(ids: readonly string[], field: "published" | "editing_enabled", enabled: boolean) {
  if (!supabase || !state.isAdmin) return false
  const {data,error} = await supabase.from("myssp_projects").update({[field]:enabled}).in("id", [...ids]).select("id")
  await refreshBackend()
  return !error && data?.length === ids.length
}
export async function setLiveSubmissionDeadline(year: number, closingTime: string | null, expectedClosingTime: string | null, reopenProjects: boolean, closeNow = false) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const userId = state.userId
  const {data,error} = await supabase.rpc("myssp_set_submission_deadline", {
    cohort_year: year, closing_time: closingTime, expected_closing_time: expectedClosingTime,
    reopen_projects: reopenProjects, close_now: closeNow,
  })
  if (error) {
    if (error.code === "PGRST202") throw new Error("Deadline controls need the latest database update.")
    throw new Error(error.message || "Could not update the deadline. Please try again.")
  }
  // Preserve a confirmed change if the subsequent read is temporarily offline.
  if (state.userId === userId && state.isAdmin) {
    epoch++
    publish({...state,
      submissionDeadlines:{...state.submissionDeadlines,[year]:data as string | null},
      editing:reopenProjects ? {...state.editing,...Object.fromEntries(state.boards.filter(b => b.year === year).map(b => [b.id,true]))} : state.editing,
    })
  }
  await refreshBackend()
}
export async function changeLiveAssignment(id:string, projectId:string, revoked:boolean) {
  if (!supabase || !state.isAdmin) return false
  const {data,error} = await supabase.from("myssp_participants").update({project_id:projectId,revoked}).eq("id",id).select("id")
  await refreshBackend(); return !error && data?.length === 1
}
export async function saveLiveParticipant(person: Assignment, details: ParticipantDetails) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const { error } = await supabase.rpc("myssp_update_participant", {
    participant: person.id, full_name: details.name, school: details.school,
    project: details.projectId, access_revoked: details.revoked,
    expected_name: person.name, expected_school: person.displayProfile?.school || "",
    expected_profile_name: person.displayProfile?.name || "",
    expected_project: person.projectId, expected_revoked: person.revoked,
  })
  await refreshBackend()
  if (error) {
    if (error.code === "PGRST202") throw new Error("Profile editing needs the latest database migration. Ask the site maintainer to apply it.")
    throw new Error("Could not save participant details. The record may have changed. Close and reopen it before trying again.")
  }
  return true
}
export async function inviteLiveParticipants(ids:string[]) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const client = supabase
  try {
    return await sendInvitationBatches(ids, async batch => {
      const {data,error} = await client.functions.invoke("invite-participants", {body:{ids:batch}})
      if (error) throw error
      return data as {sent:number;failed:number}
    })
  } finally {
    await refreshBackend()
  }
}
export async function saveLiveMentor(input: MentorInput, id?: string) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const { error } = await supabase.rpc("myssp_save_mentor", {
    mentor_id: id || null, mentor_name: input.name.trim(), mentor_email: input.email.trim().toLowerCase(),
    mentor_affiliation: input.affiliation.trim(), project_ids: input.projectIds,
    access_revoked: input.revoked,
  })
  if (error) throw new Error(error.code === "PGRST202" ? "Apply the mentor database migration first." : error.message)
  await refreshBackend()
}
export async function setMentorDeletedLive(id: string, deleted: boolean) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const { error } = await supabase.rpc("myssp_set_mentor_deleted", { target: id, remove: deleted })
  if (error) throw new Error(error.code === "PGRST202" ? "Mentor account management needs a database update. Contact the site administrator." : error.message)
  await refreshBackend()
}
export async function importLiveMentors(inputs: MentorInput[]) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const { error } = await supabase.rpc("myssp_import_mentors", { rows: inputs.map(input => ({
    name: input.name.trim(), email: input.email.trim().toLowerCase(), affiliation: input.affiliation.trim(),
    project_ids: input.projectIds,
  })) })
  if (error) throw new Error(error.code === "PGRST202" ? "Apply the mentor database migration first." : "Could not import mentors. Check for duplicate emails and project assignments.")
  await refreshBackend()
}
export async function inviteLiveMentors(ids: string[]) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const client = supabase
  try {
    return await sendInvitationBatches(ids, async batch => {
      const {data,error} = await client.functions.invoke("invite-mentors", {body:{ids:batch}})
      if (error) throw error
      return data as {sent:number;failed:number}
    })
  } finally { await refreshBackend() }
}
export async function saveLiveDraft(draft:Draft, expectedRevision:number) {
  if (!supabase || liveProject() !== draft.projectId) return false
  const userId = state.userId
  const {error} = await supabase.rpc("myssp_save_submission",{project:draft.projectId,body:draft,expected_revision:expectedRevision})
  if (error) { await refreshBackend(); return false }
  // The write is confirmed even if the next read fails. Keep that saved version
  // available without overwriting a newer teammate revision or another session.
  if (state.userId === userId && liveProject() === draft.projectId && (state.revisions[draft.projectId] ?? 0) <= expectedRevision) {
    epoch++
    publish({...state, drafts: {...state.drafts, [draft.projectId]: draft}, revisions: {...state.revisions, [draft.projectId]: expectedRevision + 1}})
  }
  await refreshBackend(); return true
}
export async function splitLiveProject(split:ProjectSplit, boards:Board[], assignments:Record<string,string>) {
  if (!supabase || !state.isAdmin) return "Committee sign-in required."
  const {error} = await supabase.rpc("myssp_split_project", {parent:split.parentId, children:boards.map(b=>({id:b.id,code:b.code,payload:b})), assignments})
  if (error) return "Could not split this project. Check every participant has a new assignment."
  await refreshBackend(); return null
}
export async function createLiveCohort(year: number, name: string) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const { error } = await supabase.rpc("myssp_create_cohort", { cohort_year: year, cohort_name: name.trim() })
  if (error) throw new Error(error.code === "23505" ? "This cohort already exists. Refresh and select it." : state.cohortError || "Could not create the cohort. Refresh and try again.")
  await refreshBackend()
}
export async function createLiveResearchField(field: ResearchField) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const { data, error } = await supabase.rpc("myssp_create_research_field", { field_name: field.name, code_prefix: field.prefix })
  if (error) throw new Error(error.code === "23505" ? "This research field already exists. Refresh and select it." : "Could not add the research field. Check the database connection and try again.")
  const created = data as ResearchField
  // Keep the confirmed write even if the refresh subsequently fails.
  epoch++
  publish({ ...state, researchFields: [...state.researchFields.filter(f => f.name !== created.name), created] })
  await refreshBackend()
  return created
}
export async function saveLiveProject(input: ProjectInput, previous?: Board) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  const { data, error } = await supabase.rpc("myssp_save_project_brief", {
    details: input, project: previous?.id || null,
    expected: previous ? Object.fromEntries(["title", "track", "mentor", "affiliation", "description"].map(key => [key, previous[key as keyof Board]])) : null,
  })
  if (error) throw new Error(error.code === "23505" ? `${input.code} is already used in ${input.year}, including archived projects.` : state.cohortError || "Could not save this project. It may have changed; close and reopen the form.")
  await refreshBackend()
  return data as string
}
if (useLiveBackend && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && state.userId !== session?.user.id)) { epoch++; publish(empty) }
    // Defer database calls until the auth client's lock has been released.
    if (event !== "TOKEN_REFRESHED") window.setTimeout(() => void refreshBackend(), 0)
  })
  void refreshBackend()
  window.setInterval(() => { if (document.visibilityState === "visible") void refreshBackend(false) }, 30000)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refreshBackend(false)
  })
}
