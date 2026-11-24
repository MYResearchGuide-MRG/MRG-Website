// What a team (or the committee, previewing) sees of the judges' feedback.
// Live: one database function that returns nothing until release, then each
// submitted review (all scores and the remark) labelled only main or special
// award, in random order. No judge identity ever reaches the page.
import { supabase } from "@/lib/supabase"
import { getBackend } from "../admin/backend"
import {
  scoreKeys,
  type ReleasedFeedback,
  type ScoreKey,
  type TeamReview,
} from "./form"
import {
  judgingPreviewMode,
  onPreviewChange,
  readPreview,
} from "./judging-preview"

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Device-only stand-in for myssp_project_feedback, applying the same rules. */
export function previewFeedback(
  projectId: string,
  year: number
): ReleasedFeedback {
  const data = readPreview()
  if (!data.switches[year]?.feedbackReleased) return { released: false }
  const reviews: TeamReview[] = Object.entries(data.reviews).flatMap(
    ([judgeId, byProject]) => {
      const review = byProject[projectId]
      if (!review?.submittedAt) return []
      const kind =
        data.judges.find((judge) => judge.id === judgeId)?.kind ?? "main"
      const scores = Object.fromEntries(
        scoreKeys.map((key) => [key, review[key] ?? null])
      ) as Record<ScoreKey, number | null>
      return [
        {
          ...scores,
          kind,
          researchOnly: review.researchOnly,
          researchRemarks: review.researchRemarks,
          presentationRemarks: review.presentationRemarks,
        },
      ]
    }
  )
  return { released: true, reviews: shuffle(reviews) }
}

export async function loadProjectFeedback(
  projectId: string,
  year: number
): Promise<ReleasedFeedback> {
  if (judgingPreviewMode) return previewFeedback(projectId, year)
  if (!supabase) return { released: false }
  const identity = getBackend().userId
  const { data, error } = await supabase.rpc("myssp_project_feedback", {
    project: projectId,
  })
  if (identity !== getBackend().userId) return { released: false }
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "Feedback needs the judging database migration."
        : "Could not load judges’ feedback."
    )
  return data as ReleasedFeedback
}

/** Recheck on returning to the tab, without continuously polling submissions. */
export function onFeedbackChange(fn: () => void): () => void {
  if (judgingPreviewMode) return onPreviewChange(fn)
  const refresh = () => {
    if (document.visibilityState === "visible") fn()
  }
  document.addEventListener("visibilitychange", refresh)
  return () => document.removeEventListener("visibilitychange", refresh)
}
