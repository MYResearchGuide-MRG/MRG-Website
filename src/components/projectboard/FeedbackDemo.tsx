import { useState } from "react"
import { FeedbackResults } from "./FeedbackResults"
import { exampleFeedback } from "./feedback-demo-data"
import { feedbackDemoEnabled } from "@/lib/feedback-demo"
import "./projectboard.css"

export default function FeedbackDemo() {
  const [reviews, setReviews] = useState(exampleFeedback)
  const [released, setReleased] = useState(true)
  if (!feedbackDemoEnabled) return null
  return (
    <main className="pb-root pf-demo">
      <div className="pf-demo-shell">
        <div className="pf-demo-notice">
          <p>
            <strong>Local demo</strong> · Sample data
          </p>
          <div className="pf-demo-tools">
            <button
              type="button"
              onClick={() => setReleased((value) => !value)}
            >
              {released ? "Show before release" : "Show released feedback"}
            </button>
            <button type="button" onClick={() => setReviews(exampleFeedback())}>
              Shuffle example reviews
            </button>
          </div>
        </div>
        <div className="pf-demo-project">
          <p>A-1 · MYSSP 2026 · Student view</p>
          <h1>
            Evaluating the Robustness of a Pretrained Object Detector under
            Controlled Object Occlusion
          </h1>
        </div>
        <FeedbackResults
          feedback={
            released ? { released: true, reviews } : { released: false }
          }
        />
      </div>
    </main>
  )
}
