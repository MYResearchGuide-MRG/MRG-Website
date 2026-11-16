// What a team (or the committee, previewing) sees of the judges' feedback.
// Live: one database function that returns nothing until release, then only
// averages and remarks in random order. No judge identity ever reaches the page.
import { supabase } from "@/lib/supabase"
import type { ReleasedFeedback } from "./form"
import { projectResult, type CommitteeReview } from "./judge-model"
import { judgingPreviewMode, onPreviewChange, readPreview } from "./judging-preview"

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Device-only stand-in for myssp_project_feedback, applying the same rules. */
export function previewFeedback(projectId: string, year: number): ReleasedFeedback {
  const data = readPreview()
  if (!data.switches[year]?.feedbackReleased) return { released: false }
  const submitted: CommitteeReview[] = Object.entries(data.reviews).flatMap(([judgeId, byProject]) => {
    const review = byProject[projectId]
    return review?.submittedAt ? [{ ...review, judgeId }] : []
  })
  const result = projectResult(projectId, submitted)
  return { released: true, reviews: result.submitted, averages: result.averages, remarks: shuffle(submitted.map(review => review.remarks)) }
}

export async function loadProjectFeedback(projectId: string, year: number): Promise<ReleasedFeedback> {
  if (judgingPreviewMode) return previewFeedback(projectId, year)
  if (!supabase) return { released: false }
  const { data, error } = await supabase.rpc("myssp_project_feedback", { project: projectId })
  if (error) throw new Error(error.code === "PGRST202" ? "Feedback needs the judging database migration." : "Could not load judges’ feedback.")
  return data as ReleasedFeedback
}

/** Preview only: re-read when the committee panel changes release or reviews. */
export function onFeedbackChange(fn: () => void): () => void {
  return judgingPreviewMode ? onPreviewChange(fn) : () => {}
}
