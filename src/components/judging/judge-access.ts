import { useSyncExternalStore } from "react"
import { supabase } from "@/lib/supabase"
import { getProjectBoards } from "../admin/project-registry"
import { refreshBackend } from "../admin/backend"
import {
  judgingPreviewMode,
  onPreviewChange,
  previewSessionKey,
  readPreview,
  writePreview,
} from "./judging-preview"
import {
  missingAnswers,
  scoreKeys,
  withoutPresentation,
  type FeedbackAnswers,
  type ScoreKey,
} from "./form"

export type Judge = {
  id: string
  cohortYear: number
  name: string
  email: string
  affiliation: string
  /** False for a judge who reviews the research only. */
  attendsDemoDay: boolean
}
export type JudgeReview = FeedbackAnswers & {
  /** Has no presentation answers; saved by a judge not attending Demo Day. */
  researchOnly: boolean
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
const empty: State = {
  ready: false,
  judge: null,
  lineup: [],
  reviews: {},
  judgingOpen: false,
  feedbackReleased: false,
  error: "",
}
let state: State = empty
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
function publish(next: State) {
  state = next
  listeners.forEach((fn) => fn())
}
export const getJudgeAccess = () => state
export const useJudgeAccess = () =>
  useSyncExternalStore(subscribe, getJudgeAccess)

export function reviewStatus(review: JudgeReview | undefined): ReviewStatus {
  return !review ? "not-started" : review.submittedAt ? "submitted" : "draft"
}

export function answersFromReview(review: JudgeReview): FeedbackAnswers {
  return {
    ...(Object.fromEntries(
      scoreKeys.map((key) => [key, review[key]])
    ) as Record<ScoreKey, number | null>),
    researchRemarks: review.researchRemarks,
    presentationRemarks: review.presentationRemarks,
  }
}

/** Whether this judge reviews the research only. */
export const researchOnlyJudge = (judge: Judge | null) =>
  Boolean(judge && !judge.attendsDemoDay)

export function reviewComplete(
  review: JudgeReview | undefined,
  researchOnly = review?.researchOnly ?? false
) {
  return Boolean(
    review &&
      missingAnswers(answersFromReview(review), researchOnly).length === 0
  )
}

// Device-only preview -----------------------------------------------------------
// Mirrors the database rules using the shared preview store (judging-preview.ts),
// so judges, lineups and switches set in the admin preview apply here.
const previewMode = judgingPreviewMode
export const previewJudgeHint = previewMode
  ? "judge@preview.local / JUDGE1, or a judge you add in the admin preview"
  : ""

function previewSessionJudge() {
  const id = sessionStorage.getItem(previewSessionKey)
  return (
    readPreview().judges.find(
      (judge) => judge.id === id && !judge.revoked && !judge.deletedAt
    ) || null
  )
}
function loadPreview() {
  if (!previewMode) return
  const data = readPreview()
  const found = previewSessionJudge()
  const active = new Set(getProjectBoards().map((board) => board.id))
  publish({
    ready: true,
    error: "",
    judge: found && {
      id: found.id,
      cohortYear: found.cohortYear,
      name: found.name,
      email: found.email,
      affiliation: found.affiliation,
      attendsDemoDay: found.attendsDemoDay,
    },
    lineup: found
      ? (data.lineups[found.cohortYear] || []).filter((id) => active.has(id))
      : [],
    reviews: found ? data.reviews[found.id] || {} : {},
    judgingOpen: Boolean(found && data.switches[found.cohortYear]?.judgingOpen),
    feedbackReleased: Boolean(
      found && data.switches[found.cohortYear]?.feedbackReleased
    ),
  })
}

// Live database -------------------------------------------------------------------
type FeedbackRow = Record<ScoreKey, number | null> & {
  project_id: string
  research_remarks: string
  presentation_remarks: string
  research_only: boolean
  submitted_at: string | null
  updated_at: string
}
function fromRow(row: FeedbackRow): JudgeReview {
  return {
    ...(Object.fromEntries(scoreKeys.map((key) => [key, row[key]])) as Record<
      ScoreKey,
      number | null
    >),
    researchRemarks: row.research_remarks,
    presentationRemarks: row.presentation_remarks,
    researchOnly: Boolean(row.research_only),
    projectId: row.project_id,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  }
}

let epoch = 0
export async function refreshJudging() {
  if (previewMode) return loadPreview()
  if (!supabase) return
  const ticket = ++epoch
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user.id
    if (!userId) {
      if (ticket === epoch) publish({ ...empty, ready: true })
      return
    }
    const judges = await supabase
      .from("myssp_judges")
      .select("id,cohort_year,name,email,affiliation,attends_demo_day")
      .eq("user_id", userId)
      .eq("revoked", false)
      .is("deleted_at", null)
      .maybeSingle()
    if (judges.error)
      throw new Error("Judging needs the latest database update.")
    if (!judges.data) {
      if (ticket === epoch) publish({ ...empty, ready: true })
      return
    }
    const judge: Judge = {
      id: judges.data.id,
      cohortYear: judges.data.cohort_year,
      name: judges.data.name,
      email: judges.data.email,
      affiliation: judges.data.affiliation,
      attendsDemoDay: judges.data.attends_demo_day !== false,
    }
    const [lineup, feedback, judging] = await Promise.all([
      supabase
        .from("myssp_judging_lineup")
        .select("project_id,position")
        .eq("cohort_year", judge.cohortYear)
        .order("position"),
      supabase
        .from("myssp_judge_feedback")
        .select("*")
        .eq("judge_id", judge.id),
      supabase.rpc("myssp_judging_state"),
    ])
    if (lineup.error || feedback.error || judging.error)
      throw new Error("Could not load your judging lineup.")
    if (ticket !== epoch) return
    const cohort = (
      judging.data as {
        year: number
        judging_open: boolean
        feedback_released: boolean
      }[]
    ).find((row) => row.year === judge.cohortYear)
    publish({
      ready: true,
      error: "",
      judge,
      lineup: lineup.data.map((row) => row.project_id),
      reviews: Object.fromEntries(
        (feedback.data as FeedbackRow[]).map((row) => [
          row.project_id,
          fromRow(row),
        ])
      ),
      judgingOpen: Boolean(cohort?.judging_open),
      feedbackReleased: Boolean(cohort?.feedback_released),
    })
  } catch (error) {
    // Keep the current page and any unsaved answers; the next refresh retries.
    if (ticket === epoch)
      publish({
        ...state,
        ready: true,
        error:
          error instanceof Error
            ? error.message
            : "Could not connect to the database.",
      })
  }
}

