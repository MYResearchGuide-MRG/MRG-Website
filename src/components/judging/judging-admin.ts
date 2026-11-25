// Committee-side judging data: judges, lineups, switches and every review.
import { useEffect, useSyncExternalStore } from "react"
import { supabase } from "@/lib/supabase"
import { generateCode } from "../admin/access-model"
import { getBackend, useBackend } from "../admin/backend"
import { sendInvitationBatches } from "../admin/invitation-batches"
import {
  missingAnswers,
  scoreKeys,
  withoutPresentation,
  type JudgeKind,
  type SpecialAward,
  type ScoreKey,
} from "./form"
import {
  closedSwitches,
  researchMarkingOpen,
  judgeInputError,
  type CommitteeJudge,
  type CommitteeReview,
  type JudgeInput,
  type JudgingSwitches,
} from "./judge-model"
import {
  judgingPreviewMode,
  onPreviewChange,
  readPreview,
  writePreview,
} from "./judging-preview"

const attendanceLocked =
  "This judge has already submitted reviews, so whether they attend Demo Day can no longer change."

type State = {
  ready: boolean
  judges: CommitteeJudge[]
  lineups: Record<number, string[]>
  switches: Record<number, JudgingSwitches>
  reviews: CommitteeReview[]
  error: string
}
const empty: State = {
  ready: false,
  judges: [],
  lineups: {},
  switches: {},
  reviews: [],
  error: "",
}
let state = empty
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

let consumers = 0
let refreshTimer: number | undefined
export const getCommitteeJudging = () => state
/** One polling owner, no hidden-tab reads and no cached data after sign-out. */
export function useCommitteeJudging() {
  const snapshot = useSyncExternalStore(subscribe, () => state)
  const { isAdmin, userId } = useBackend()
  useEffect(() => {
    void refreshCommitteeJudging()
    consumers++
    if (consumers === 1)
      refreshTimer = window.setInterval(() => {
        if (document.visibilityState === "visible")
          void refreshCommitteeJudging()
      }, 60000)
    return () => {
      if (--consumers === 0) window.clearInterval(refreshTimer)
    }
  }, [isAdmin, userId])
  return !judgingPreviewMode && !isAdmin ? empty : snapshot
}
export const switchesFor = (snapshot: State, year: number) =>
  snapshot.switches[year] ?? closedSwitches

function fromPreview() {
  const data = readPreview()
  publish({
    ready: true,
    error: "",
    judges: data.judges.map((judge) => ({ ...judge, code: undefined })),
    lineups: data.lineups,
    switches: data.switches,
    reviews: Object.entries(data.reviews).flatMap(([judgeId, byProject]) =>
      Object.values(byProject).map((review) => ({ ...review, judgeId }))
    ),
  })
}
if (judgingPreviewMode)
  onPreviewChange(() => {
    if (state.ready) fromPreview()
  })

type JudgeRow = {
  id: string
  user_id: string | null
  cohort_year: number
  name: string
  email: string
  affiliation: string
  kind: JudgeKind
  special_award: SpecialAward | null
  attends_demo_day: boolean
  revoked: boolean
  invited_at: string | null
  deleted_at: string | null
}
type FeedbackRow = Record<ScoreKey, number | null> & {
  judge_id: string
  project_id: string
  research_remarks: string
  presentation_remarks: string
  research_only: boolean
  submitted_at: string | null
  updated_at: string
}

