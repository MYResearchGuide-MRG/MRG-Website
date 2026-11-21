import { useEffect, useState } from "react"
import type { Board } from "./data"
import {
  loadTeamSubmissionReview,
  type TeamSubmissionReview,
} from "../admin/submission-reviews"
import { useBackend } from "../admin/backend"
import "../admin/submission-review.css"

export function CommitteeReviewNotice({
  board,
  revision,
}: {
  board: Board
  revision: number
}) {
  const { userId } = useBackend()
  const [review, setReview] = useState<TeamSubmissionReview | null>(null)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    loadTeamSubmissionReview(board)
      .then((next) => {
        if (active) {
          setReview(next)
          setError("")
        }
      })
      .catch(() => {
        if (active) setError("Could not load the committee review.")
      })
    return () => {
      active = false
    }
  }, [board, revision, userId, attempt])
  if (error)
    return (
      <div className="pb-committee-review" role="status">
        {error}{" "}
        <button onClick={() => setAttempt((v) => v + 1)}>Try again</button>
      </div>
    )
  if (!review) return null
  return (
    <aside className="pb-committee-review" aria-label="Committee review">
      <h2>
        {review.stale
          ? "Updated since committee review"
          : review.status === "approved"
            ? "Approved by the committee"
            : "Changes requested by the committee"}
      </h2>
      {review.notes && <p>{review.notes}</p>}
      <small>
        {review.stale
          ? "Your latest changes are ready for the committee to recheck."
          : review.status === "needs_changes"
            ? "Make these changes and save your project. The committee will see the updated submission."
            : "This approval applies to the reviewed version. Further changes need another review."}
      </small>
    </aside>
  )
}
