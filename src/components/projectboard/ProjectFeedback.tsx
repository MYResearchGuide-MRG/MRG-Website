import { useEffect, useState } from "react"
import type { ReleasedFeedback } from "../judging/form"
import { loadProjectFeedback, onFeedbackChange } from "../judging/team-feedback"
import { FeedbackResults } from "./FeedbackResults"
import "./project-feedback.css"

export type FeedbackViewer = "team" | "mentor" | "committee"
type Load = { projectId: string; year: number } & (
  | { status: "error"; message: string }
  | { status: "ready"; feedback: ReleasedFeedback }
)

export function ProjectFeedback({
  projectId,
  year,
  viewer,
}: {
  projectId: string
  year: number
  viewer: FeedbackViewer
}) {
  const [state, setState] = useState<Load | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => onFeedbackChange(() => setVersion((value) => value + 1)), [])
  useEffect(() => {
    let current = true
    loadProjectFeedback(projectId, year)
      .then((feedback) => {
        if (current) setState({ projectId, year, status: "ready", feedback })
      })
      .catch((error: unknown) => {
        if (current)
          setState({
            projectId,
            year,
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

  // Never show the previous project's private feedback during navigation.
  if (!state || state.projectId !== projectId || state.year !== year)
    return null
  if (state.status === "error")
    return (
      <section className="pf-root" aria-label="Project feedback">
        <h2>Project feedback</h2>
        <p className="pf-note" role="alert">
          {state.message}
        </p>
        <button
          type="button"
          className="pf-retry"
          onClick={() => setVersion((value) => value + 1)}
        >
          Retry loading feedback
        </button>
      </section>
    )
  return (
    <FeedbackResults
      key={projectId}
      feedback={state.feedback}
      viewer={viewer}
    />
  )
}