/** The database names the section reviews in snake_case, like its columns. */
function toDatabaseAnswers(answers: FeedbackAnswers) {
  return {
    ...Object.fromEntries(scoreKeys.map((key) => [key, answers[key]])),
    research_remarks: answers.researchRemarks,
    presentation_remarks: answers.presentationRemarks,
  }
}

function saveError(error: { code?: string; message: string }) {
  if (error.code === "40001")
    return new Error(
      "This review changed in another tab. Copy any unsaved text, then reload before saving."
    )
  if (error.code === "PGRST202")
    return new Error(
      "Judge saving needs the latest backend update. Your answers are still on this page."
    )
  if (error.message.includes("already submitted"))
    return new Error(
      "This review has already been submitted and can no longer be changed."
    )
  if (error.message.includes("closed"))
    return new Error("Judging is closed. Your last saved answers are kept.")
  if (error.message.includes("Answer every score"))
    return new Error("Answer every score and add a remark.")
  if (error.message.includes("Complete every"))
    return new Error(
      "Complete every team's review before submitting all reviews."
    )
  if (error.message.includes("lineup") || error.code === "42501")
    return new Error("This project is no longer in your lineup.")
  return new Error("Could not save. Check your connection and try again.")
}

/** Saves the signed-in judge's review. Returns the stored review. */
export async function saveReview(
  projectId: string,
  answers: FeedbackAnswers,
  submit: boolean,
  expectedUpdatedAt: string | null = state.reviews[projectId]?.updatedAt ?? null
): Promise<JudgeReview> {
  const identity = state.judge?.id
  if (!identity) throw new Error("Sign in as a judge to save.")
  // The database drops presentation answers for these judges too.
  const researchOnly = researchOnlyJudge(state.judge)
  if (researchOnly) answers = withoutPresentation(answers)
  const previous = state.reviews[projectId]
  let now = new Date().toISOString()
  let submittedAt: string | null
  if (previewMode) {
    loadPreview() // pick up committee changes made in another tab
    if ((state.reviews[projectId]?.updatedAt ?? null) !== expectedUpdatedAt)
      throw saveError({ code: "40001", message: "Stale review" })
    if (!state.judge) throw new Error("Sign in as a judge to save.")
    if (!state.lineup.includes(projectId))
      throw new Error("This project is no longer in your lineup.")
    if (!state.judgingOpen)
      throw new Error("Judging is closed. Your last saved answers are kept.")
    if (previous?.submittedAt)
      throw new Error(
        "This review has already been submitted and can no longer be changed."
      )
    if (submit && missingAnswers(answers, researchOnly).length)
      throw new Error("Answer every score and add a remark.")
    submittedAt = submit ? now : null
  } else {
    if (!supabase) throw new Error("Sign-in is not configured yet.")
    const { data, error } = await supabase.rpc("myssp_save_judge_review_v2", {
      project: projectId,
      answers: toDatabaseAnswers(answers),
      submit,
      expected_updated_at: expectedUpdatedAt,
    })
    if (error) throw saveError(error)
    submittedAt = data.submittedAt as string | null
    now = data.updatedAt as string
  }
  if (state.judge?.id !== identity)
    throw new Error("Your session changed. Sign in again before continuing.")
  const review: JudgeReview = {
    ...answers,
    researchOnly,
    projectId,
    submittedAt,
    updatedAt: now,
  }
  const reviews = { ...state.reviews, [projectId]: review }
  if (previewMode && state.judge) {
    const data = readPreview()
    writePreview({
      ...data,
      reviews: { ...data.reviews, [state.judge.id]: reviews },
    })
  }
  epoch++ // a refresh already in flight must not overwrite this confirmed save
  publish({ ...state, reviews })
  return review
}

