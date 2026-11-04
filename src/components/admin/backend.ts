import { useSyncExternalStore } from "react"
import { supabase } from "@/lib/supabase"
import { isLocalPreview } from "./local-preview"
import type { Assignment, ImportRow } from "./access-model"
import type { Board, Draft } from "../projectboard/data"
import { isDraft } from "../projectboard/data"
import type { ProjectSplit } from "./project-registry-model"

// Device-only preparation stays available on localhost. Production never uses it.
export const useLiveBackend = !isLocalPreview || import.meta.env.VITE_ACCESS_MODE === "supabase"
type ProjectRecord = { id: string; code: string; payload: Board; published: boolean; editing_enabled: boolean; retired: boolean }
type State = {
  ready: boolean; error: string; isAdmin: boolean; userId: string | null;
  people: Assignment[]; projects: ProjectRecord[]; drafts: Record<string, Draft>; revisions: Record<string, number>;
  visibility: Record<string, boolean>; editing: Record<string, boolean>; boards: Board[];
}
const empty: State = { ready: false, error: "", isAdmin: false, userId: null, people: [], projects: [], drafts: {}, revisions: {}, visibility: {}, editing: {}, boards: [] }
let state = empty
const listeners = new Set<() => void>()
let epoch = 0
function publish(next: State) { state = next; listeners.forEach(fn => fn()) }
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export const getBackend = () => state
export const useBackend = () => useSyncExternalStore(subscribe, getBackend)

export async function refreshBackend() {
  if (!useLiveBackend || !supabase) return
  const ticket = ++epoch
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user.id || null
    const [projects, people, drafts, role] = await Promise.all([
      supabase.from("myssp_projects").select("*").eq("retired", false).order("code"),
      userId ? supabase.from("myssp_participants").select("*") : Promise.resolve({data: [], error: null}),
      supabase.from("myssp_submissions").select("project_id,content,revision"),
      userId ? supabase.rpc("myssp_is_admin") : Promise.resolve({data: false, error: null}),
    ])
    if (projects.error || people.error || drafts.error || role.error) throw new Error("Database setup is incomplete or access was denied.")
    if (ticket !== epoch) return
    const records = projects.data as ProjectRecord[]
    publish({
      ready: true, error: "", isAdmin: role.data === true, userId,
      projects: records, boards: records.map(p => ({...p.payload, id: p.id, code: p.code})),
      visibility: Object.fromEntries(records.map(p => [p.id,p.published])),
      editing: Object.fromEntries(records.map(p => [p.id,p.editing_enabled])),
      drafts: Object.fromEntries((drafts.data || []).filter(d => {
        const project = records.find(p => p.id === d.project_id)
        return project && isDraft(d.content, {...project.payload, id: project.id, code: project.code})
      }).map(d => [d.project_id,d.content])),
      revisions: Object.fromEntries((drafts.data || []).map(d => [d.project_id,d.revision])),
      people: (people.data || []).map(p => ({id:p.id, name:p.name, email:p.email, projectId:p.project_id, revision:1, revoked:p.revoked, code:null, expiresAt:0, usedAt:null, invitedAt:p.invited_at ? Date.parse(p.invited_at) : null, attempts:0, lockedUntil:0})),
    })
  } catch (error) {
    if (ticket === epoch) publish({...empty, error: error instanceof Error ? error.message : "Could not connect to the database."})
  }
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
export async function signOutLive() {
  epoch++
  publish(empty)
  await supabase?.auth.signOut()
  await refreshBackend()
}
export function liveProject() { return state.ready && !state.isAdmin ? state.people.find(p => !p.revoked)?.projectId || null : null }
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
export async function changeLiveAssignment(id:string, projectId:string, revoked:boolean) {
  if (!supabase || !state.isAdmin) return false
  const {data,error} = await supabase.from("myssp_participants").update({project_id:projectId,revoked}).eq("id",id).select("id")
  await refreshBackend(); return !error && data?.length === 1
}
export async function inviteLiveParticipants(ids:string[]) {
  if (!supabase || !state.isAdmin) throw new Error("Committee sign-in required.")
  if (ids.length > 50) throw new Error("Send invitations to up to 50 participants at a time.")
  const {data,error} = await supabase.functions.invoke("invite-participants", {body:{ids}})
  if (error) throw new Error("Invitation delivery failed. Check the email setup before retrying.")
  await refreshBackend()
  return data as {sent:number;failed:number}
}
export async function saveLiveDraft(draft:Draft, expectedRevision:number) {
  if (!supabase || liveProject() !== draft.projectId) return false
  const {error} = await supabase.rpc("myssp_save_submission",{project:draft.projectId,body:draft,expected_revision:expectedRevision})
  if (error) { await refreshBackend(); return false }
  await refreshBackend(); return true
}
export async function splitLiveProject(split:ProjectSplit, boards:Board[], assignments:Record<string,string>) {
  if (!supabase || !state.isAdmin) return "Committee sign-in required."
  const {error} = await supabase.rpc("myssp_split_project", {parent:split.parentId, children:boards.map(b=>({id:b.id,code:b.code,payload:b})), assignments})
  if (error) return "Could not split this project. Check every participant has a new assignment."
  await refreshBackend(); return null
}
if (useLiveBackend && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && state.userId !== session?.user.id)) { epoch++; publish(empty) }
    // Defer database calls until the auth client's lock has been released.
    window.setTimeout(() => void refreshBackend(), 0)
  })
  void refreshBackend()
  window.setInterval(() => { if (document.visibilityState === "visible") void refreshBackend() }, 30000)
}