let epoch = 0
let pending: Promise<void> | null = null
let owner: string | null = null
export function refreshCommitteeJudging(): Promise<void> {
  const identity = getBackend().isAdmin ? getBackend().userId : null
  if (!judgingPreviewMode && owner !== identity) {
    epoch++
    owner = identity
    pending = null
    publish(empty)
  }
  if (pending) return pending
  const request = readCommitteeJudging()
    .catch(() => {
      if (
        identity === owner &&
        getBackend().isAdmin &&
        identity === getBackend().userId
      ) {
        publish({
          ...state,
          ready: true,
          error:
            "Could not refresh judging. Check the connection and try Refresh; your saved work is unchanged.",
        })
      }
    })
    .finally(() => {
      if (pending === request) pending = null
    })
  pending = request
  return request
}
async function readCommitteeJudging() {
  if (judgingPreviewMode) return fromPreview()
  if (!supabase || !getBackend().isAdmin) {
    epoch++
    publish(empty)
    return
  }
  const identity = getBackend().userId
  const ticket = ++epoch
  const [judges, lineup, feedback, switches] = await Promise.all([
    supabase
      .from("myssp_judges")
      .select(
        "id,user_id,cohort_year,name,email,affiliation,kind,special_award,attends_demo_day,revoked,invited_at,deleted_at"
      )
      .order("name"),
    supabase
      .from("myssp_judging_lineup")
      .select("project_id,cohort_year,position")
      .order("position"),
    supabase
      .from("myssp_judge_feedback")
      .select("judge_id,project_id,updated_at"),
    supabase.rpc("myssp_judging_windows"),
  ])
  if (
    ticket !== epoch ||
    identity !== getBackend().userId ||
    !getBackend().isAdmin
  )
    return
  if (judges.error || lineup.error || feedback.error || switches.error) {
    publish({
      ...state,
      ready: true,
      error:
        "Could not refresh judging. Check the connection and try Refresh; your saved work is unchanged.",
    })
    return
  }
  const changed =
    feedback.data.length !== state.reviews.length ||
    feedback.data.some(
      (row) =>
        !state.reviews.some(
          (r) =>
            r.judgeId === row.judge_id &&
            r.projectId === row.project_id &&
            r.updatedAt === row.updated_at
        )
    )
  const details = changed
    ? await supabase.from("myssp_judge_feedback").select("*")
    : null
  if (
    ticket !== epoch ||
    identity !== getBackend().userId ||
    !getBackend().isAdmin
  )
    return
  if (details?.error) {
    publish({
      ...state,
      ready: true,
      error: "Could not load changed reviews. Try Refresh.",
    })
    return
  }
  const lineups: Record<number, string[]> = {}
  for (const row of lineup.data)
    (lineups[row.cohort_year] ||= []).push(row.project_id)
  publish({
    ready: true,
    error: "",
    judges: (judges.data as JudgeRow[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      cohortYear: row.cohort_year,
      name: row.name,
      email: row.email,
      affiliation: row.affiliation,
      kind: row.kind,
      specialAward: row.kind === "special" ? (row.special_award ?? null) : null,
      attendsDemoDay: row.attends_demo_day !== false,
      revoked: row.revoked,
      deletedAt: row.deleted_at,
      invitedAt: row.invited_at ? Date.parse(row.invited_at) : null,
    })),
    lineups,
    switches: Object.fromEntries(
      (
        switches.data as {
          year: number
          research_marking: boolean | null
          research_closes_at: string | null
          judging_open: boolean
          feedback_released: boolean
        }[]
      ).map((row) => [
        row.year,
        {
          researchMarking: row.research_marking,
          researchClosesAt: row.research_closes_at,
          judgingOpen: row.judging_open,
          feedbackReleased: row.feedback_released,
        },
      ])
    ),
    reviews: details
      ? (details.data as FeedbackRow[]).map((row) => ({
          ...(Object.fromEntries(
            scoreKeys.map((key) => [key, row[key]])
          ) as Record<ScoreKey, number | null>),
          judgeId: row.judge_id,
          projectId: row.project_id,
          researchRemarks: row.research_remarks,
          presentationRemarks: row.presentation_remarks,
          researchOnly: Boolean(row.research_only),
          submittedAt: row.submitted_at,
          updatedAt: row.updated_at,
        }))
      : state.reviews,
  })
}

