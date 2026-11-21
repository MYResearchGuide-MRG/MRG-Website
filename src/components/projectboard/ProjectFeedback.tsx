import { useEffect, useState } from "react"
import { MessageSquareText } from "lucide-react"
import {
  judgeKindLabels,
  judgingSections,
  sectionRemarks,
  SCORE_MAX,
  type ReleasedFeedback,
  type TeamReview,
} from "../judging/form"
import { loadProjectFeedback, onFeedbackChange } from "../judging/team-feedback"
import { JudgeAvatar } from "./JudgeAvatar"
import "./project-feedback.css"

export type FeedbackViewer = "team" | "mentor" | "committee"

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; feedback: ReleasedFeedback }

/**
 * Judges' feedback at the bottom of a project page, OpenReview-style. Shown to
 * the team on their own project, and to the committee as a preview of the same
 * view. Mentors see the team's view for the projects they mentor. Each review shows every score and its remark, labelled only main or
 * special award judge, in random order. No averages, no names.
 *
 * Sits in the project page's two-column grid and spans both columns, so it
 * runs the full width below the project content and the share card.
 */
export function ProjectFeedback({
  projectId,
  year,
  viewer,
}: {
  projectId: string
  year: number
  viewer: FeedbackViewer
}) {
  const [state, setState] = useState<Load>({ status: "loading" })
  const [version, setVersion] = useState(0)
  useEffect(() => onFeedbackChange(() => setVersion((v) => v + 1)), [])
  useEffect(() => {
    let current = true
    loadProjectFeedback(projectId, year)
      .then((feedback) => {
        if (current) setState({ status: "ready", feedback })
      })
      .catch((error: unknown) => {
        if (current)
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Could not load judges’ feedback.",
          })
      })
    return () => {
      current = false
    }
  }, [projectId, year, version])

  // Before release, teams get a quiet note and no scores or remarks.
  if (state.status === "loading") return null
  if (state.status === "error")
    return (
      <section className="pf-root" aria-labelledby="pf-heading">
        <h2 id="pf-heading">Project feedback</h2>
        <p className="pf-note">{state.message}</p>
        <button type="button" onClick={() => setVersion((v) => v + 1)}>
          Retry loading feedback
        </button>
      </section>
    )
  const { feedback } = state
  if (!feedback.released)
    return (
      <section className="pf-root" aria-labelledby="pf-heading">
        <div className="pf-pending">
          <MessageSquareText size={18} aria-hidden />
          <div>
            <h2 id="pf-heading">Project feedback</h2>
            <p className="pf-note">
              {viewer === "committee"
                ? "Not released yet. Teams and their mentors see this section once you release feedback in the committee panel."
                : viewer === "mentor"
                  ? "Feedback from the Demo Day judges on this team’s project will appear here after the results are announced."
                  : "Feedback from the Demo Day judges will appear here after the results are announced."}
            </p>
          </div>
        </div>
      </section>
    )

  const { reviews } = feedback
  return (
    <section className="pf-root" aria-labelledby="pf-heading">
      <div className="pf-head">
        <h2 id="pf-heading">Project feedback</h2>
        {viewer === "committee" && (
          <p className="pf-preview-note">
            Committee preview of the team’s view
          </p>
        )}{" "}
      </div>
      {reviews.length > 0 && (
        <p className="pf-lede">
          All reviews are anonymous. Judges’ names are not shown.
        </p>
      )}
      {!reviews.length ? (
        <p className="pf-note">
          No judge feedback was recorded for this project.
        </p>
      ) : (
        <ol className="pf-reviews">
          {reviews.map((review, index) => (
            <ReviewCard key={index} review={review} number={index + 1} />
          ))}
        </ol>
      )}
    </section>
  )
}

/** One review: scores per section with dot ratings, then that section's comments. */
function ReviewCard({
  review,
  number,
}: {
  review: TeamReview
  number: number
}) {
  return (
    <li className="pf-review" aria-labelledby={`pf-review-${number}`}>
      <header className="pf-review-head">
        <JudgeAvatar seed={number} star={review.kind === "special"} />
        <h3 id={`pf-review-${number}`}>
          <span className="sr-only">Review {number}, </span>
          {judgeKindLabels[review.kind] ?? judgeKindLabels.main}
        </h3>
      </header>
      <div className="pf-sections">
        {judgingSections.map((section, i) => {
          const remark = review[sectionRemarks[i].key]?.trim()
          return (
            <section key={section.title} className="pf-section">
              <h4>{section.title}</h4>
              <dl className="pf-scores">
                {section.criteria.map((criterion) => {
                  const value = Number(review[criterion.key])
                  return (
                    <div key={criterion.key} className="pf-score">
                      <dt>{criterion.label}</dt>
                      <dd>
                        <span className="pf-dots" aria-hidden="true">
                          {Array.from({ length: SCORE_MAX }, (_, d) => (
                            <span
                              key={d}
                              className={d < value ? "on" : undefined}
                            />
                          ))}
                        </span>
                        <span className="pf-value">
                          {value}
                          <span>/{SCORE_MAX}</span>
                        </span>
                      </dd>
                    </div>
                  )
                })}
              </dl>
              {remark && (
                <blockquote className="pf-remark">{remark}</blockquote>
              )}
            </section>
          )
        })}
      </div>
    </li>
  )
}
