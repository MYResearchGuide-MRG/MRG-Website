// Committee-side judging data: judges, lineups, switches and every review.
import { useEffect, useSyncExternalStore } from "react"
import { supabase } from "@/lib/supabase"
import { generateCode } from "../admin/access-model"
import { getBackend, useBackend } from "../admin/backend"
import { sendInvitationBatches } from "../admin/invitation-batches"
import { scoreKeys, type ScoreKey } from "./form"
import { closedSwitches, judgeInputError, type CommitteeJudge, type CommitteeReview, type JudgeInput, type JudgingSwitches } from "./judge-model"
import { judgingPreviewMode, onPreviewChange, readPreview, writePreview } from "./judging-preview"

type State = {
  ready: boolean
  judges: CommitteeJudge[]
  lineups: Record<number, string[]>
  switches: Record<number, JudgingSwitches>
  reviews: CommitteeReview[]
  error: string
}
const empty: State = { ready: false, judges: [], lineups: {}, switches: {}, reviews: [], error: "" }
let state = empty
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
function publish(next: State) { state = next; listeners.forEach(fn => fn()) }

/** Loads on first use and refreshes every 30 seconds while the panel is open. */
export function useCommitteeJudging() {
  const snapshot = useSyncExternalStore(subscribe, () => state)
  const { isAdmin, userId } = useBackend()
  useEffect(() => {
    void refreshCommitteeJudging()
    const id = window.setInterval(() => { if (document.visibilityState === "visible") void refreshCommitteeJudging() }, 30000)
    return () => window.clearInterval(id)
  }, [isAdmin, userId])
  return snapshot
}
export const switchesFor = (snapshot: State, year: number) => snapshot.switches[year] ?? closedSwitches

function fromPreview() {
  const data = readPreview()
  publish({
    ready: true, error: "",
    judges: data.judges.map(judge => ({ ...judge, code: undefined })),
    lineups: data.lineups, switches: data.switches,
    reviews: Object.entries(data.reviews).flatMap(([judgeId, byProject]) =>
      Object.values(byProject).map(review => ({ ...review, judgeId }))),
  })
}
if (judgingPreviewMode) onPreviewChange(() => { if (state.ready) fromPreview() })

type JudgeRow = { id: string; user_id: string | null; cohort_year: number; name: string; email: string; affiliation: string; revoked: boolean; invited_at: string | null; deleted_at: string | null }
type FeedbackRow = Record<ScoreKey, number | null> & { judge_id: string; project_id: string; remarks: string; submitted_at: string | null; updated_at: string }

let epoch = 0
export async function refreshCommitteeJudging() {
  if (judgingPreviewMode) return fromPreview()
  if (!supabase || !getBackend().isAdmin) return
  const ticket = ++epoch
  const [judges, lineup, feedback, switches] = await Promise.all([
    supabase.from("myssp_judges").select("id,user_id,cohort_year,name,email,affiliation,revoked,invited_at,deleted_at").order("name"),
    supabase.from("myssp_judging_lineup").select("project_id,cohort_year,position").order("position"),
    supabase.from("myssp_judge_feedback").select("*"),
    supabase.rpc("myssp_judging_state"),
  ])
  if (ticket !== epoch) return
  if (judges.error || lineup.error || feedback.error || switches.error) {
    publish({ ...state, ready: true, error: "Judging needs the judging database migration. Apply 202611140001_judging.sql first." })
    return
  }
  const lineups: Record<number, string[]> = {}
  for (const row of lineup.data) (lineups[row.cohort_year] ||= []).push(row.project_id)
  publish({
    ready: true, error: "",
    judges: (judges.data as JudgeRow[]).map(row => ({
      id: row.id, userId: row.user_id, cohortYear: row.cohort_year, name: row.name, email: row.email,
      affiliation: row.affiliation, revoked: row.revoked, deletedAt: row.deleted_at,
      invitedAt: row.invited_at ? Date.parse(row.invited_at) : null,
    })),
    lineups,
    switches: Object.fromEntries((switches.data as { year: number; judging_open: boolean; feedback_released: boolean }[])
      .map(row => [row.year, { judgingOpen: row.judging_open, feedbackReleased: row.feedback_released }])),
    reviews: (feedback.data as FeedbackRow[]).map(row => ({
      ...(Object.fromEntries(scoreKeys.map(key => [key, row[key]])) as Record<ScoreKey, number | null>),
      judgeId: row.judge_id, projectId: row.project_id, remarks: row.remarks,
      submittedAt: row.submitted_at, updatedAt: row.updated_at,
    })),
  })
}