function requireAdmin() {
  if (!supabase || !getBackend().isAdmin)
    throw new Error("Committee sign-in required.")
  return supabase
}
// Supabase errors from these functions are written for the committee, so show them.
function failure(error: { code?: string; message: string }, fallback: string) {
  return new Error(
    error.code === "PGRST202"
      ? "Apply the judging database migration first."
      : error.message || fallback
  )
}

export async function saveJudge(input: JudgeInput, id?: string) {
  const problem = judgeInputError(input, state.judges, id)
  if (problem) throw new Error(problem)
  const clean = {
    ...input,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    affiliation: input.affiliation.trim(),
  }
  if (judgingPreviewMode) {
    const data = readPreview()
    if (id) {
      const previous = data.judges.find((judge) => judge.id === id)
      if (!previous || previous.deletedAt)
        throw new Error("Restore this judge before editing their details.")
      const emailChanged = previous.email !== clean.email
      // Same rule as the database: attendance is fixed once a review is
      // submitted, and changing it moves drafts to the new format.
      let reviews = data.reviews
      if (previous.attendsDemoDay !== clean.attendsDemoDay) {
        const own = data.reviews[id] || {}
        if (Object.values(own).some((review) => review.submittedAt))
          throw new Error(attendanceLocked)
        reviews = {
          ...data.reviews,
          [id]: Object.fromEntries(
            Object.entries(own).map(([projectId, review]) => [
              projectId,
              clean.attendsDemoDay
                ? { ...review, researchOnly: false }
                : {
                    ...review,
                    ...withoutPresentation(review),
                    researchOnly: true,
                  },
            ])
          ),
        }
      }
      writePreview({
        ...data,
        reviews,
        judges: data.judges.map((judge) =>
          judge.id === id
            ? {
                ...judge,
                ...clean,
                ...(emailChanged
                  ? { userId: null, invitedAt: null, code: undefined }
                  : {}),
              }
            : judge
        ),
      })
    } else {
      writePreview({
        ...data,
        judges: [
          ...data.judges,
          {
            ...clean,
            id: crypto.randomUUID(),
            userId: null,
            invitedAt: null,
            deletedAt: null,
          },
        ],
      })
    }
    return
  }
  const { error } = await requireAdmin().rpc("myssp_save_judge", {
    judge_id: id || null,
    judge_cohort: clean.cohortYear,
    judge_name: clean.name,
    judge_email: clean.email,
    judge_affiliation: clean.affiliation,
    access_revoked: clean.revoked,
    judge_kind: clean.kind,
    judge_attends: clean.attendsDemoDay,
    judge_award: clean.kind === "special" ? clean.specialAward : null,
  })
  if (error)
    throw error.message.includes("can no longer change")
      ? new Error(attendanceLocked)
      : failure(error, "Could not save this judge.")
  await refreshCommitteeJudging()
}

export async function importJudges(inputs: JudgeInput[]) {
  if (judgingPreviewMode) {
    const data = readPreview()
    writePreview({
      ...data,
      judges: [
        ...data.judges,
        ...inputs.map((input) => ({
          ...input,
          id: crypto.randomUUID(),
          userId: null,
          invitedAt: null,
          deletedAt: null,
        })),
      ],
    })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_import_judges", {
    rows: inputs.map((input) => ({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      affiliation: input.affiliation.trim(),
      cohort_year: input.cohortYear,
      kind: input.kind,
      special_award: input.kind === "special" ? input.specialAward : null,
      attends_demo_day: input.attendsDemoDay,
    })),
  })
  if (error)
    throw failure(
      error,
      "Could not import judges. Check for duplicate emails, judge types and awards that already have a judge."
    )
  await refreshCommitteeJudging()
}

