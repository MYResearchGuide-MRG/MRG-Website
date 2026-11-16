import { useSyncExternalStore } from "react"
import { supabase } from "@/lib/supabase"
import { getProjectBoards } from "../admin/project-registry"
import { refreshBackend } from "../admin/backend"
import { judgingPreviewMode, onPreviewChange, previewSessionKey, readPreview, writePreview } from "./judging-preview"
import { scoreKeys, type FeedbackAnswers, type ScoreKey } from "./form"

export type Judge = {
  id: string
  cohortYear: number
  name: string
  email: string
  affiliation: string
}
export type JudgeReview = FeedbackAnswers & {
  projectId: string
  submittedAt: string | null
  updatedAt: string
}
export type ReviewStatus = "not-started" | "draft" | "submitted"

type State = {
  ready: boolean
  judge: Judge | null
  /** Project ids in presentation order. */
  lineup: string[]
  reviews: Record<string, JudgeReview>
  judgingOpen: boolean
  /** Teams can see averaged scores and anonymous remarks. */
  feedbackReleased: boolean
  error: string
}
const empty: State = { ready: false, judge: null, lineup: [], reviews: {}, judgingOpen: false, feedbackReleased: false, error: "" }
let state: State = empty
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
function publish(next: State) { state = next; listeners.forEach(fn => fn()) }
export const getJudgeAccess = () => state
export const useJudgeAccess = () => useSyncExternalStore(subscribe, getJudgeAccess)

export function reviewStatus(review: JudgeReview | undefined): ReviewStatus {
  return !review ? "not-started" : review.submittedAt ? "submitted" : "draft"
}

// Device-only preview -----------------------------------------------------------
// Mirrors the database rules using the shared preview store (judging-preview.ts),
// so judges, lineups and switches set in the admin preview apply here.
const previewMode = judgingPreviewMode
export const previewJudgeHint = previewMode ? "judge@preview.local / JUDGE1, or a judge you add in the admin preview" : ""

function previewSessionJudge() {
  const id = sessionStorage.getItem(previewSessionKey)
  return readPreview().judges.find(judge => judge.id === id && !judge.revoked && !judge.deletedAt) || null
}
function loadPreview() {
  if (!previewMode) return
  const data = readPreview()
  const found = previewSessionJudge()
  const active = new Set(getProjectBoards().map(board => board.id))
  publish({
    ready: true, error: "",
    judge: found && { id: found.id, cohortYear: found.cohortYear, name: found.name, email: found.email, affiliation: found.affiliation },
    lineup: found ? (data.lineups[found.cohortYear] || []).filter(id => active.has(id)) : [],
    reviews: found ? data.reviews[found.id] || {} : {},
    judgingOpen: Boolean(found && data.switches[found.cohortYear]?.judgingOpen),
    feedbackReleased: Boolean(found && data.switches[found.cohortYear]?.feedbackReleased),
  })
}

// Live database -------------------------------------------------------------------
type FeedbackRow = Record<ScoreKey, number | null> & {
  project_id: string; research_remarks: string; presentation_remarks: string; submitted_at: string | null; updated_at: string
}
function fromRow(row: FeedbackRow): JudgeReview {
  return {
    ...(Object.fromEntries(scoreKeys.map(key => [key, row[key]])) as Record<ScoreKey, number | null>),
    researchRemarks: row.research_remarks, presentationRemarks: row.presentation_remarks,
    projectId: row.project_id,
    submittedAt: row.submitted_at, updatedAt: row.updated_at,
  }
}