/** Submits every review in the judge's lineup together: all of them, or none. */
export async function submitAllReviews() {
  if (previewMode) loadPreview() // pick up committee changes made in another tab
  const current = getJudgeAccess()
  if (!current.judge) throw new Error("Sign in as a judge to submit.")
  if (!current.judgingOpen)
    throw new Error("Judging is closed. Your last saved answers are kept.")
  const incomplete = current.lineup.filter(
    (projectId) =>
      !reviewComplete(
        current.reviews[projectId],
        researchOnlyJudge(current.judge)
      )
  )
  if (incomplete.length)
    throw new Error(
      "Complete every team's review before submitting all reviews."
    )
  if (previewMode) {
    const now = new Date().toISOString()
    const reviews = Object.fromEntries(
      Object.entries(current.reviews).map(([projectId, review]) => [
        projectId,
        !review.submittedAt && current.lineup.includes(projectId)
          ? { ...review, submittedAt: now, updatedAt: now }
          : review,
      ])
    )
    const data = readPreview()
    writePreview({
      ...data,
      reviews: { ...data.reviews, [current.judge.id]: reviews },
    })
    epoch++
    publish({ ...state, reviews })
    return current.lineup.length
  }
  if (!supabase) throw new Error("Sign-in is not configured yet.")
  // One database call, so a dropped connection can't leave half the lineup final.
  const { data, error } = await supabase.rpc("myssp_submit_judge_reviews")
  if (error) {
    await refreshJudging()
    throw saveError(error)
  }
  await refreshJudging()
  return data as number
}

export async function judgeSignIn(email: string, code: string) {
  if (previewMode) {
    const found = readPreview().judges.find(
      (judge) =>
        judge.email === email.trim().toLowerCase() &&
        judge.code === code.trim().toUpperCase() &&
        !judge.revoked &&
        !judge.deletedAt
    )
    if (found) {
      sessionStorage.setItem(previewSessionKey, found.id)
      loadPreview()
    }
    return Boolean(found)
  }
  if (!supabase) return false
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: code.trim().toUpperCase(),
  })
  if (error || !data.user) return false
  const [judge, role] = await Promise.all([
    supabase
      .from("myssp_judges")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("revoked", false)
      .is("deleted_at", null)
      .limit(1),
    supabase.rpc("myssp_is_admin"),
  ])
  const allowed =
    !judge.error &&
    !role.error &&
    role.data !== true &&
    Boolean(judge.data?.length)
  if (!allowed) {
    await supabase.auth.signOut()
    return false
  }
  await Promise.all([refreshBackend(), refreshJudging()])
  return true
}

/** Clears the preview session. Live sign-out goes through the shared Supabase session. */
export function signOutJudge() {
  if (previewMode) {
    sessionStorage.removeItem(previewSessionKey)
    loadPreview()
  }
}

if (typeof window !== "undefined") {
  if (previewMode) {
    loadPreview()
    onPreviewChange(loadPreview)
  } else if (supabase) {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
        epoch++
        publish({ ...empty, ready: event === "SIGNED_OUT" })
      }
      window.setTimeout(() => void refreshJudging(), 0)
    })
    void refreshJudging()
    // Pick up lineup changes and the committee's open/close switch.
    window.setInterval(() => {
      if (state.judge && document.visibilityState === "visible")
        void refreshJudging()
    }, 60000)
  }
}