export async function setJudgeDeleted(id: string, deleted: boolean) {
  if (judgingPreviewMode) {
    const data = readPreview()
    writePreview({
      ...data,
      judges: data.judges.map((judge) =>
        judge.id === id
          ? { ...judge, deletedAt: deleted ? new Date().toISOString() : null }
          : judge
      ),
    })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_set_judge_deleted", {
    target: id,
    remove: deleted,
  })
  if (error) throw failure(error, "Could not update this judge.")
  await refreshCommitteeJudging()
}

export async function inviteJudges(
  ids: string[]
): Promise<{ sent: number; failed: number }> {
  if (judgingPreviewMode) {
    const data = readPreview()
    writePreview({
      ...data,
      judges: data.judges.map((judge) =>
        ids.includes(judge.id) && !judge.revoked && !judge.deletedAt
          ? { ...judge, code: generateCode(), invitedAt: Date.now() }
          : judge
      ),
    })
    return { sent: 0, failed: 0 }
  }
  const client = requireAdmin()
  try {
    return await sendInvitationBatches(ids, async (batch) => {
      const { data, error } = await client.functions.invoke("invite-judges", {
        body: { ids: batch },
      })
      if (error) throw error
      return data as { sent: number; failed: number }
    })
  } finally {
    await refreshCommitteeJudging()
  }
}
export function previewJudgeCode(id: string) {
  return judgingPreviewMode
    ? readPreview().judges.find((judge) => judge.id === id)?.code || null
    : null
}

export async function setResearchWindow(
  year: number,
  enabled: boolean | null,
  deadline: string,
  expected: JudgingSwitches
) {
  if (judgingPreviewMode) {
    const data = readPreview()
    const current = data.switches[year] ?? closedSwitches
    if (current.feedbackReleased)
      throw new Error(
        "Hide released feedback before changing the research window."
      )
    if (
      current.researchMarking !== expected.researchMarking ||
      current.researchClosesAt !== expected.researchClosesAt
    )
      throw new Error("The window changed. Refresh before saving.")
    if (
      !Number.isFinite(Date.parse(deadline)) ||
      (enabled !== false && Date.parse(deadline) <= Date.now())
    )
      throw new Error("Choose a future closing time.")
    if (enabled && !data.lineups[year]?.length)
      throw new Error(
        "Save the project lineup before starting research-only marking."
      )
    writePreview({
      ...data,
      switches: {
        ...data.switches,
        [year]: {
          ...current,
          researchMarking: enabled,
          researchClosesAt: deadline,
        },
      },
    })
    return
  }
  const { error } = await requireAdmin().rpc(
    "myssp_set_research_judging_window",
    {
      cohort: year,
      enabled,
      closes_at: deadline,
      expected_enabled: expected.researchMarking ?? null,
      expected_closes_at: expected.researchClosesAt ?? null,
    }
  )
  if (error) throw failure(error, "Could not update research-only marking.")
  await refreshCommitteeJudging()
}

export async function setLineup(
  year: number,
  projectIds: string[],
  startMarking = true
) {
  if (judgingPreviewMode) {
    const data = readPreview()
    if (
      data.switches[year]?.judgingOpen ||
      (data.switches[year] && researchMarkingOpen(data.switches[year]))
    )
      throw new Error("Close judging before changing the lineup")
    if (data.switches[year]?.feedbackReleased)
      throw new Error("Hide released feedback before changing the lineup")
    writePreview({
      ...data,
      lineups: { ...data.lineups, [year]: projectIds },
      switches: {
        ...data.switches,
        [year]: {
          ...data.switches[year],
          judgingOpen: startMarking && projectIds.length > 0,
          feedbackReleased: false,
        },
      },
    })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_save_judging_lineup", {
    cohort: year,
    project_ids: projectIds,
    start_marking: startMarking,
  })
  if (error) throw failure(error, "Could not save the lineup.")
  await refreshCommitteeJudging()
}