function requireAdmin() {
  if (!supabase || !getBackend().isAdmin) throw new Error("Committee sign-in required.")
  return supabase
}
// Supabase errors from these functions are written for the committee, so show them.
function failure(error: { code?: string; message: string }, fallback: string) {
  return new Error(error.code === "PGRST202" ? "Apply the judging database migration first." : error.message || fallback)
}

export async function saveJudge(input: JudgeInput, id?: string) {
  const problem = judgeInputError(input, state.judges, id)
  if (problem) throw new Error(problem)
  const clean = { ...input, name: input.name.trim(), email: input.email.trim().toLowerCase(), affiliation: input.affiliation.trim() }
  if (judgingPreviewMode) {
    const data = readPreview()
    if (id) {
      const previous = data.judges.find(judge => judge.id === id)
      if (!previous || previous.deletedAt) throw new Error("Restore this judge before editing their details.")
      const emailChanged = previous.email !== clean.email
      writePreview({ ...data, judges: data.judges.map(judge => judge.id === id
        ? { ...judge, ...clean, ...(emailChanged ? { userId: null, invitedAt: null, code: undefined } : {}) } : judge) })
    } else {
      writePreview({ ...data, judges: [...data.judges, { ...clean, id: crypto.randomUUID(), userId: null, invitedAt: null, deletedAt: null }] })
    }
    return
  }
  const { error } = await requireAdmin().rpc("myssp_save_judge", {
    judge_id: id || null, judge_cohort: clean.cohortYear, judge_name: clean.name,
    judge_email: clean.email, judge_affiliation: clean.affiliation, access_revoked: clean.revoked,
  })
  if (error) throw failure(error, "Could not save this judge.")
  await refreshCommitteeJudging()
}

export async function setJudgeDeleted(id: string, deleted: boolean) {
  if (judgingPreviewMode) {
    const data = readPreview()
    writePreview({ ...data, judges: data.judges.map(judge => judge.id === id ? { ...judge, deletedAt: deleted ? new Date().toISOString() : null } : judge) })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_set_judge_deleted", { target: id, remove: deleted })
  if (error) throw failure(error, "Could not update this judge.")
  await refreshCommitteeJudging()
}

export async function inviteJudges(ids: string[]): Promise<{ sent: number; failed: number }> {
  if (judgingPreviewMode) {
    const data = readPreview()
    writePreview({ ...data, judges: data.judges.map(judge => ids.includes(judge.id) && !judge.revoked && !judge.deletedAt
      ? { ...judge, code: generateCode(), invitedAt: Date.now() } : judge) })
    return { sent: 0, failed: 0 }
  }
  const client = requireAdmin()
  try {
    return await sendInvitationBatches(ids, async batch => {
      const { data, error } = await client.functions.invoke("invite-judges", { body: { ids: batch } })
      if (error) throw error
      return data as { sent: number; failed: number }
    })
  } finally { await refreshCommitteeJudging() }
}
export function previewJudgeCode(id: string) {
  return judgingPreviewMode ? readPreview().judges.find(judge => judge.id === id)?.code || null : null
}

export async function setLineup(year: number, projectIds: string[]) {
  if (judgingPreviewMode) {
    const data = readPreview()
    writePreview({ ...data, lineups: { ...data.lineups, [year]: projectIds } })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_set_judging_lineup", { cohort: year, project_ids: projectIds })
  if (error) throw failure(error, "Could not save the lineup.")
  await refreshCommitteeJudging()
}

export async function setSwitches(year: number, next: JudgingSwitches) {
  if (judgingPreviewMode) {
    const data = readPreview()
    writePreview({ ...data, switches: { ...data.switches, [year]: next } })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_set_judging_state", {
    cohort: year, open_judging: next.judgingOpen, release_feedback: next.feedbackReleased,
  })
  if (error) throw failure(error, "Could not change judging status.")
  await refreshCommitteeJudging()
}

export async function discardReview(judgeId: string, projectId: string) {
  if (judgingPreviewMode) {
    const data = readPreview()
    const rest = Object.fromEntries(Object.entries(data.reviews[judgeId] || {}).filter(([id]) => id !== projectId))
    writePreview({ ...data, reviews: { ...data.reviews, [judgeId]: rest } })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_discard_judge_feedback", { target_judge: judgeId, project: projectId })
  if (error) throw failure(error, "Could not discard this review.")
  await refreshCommitteeJudging()
}
