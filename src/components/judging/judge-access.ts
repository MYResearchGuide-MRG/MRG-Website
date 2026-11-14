import { useSyncExternalStore } from "react"
import { supabase } from "@/lib/supabase"
import { getProjectBoards } from "../admin/project-registry"
import { refreshBackend, useLiveBackend } from "../admin/backend"
import { isLocalPreview } from "../admin/local-preview"
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
  error: string
}
const empty: State = { ready: false, judge: null, lineup: [], reviews: {}, judgingOpen: false, error: "" }
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
// Lets the judging pages be exercised on localhost without the database. One
// fixed judge account; the lineup is the latest cohort in project-code order.
// Production never reaches this branch (isLocalPreview is false there).
const previewMode = isLocalPreview && !useLiveBackend
const previewJudge: Judge & { code: string } = {
  id: "preview-judge", cohortYear: 0, name: "Preview Judge",
  email: "judge@preview.local", affiliation: "Local preview", code: "JUDGE1",
}
const previewReviewsKey = "myssp-judge-preview-reviews-v1"
const previewSessionKey = "myssp-judge-preview-session-v1"
export const previewJudgeHint = previewMode ? `${previewJudge.email} / ${previewJudge.code}` : ""

function previewLineup() {
  const boards = getProjectBoards()
  const year = Math.max(...boards.map(board => board.year))
  return boards.filter(board => board.year === year)
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map(board => board.id)
}
function loadPreview() {
  if (!previewMode) return
  let reviews: Record<string, JudgeReview> = {}
  try { reviews = JSON.parse(localStorage.getItem(previewReviewsKey) || "{}") } catch { /* start empty */ }
  const signedIn = sessionStorage.getItem(previewSessionKey) === previewJudge.id
  publish({
    ready: true, error: "", judgingOpen: true, reviews,
    judge: signedIn ? previewJudge : null,
    lineup: signedIn ? previewLineup() : [],
  })
}

// Live database -------------------------------------------------------------------
type FeedbackRow = Record<ScoreKey, number | null> & {
  project_id: string; remarks: string; submitted_at: string | null; updated_at: string
}
function fromRow(row: FeedbackRow): JudgeReview {
  return {
    ...(Object.fromEntries(scoreKeys.map(key => [key, row[key]])) as Record<ScoreKey, number | null>),
    remarks: row.remarks, projectId: row.project_id,
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
    const cohort = (judging.data as { year: number; judging_open: boolean }[])
      .find(row => row.year === judge.cohortYear)
    publish({
      ready: true, error: "", judge,
      lineup: lineup.data.map(row => row.project_id),
      reviews: Object.fromEntries((feedback.data as FeedbackRow[]).map(row => [row.project_id, fromRow(row)])),
      judgingOpen: Boolean(cohort?.judging_open),
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
    if (!state.judge) throw new Error("Sign in as a judge to save.")
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
  if (previewMode) localStorage.setItem(previewReviewsKey, JSON.stringify(reviews))
  epoch++ // a refresh already in flight must not overwrite this confirmed save
  publish({ ...state, reviews })
  return review
}

export async function judgeSignIn(email: string, code: string) {
  if (previewMode) {
    const ok = email.trim().toLowerCase() === previewJudge.email && code.trim().toUpperCase() === previewJudge.code
    if (ok) { sessionStorage.setItem(previewSessionKey, previewJudge.id); loadPreview() }
    return ok
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
  if (previewMode) loadPreview()
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
