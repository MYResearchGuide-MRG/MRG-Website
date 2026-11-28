import { supabase } from "@/lib/supabase"
import { getBackend, useLiveBackend } from "./backend"
import {
  loadDraft,
  newDraft,
  teamProfiles,
  type Board,
} from "../projectboard/data"
import {
  submissionChecklist,
  submissionFingerprint,
} from "../projectboard/submission-checklist"
import {
  reviewError,
  type CommitteeReview,
  type ReviewDecision,
  type ReviewRow,
} from "./review-model"

const key = "myssp-submission-reviews-v1"
export const reviewDemo =
  !useLiveBackend && import.meta.env.VITE_REVIEW_DEMO === "true"
function exampleDraft(board: Board) {
  const image = "data:image/jpeg;base64,YWJj"
  const draft = {
    ...newDraft(board),
    summary: "Example completed abstract for the committee walkthrough.",
    question: "What changed in the experiment?",
    method: "Example completed research approach.",
    findings: "Example findings for review.",
    coverImage: image,
    coverAlt: "Example project image",
    video: "https://youtu.be/M7lc1UVf-VE",
    slides: "https://www.canva.com/design/DEMO/view",
    paper: "https://drive.google.com/file/d/example_pdf/view",
    savedAt: "2026-11-20T14:30:00Z",
    teamMembers: teamProfiles(board).map((member) => ({
      ...member,
      bio: "Example research role.",
      photo: image,
    })),
  }
  if (board.code === "A-4")
    Object.assign(draft, {
      coverImage: "",
      coverAlt: "",
      video: "",
      slides: "",
      paper: "",
      teamMembers: draft.teamMembers.map((member) => ({
        ...member,
        bio: "",
        photo: "",
      })),
    })
  if (board.code === "I-1") draft.video = ""
  return draft
}
function previewReviews(): Record<string, CommitteeReview> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}")
  } catch {
    return {}
  }
}
export function previewReviewRows(boards: Board[]): ReviewRow[] {
  const reviews = previewReviews()
  return boards.map((board) => {
    const draft = reviewDemo ? exampleDraft(board) : loadDraft(board)
    const version = submissionFingerprint(draft)
    const example: CommitteeReview | null =
      reviewDemo && ["A-1", "A-2", "A-3"].includes(board.code)
        ? {
            status: board.code === "A-1" ? "needs_changes" : "approved",
            notes:
              board.code === "A-1"
                ? "Example note: add a clearer explanation of the main result."
                : "Example committee approval.",
            checks: ["links", "guidelines", "content", "team"],
            version: board.code === "A-3" ? "old-example-version" : version,
            revision: 1,
            updatedAt: "2026-11-20T15:00:00Z",
          }
        : null
    return {
      id: board.id,
      code: board.code,
      title: draft.title || board.title,
      year: board.year,
      savedAt: draft.savedAt,
      version,
      checklist: submissionChecklist(board, draft),
      review: reviews[board.id] ?? example,
    }
  })
}
export async function loadSubmissionReviews(
  year: number,
  boards: Board[]
): Promise<ReviewRow[]> {
  if (!useLiveBackend) return previewReviewRows(boards)
  if (!supabase || !getBackend().isAdmin)
    throw new Error("Committee sign-in required.")
  const identity = getBackend().userId
  const { data, error } = await supabase.rpc("myssp_submission_review_queue", {
    cohort: year,
  })
  if (identity !== getBackend().userId || !getBackend().isAdmin)
    throw new Error("Your session changed. Sign in again.")
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Submission review needs the database update. Existing project controls still work."
        : "Could not check submissions. Refresh to try again."
    )
  return data as ReviewRow[]
}
export async function saveSubmissionReview(
  row: ReviewRow,
  decision: ReviewDecision,
  notes: string,
  checks: string[],
  boards: Board[]
) {
  const invalid = reviewError(row, decision, notes, checks)
  if (invalid) throw new Error(invalid)
  if (useLiveBackend) {
    if (!supabase || !getBackend().isAdmin)
      throw new Error("Committee sign-in required.")
    const { error } = await supabase.rpc("myssp_save_submission_review", {
      project: row.id,
      decision,
      review_note: notes,
      confirmations: checks,
      expected_content: row.version,
      expected_revision: row.review?.revision ?? 0,
    })
    if (error)
      throw new Error(
        error.code === "PT409" || error.code === "40001"
          ? "The project or review changed. Close this window and refresh before reviewing again."
          : "Could not save the review. Refresh and check the project before trying again."
      )
  } else {
    const current = previewReviewRows(boards).find((item) => item.id === row.id)
    if (
      !current ||
      current.version !== row.version ||
      current.review?.revision !== row.review?.revision
    )
      throw new Error(
        "The project or review changed. Refresh before reviewing again."
      )
    localStorage.setItem(
      key,
      JSON.stringify({
        ...previewReviews(),
        [row.id]: {
          status: decision,
          notes: notes.trim(),
          checks,
          version: row.version,
          revision: (row.review?.revision ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        },
      })
    )
    window.dispatchEvent(new Event("myssp-review-change"))
  }
}
export type TeamSubmissionReview = {
  status: ReviewDecision
  notes: string
  stale: boolean
  updatedAt: string
}
export async function loadTeamSubmissionReview(
  board: Board
): Promise<TeamSubmissionReview | null> {
  if (!useLiveBackend) {
    const row = previewReviewRows([board])[0]
    return row.review
      ? { ...row.review, stale: row.review.version !== row.version }
      : null
  }
  if (!supabase) return null
  const identity = getBackend().userId
  const { data, error } = await supabase.rpc(
    "myssp_project_submission_review",
    { project: board.id }
  )
  if (identity !== getBackend().userId) return null
  // Existing project pages work before the additive migration is installed.
  if (error?.code === "PGRST202") return null
  if (error) throw new Error("Could not load the committee review.")
  return data as TeamSubmissionReview | null
}