export async function setSwitches(year: number, next: JudgingSwitches) {
  if (judgingPreviewMode) {
    const data = readPreview()
    if (next.judgingOpen && next.feedbackReleased)
      throw new Error("Close judging before releasing feedback")
    const wasOpen = Boolean(data.switches[year]?.judgingOpen)
    if (next.judgingOpen && !wasOpen && !data.lineups[year]?.length)
      throw new Error("Set the lineup before opening judging")
    // Closing judging submits every complete draft from the cohort's active
    // judges, matching the database.
    let reviews = data.reviews
    if ((wasOpen && !next.judgingOpen) || next.feedbackReleased) {
      const lineup = new Set(data.lineups[year] || [])
      const active = new Set(
        data.judges
          .filter(
            (judge) =>
              judge.cohortYear === year &&
              !judge.revoked &&
              !judge.deletedAt &&
              ((wasOpen &&
                !next.judgingOpen &&
                (judge.attendsDemoDay ||
                  data.switches[year]?.researchMarking == null)) ||
                (next.feedbackReleased && !judge.attendsDemoDay))
          )
          .map((judge) => judge.id)
      )
      const now = new Date().toISOString()
      reviews = Object.fromEntries(
        Object.entries(data.reviews).map(([judgeId, byProject]) => [
          judgeId,
          Object.fromEntries(
            Object.entries(byProject).map(([projectId, review]) => [
              projectId,
              active.has(judgeId) &&
              !review.submittedAt &&
              lineup.has(projectId) &&
              !missingAnswers(review, review.researchOnly).length
                ? { ...review, submittedAt: now }
                : review,
            ])
          ),
        ])
      )
    }
    writePreview({
      ...data,
      reviews,
      switches: {
        ...data.switches,
        [year]: {
          ...data.switches[year],
          judgingOpen: next.judgingOpen,
          feedbackReleased: next.feedbackReleased,
          researchMarking:
            next.feedbackReleased &&
            data.switches[year]?.researchMarking === true
              ? false
              : data.switches[year]?.researchMarking,
        },
      },
    })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_set_judging_state", {
    cohort: year,
    open_judging: next.judgingOpen,
    release_feedback: next.feedbackReleased,
  })
  if (error) throw failure(error, "Could not change judging status.")
  await refreshCommitteeJudging()
}

export async function discardReview(judgeId: string, projectId: string) {
  if (judgingPreviewMode) {
    const data = readPreview()
    const rest = Object.fromEntries(
      Object.entries(data.reviews[judgeId] || {}).filter(
        ([id]) => id !== projectId
      )
    )
    writePreview({ ...data, reviews: { ...data.reviews, [judgeId]: rest } })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_discard_judge_feedback", {
    target_judge: judgeId,
    project: projectId,
  })
  if (error) throw failure(error, "Could not discard this review.")
  await refreshCommitteeJudging()
}

/** Returns a submitted review to a draft, keeping its answers, until feedback is released. */
export async function unsubmitReview(judgeId: string, projectId: string) {
  if (judgingPreviewMode) {
    const data = readPreview()
    const review = data.reviews[judgeId]?.[projectId]
    const year = data.judges.find((judge) => judge.id === judgeId)?.cohortYear
    if (year !== undefined && data.switches[year]?.feedbackReleased)
      throw new Error(
        "Hide feedback from teams before returning a review to draft."
      )
    if (!review?.submittedAt) throw new Error("This review is already a draft.")
    writePreview({
      ...data,
      reviews: {
        ...data.reviews,
        [judgeId]: {
          ...data.reviews[judgeId],
          [projectId]: {
            ...review,
            submittedAt: null,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    })
    return
  }
  const { error } = await requireAdmin().rpc("myssp_unsubmit_judge_feedback", {
    target_judge: judgeId,
    project: projectId,
  })
  if (error) throw failure(error, "Could not return this review to draft.")
  await refreshCommitteeJudging()
}

if (!judgingPreviewMode && supabase)
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || (owner && session?.user.id !== owner)) {
      epoch++
      owner = null
      pending = null
      publish(empty)
    }
  })