let epoch = 0
export async function refreshJudging() {
  if (previewMode) return loadPreview()
  if (!supabase) return
  const ticket = ++epoch
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user.id
    if (!userId) { if (ticket === epoch) publish({ ...empty, ready: true }); return }
    const judges = await supabase.from("myssp_judges")
      .select("id,cohort_year,name,email,affiliation").eq("user_id", userId)
      .eq("revoked", false).is("deleted_at", null).maybeSingle()
    if (judges.error) throw new Error("Judging needs the latest database update.")
    if (!judges.data) { if (ticket === epoch) publish({ ...empty, ready: true }); return }
    const judge: Judge = {
      id: judges.data.id, cohortYear: judges.data.cohort_year, name: judges.data.name,
      email: judges.data.email, affiliation: judges.data.affiliation,
    }
    const [lineup, feedback, judging] = await Promise.all([
      supabase.from("myssp_judging_lineup").select("project_id,position")
        .eq("cohort_year", judge.cohortYear).order("position"),
      supabase.from("myssp_judge_feedback").select("*").eq("judge_id", judge.id),
      supabase.rpc("myssp_judging_state"),
    ])
    if (lineup.error || feedback.error || judging.error) throw new Error("Could not load your judging lineup.")
    if (ticket !== epoch) return
    const cohort = (judging.data as { year: number; judging_open: boolean; feedback_released: boolean }[])
      .find(row => row.year === judge.cohortYear)
    publish({
      ready: true, error: "", judge,
      lineup: lineup.data.map(row => row.project_id),
      reviews: Object.fromEntries((feedback.data as FeedbackRow[]).map(row => [row.project_id, fromRow(row)])),
      judgingOpen: Boolean(cohort?.judging_open),
      feedbackReleased: Boolean(cohort?.feedback_released),
    })
  } catch (error) {
    // Keep the current page and any unsaved answers; the next refresh retries.
    if (ticket === epoch) publish({ ...state, ready: true, error: error instanceof Error ? error.message : "Could not connect to the database." })
  }
}

/** Saves the signed-in judge's review. Returns the stored review. */
export async function saveReview(projectId: string, answers: FeedbackAnswers, submit: boolean): Promise<JudgeReview> {
  const previous = state.reviews[projectId]
  const now = new Date().toISOString()
  let submittedAt: string | null
  if (previewMode) {
    loadPreview() // pick up committee changes made in another tab
    if (!state.judge) throw new Error("Sign in as a judge to save.")
    if (!state.lineup.includes(projectId)) throw new Error("This project is no longer in your lineup.")
    if (!state.judgingOpen) throw new Error("Judging is closed. Your last saved answers are kept.")
    submittedAt = previous?.submittedAt || (submit ? now : null)
  } else {
    if (!supabase) throw new Error("Sign-in is not configured yet.")
    const { data, error } = await supabase.rpc("myssp_save_judge_feedback", {
      project: projectId, answers, submit,
    })
    if (error) {
      if (error.message.includes("closed")) throw new Error("Judging is closed. Your last saved answers are kept.")
      if (error.message.includes("Answer every score")) throw new Error("Answer every score and add a remark.")
      if (error.message.includes("lineup") || error.code === "42501") throw new Error("This project is no longer in your lineup.")
      throw new Error("Could not save. Check your connection and try again.")
    }
    submittedAt = data as string | null
  }
  const review: JudgeReview = { ...answers, projectId, submittedAt, updatedAt: now }
  const reviews = { ...state.reviews, [projectId]: review }
  if (previewMode && state.judge) {
    const data = readPreview()
    writePreview({ ...data, reviews: { ...data.reviews, [state.judge.id]: reviews } })
  }
  epoch++ // a refresh already in flight must not overwrite this confirmed save
  publish({ ...state, reviews })
  return review
}

export async function judgeSignIn(email: string, code: string) {
  if (previewMode) {
    const found = readPreview().judges.find(judge => judge.email === email.trim().toLowerCase()
      && judge.code === code.trim().toUpperCase() && !judge.revoked && !judge.deletedAt)
    if (found) { sessionStorage.setItem(previewSessionKey, found.id); loadPreview() }
    return Boolean(found)
  }
  if (!supabase) return false
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(), password: code.trim().toUpperCase(),
  })
  if (error || !data.user) return false
  const [judge, role] = await Promise.all([
    supabase.from("myssp_judges").select("id").eq("user_id", data.user.id)
      .eq("revoked", false).is("deleted_at", null).limit(1),
    supabase.rpc("myssp_is_admin"),
  ])
  const allowed = !judge.error && !role.error && role.data !== true && Boolean(judge.data?.length)
  if (!allowed) { await supabase.auth.signOut(); return false }
  await Promise.all([refreshBackend(), refreshJudging()])
  return true
}

/** Clears the preview session. Live sign-out goes through the shared Supabase session. */
export function signOutJudge() {
  if (previewMode) { sessionStorage.removeItem(previewSessionKey); loadPreview() }
}

if (typeof window !== "undefined") {
  if (previewMode) { loadPreview(); onPreviewChange(loadPreview) }
  else if (supabase) {
    supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") { epoch++; publish({ ...empty, ready: true }) }
      window.setTimeout(() => void refreshJudging(), 0)
    })
    void refreshJudging()
    // Pick up lineup changes and the committee's open/close switch.
    window.setInterval(() => { if (document.visibilityState === "visible") void refreshJudging() }, 30000)
  }
}
