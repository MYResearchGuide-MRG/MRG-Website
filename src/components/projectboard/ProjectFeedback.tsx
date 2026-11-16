import { useEffect, useState } from "react"
import { MessageSquareText } from "lucide-react"
import { judgingSections, SCORE_MAX, type ReleasedFeedback } from "../judging/form"
import { loadProjectFeedback, onFeedbackChange } from "../judging/team-feedback"
import "./project-feedback.css"

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; feedback: ReleasedFeedback }

/**
 * Judges' feedback at the bottom of a project page, OpenReview-style. Shown to
 * the team on their own project, and to the committee as a preview of the same
 * view. Scores are averages; remarks are anonymous and arrive in random order.
 */
export function ProjectFeedback({ projectId, year, viewer }: { projectId: string; year: number; viewer: "team" | "committee" }) {
  const [state, setState] = useState<Load>({ status: "loading" })
  const [version, setVersion] = useState(0)
  useEffect(() => onFeedbackChange(() => setVersion(v => v + 1)), [])
  useEffect(() => {
    let current = true
    loadProjectFeedback(projectId, year)
      .then(feedback => { if (current) setState({ status: "ready", feedback }) })
      .catch((error: unknown) => { if (current) setState({ status: "error", message: error instanceof Error ? error.message : "Could not load judges’ feedback." }) })
    return () => { current = false }
  }, [projectId, year, version])

  // Before release, teams get a quiet note and no scores or remarks.
  if (state.status === "loading") return null
  if (state.status === "error") return <section className="pf-root" aria-labelledby="pf-heading">
    <h2 id="pf-heading">Judges’ feedback</h2><p className="pf-note">{state.message}</p>
  </section>
  const { feedback } = state
  if (!feedback.released) return <section className="pf-root pf-pending" aria-labelledby="pf-heading">
    <MessageSquareText size={18} aria-hidden />
    <div>
      <h2 id="pf-heading">Judges’ feedback</h2>
      <p className="pf-note">{viewer === "committee"
        ? "Not released yet. Teams see this section once you release feedback in the committee panel."
        : "Feedback from the Demo Day judges will appear here after the results are announced."}</p>
    </div>
  </section>

  return <section className="pf-root" aria-labelledby="pf-heading">
    <div className="pf-head">
      <h2 id="pf-heading">Judges’ feedback</h2>
      {viewer === "committee" && <span className="pf-badge">Committee preview of the team’s view</span>}
    </div>
    {feedback.reviews === 0 || !feedback.averages ? <p className="pf-note">No judge feedback was recorded for this project.</p> : <>
      <p className="pf-note">From {feedback.reviews} judge{feedback.reviews === 1 ? "" : "s"}. Scores are averages out of {SCORE_MAX}. Remarks are anonymous and shown in random order.</p>
      <div className="pf-scores">
        {judgingSections.map(section => <div key={section.title} className="pf-score-group">
          <h3>{section.title}</h3>
          <dl>
            {section.criteria.map(criterion => {
              const value = Number(feedback.averages![criterion.key])
              return <div key={criterion.key} className="pf-score">
                <dt>{criterion.label}</dt>
                <dd>
                  <span className="pf-bar" aria-hidden="true"><span style={{ width: `${(value / SCORE_MAX) * 100}%` }} /></span>
                  <span className="pf-value">{value.toFixed(1)}<span> / {SCORE_MAX}</span></span>
                </dd>
              </div>
            })}
          </dl>
        </div>)}
      </div>
      <h3 className="pf-remarks-heading">Remarks</h3>
      <ul className="pf-remarks">
        {feedback.remarks.map((remark, index) => <li key={index}>{remark}</li>)}
      </ul>
    </>}
  </section>
}
