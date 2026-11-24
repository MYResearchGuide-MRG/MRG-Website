import { useId, useState } from "react"
import { ArrowUpRight, LockKeyhole, MessageSquareText } from "lucide-react"
import { Tabs } from "radix-ui"
import {
  judgingSections,
  sectionRemarks,
  sectionsFor,
  SCORE_MAX,
  type JudgeKind,
  type ReleasedFeedback,
  type TeamReview,
} from "../judging/form"
import {
  feedbackScore,
  groupFeedback,
  mainAwardSummary,
  reviewMax,
  reviewTotal,
} from "./feedback-summary"
import { JudgeAvatar } from "./JudgeAvatar"
import "./project-feedback.css"

const labels = { main: "Main award", special: "Special award" }

/** Same presentation for real released feedback and the fictional local demo. */
export function FeedbackResults({
  feedback,
  viewer = "team",
}: {
  feedback: ReleasedFeedback
  viewer?: "team" | "mentor" | "committee"
}) {
  const id = useId()
  const [view, setView] = useState("overall")
  const [kind, setKind] = useState<JudgeKind>("main")
  const [selection, setSelection] = useState({ main: 0, special: 0 })
  if (!feedback.released)
    return (
      <section className="pf-root" aria-labelledby={`${id}-heading`}>
        <div className="pf-pending">
          <LockKeyhole size={20} aria-hidden />
          <div>
            <h2 id={`${id}-heading`}>Project feedback</h2>
            <p className="pf-note">
              {viewer === "committee"
                ? "Teams and their mentors can see scores and comments after you release feedback in the committee panel."
                : "Your scores and comments will appear here once the committee releases the Demo Day feedback."}
            </p>
          </div>
        </div>
      </section>
    )

  const groups = groupFeedback(feedback.reviews)
  const summary = mainAwardSummary(groups.main)
  const activeKind = groups[kind].length
    ? kind
    : groups.main.length
      ? "main"
      : "special"
  const index = Math.min(
    selection[activeKind],
    Math.max(0, groups[activeKind].length - 1)
  )
  const openReview = (nextKind: JudgeKind, nextIndex = 0) => {
    setKind(nextKind)
    setSelection((previous) => ({ ...previous, [nextKind]: nextIndex }))
    setView("individual")
  }

  return (
    <section className="pf-root" aria-labelledby={`${id}-heading`}>
      <header className="pf-head">
        <div>
          <h2 id={`${id}-heading`}>Project feedback</h2>
        </div>
        {viewer === "committee" && (
          <p className="pf-preview-note">Student view</p>
        )}
      </header>
      {!feedback.reviews.length ? (
        <p className="pf-note">
          No judge feedback was recorded for this project.
        </p>
      ) : (
        <>
          <Tabs.Root value={view} onValueChange={setView} className="pf-tabs">
            <Tabs.List className="pf-tab-list" aria-label="Feedback view">
              <Tabs.Trigger className="pf-tab" value="overall">
                Overall
              </Tabs.Trigger>
              <Tabs.Trigger className="pf-tab" value="individual">
                Individual reviews <span>{feedback.reviews.length}</span>
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="overall" className="pf-panel">
              <section
                className="pf-overview-section"
                aria-labelledby={`${id}-main`}
              >
                <div className="pf-section-heading">
                  <h3 id={`${id}-main`}>Main award judges</h3>
                  <span>
                    {groups.main.length}{" "}
                    {groups.main.length === 1 ? "review" : "reviews"}
                  </span>
                </div>
                {summary ? (
                  <>
                    <div className="pf-main-summary">
                      <div className="pf-total-block">
                        <span>Average total</span>
                        <p>
                          {feedbackScore(summary.total)}
                          <span> / {summary.maxTotal}</span>
                        </p>
                      </div>
                      <div className="pf-section-totals">
                        {judgingSections.map((section, i) => (
                          <div key={section.title}>
                            <span>{section.title}</span>
                            <strong>
                              {feedbackScore(summary.sections[i])}
                              <small>
                                {" "}
                                / {section.criteria.length * SCORE_MAX}
                              </small>
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pf-criteria-grid">
                      {judgingSections.map((section) => (
                        <section key={section.title}>
                          <h4>{section.title}</h4>
                          <dl className="pf-average-scores">
                            {section.criteria.map((criterion) => (
                              <div key={criterion.key}>
                                <dt>{criterion.label}</dt>
                                <dd>
                                  <span className="pf-score-track" aria-hidden>
                                    <span
                                      style={{
                                        width: `${((summary.criteria[criterion.key] ?? 0) / SCORE_MAX) * 100}%`,
                                      }}
                                    />
                                  </span>
                                  <span>
                                    {feedbackScore(
                                      summary.criteria[criterion.key]
                                    )}
                                    <small> / {SCORE_MAX}</small>
                                  </span>
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      ))}
                    </div>
                    <div className="pf-overview-footer">
                      <button type="button" onClick={() => openReview("main")}>
                        Read main award reviews{" "}
                        <ArrowUpRight size={15} aria-hidden />
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="pf-note">
                    No completed main award reviews have been released.
                  </p>
                )}
              </section>
              <section
                className="pf-overview-section pf-special-overview"
                aria-labelledby={`${id}-special`}
              >
                <div className="pf-section-heading">
                  <h3 id={`${id}-special`}>Special award judges</h3>
                  <span>
                    {groups.special.length}{" "}
                    {groups.special.length === 1 ? "review" : "reviews"}
                  </span>
                </div>
                {groups.special.length ? (
                  <ul className="pf-special-list">
                    {groups.special.map((review, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => openReview("special", i)}
                          aria-label={`Open special award review ${i + 1}`}
                        >
                          <JudgeAvatar seed={i + 1} star size={32} />
                          <span>Special award review {i + 1}</span>
                          <strong>
                            {reviewTotal(review) ?? "—"}
                            <small> / {reviewMax(review)}</small>
                          </strong>
                          <ArrowUpRight size={16} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pf-note">
                    No special award reviews have been released.
                  </p>
                )}
              </section>
            </Tabs.Content>
            <Tabs.Content value="individual" className="pf-panel">
              <Tabs.Root
                value={activeKind}
                onValueChange={(value) => setKind(value as JudgeKind)}
              >
                <Tabs.List className="pf-kind-list" aria-label="Award category">
                  <Tabs.Trigger
                    className="pf-kind"
                    value="main"
                    disabled={!groups.main.length}
                  >
                    Main award <span>{groups.main.length}</span>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    className="pf-kind"
                    value="special"
                    disabled={!groups.special.length}
                  >
                    Special awards <span>{groups.special.length}</span>
                  </Tabs.Trigger>
                </Tabs.List>
                {(["main", "special"] as const).map((category) => (
                  <Tabs.Content
                    className="pf-review-panel"
                    value={category}
                    key={category}
                  >
                    <div
                      className="pf-review-picker"
                      role="group"
                      aria-label={`${labels[category]} reviews`}
                    >
                      {groups[category].map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-pressed={index === i}
                          onClick={() =>
                            setSelection((previous) => ({
                              ...previous,
                              [category]: i,
                            }))
                          }
                        >
                          Review {i + 1}
                        </button>
                      ))}
                    </div>
                    {groups[category][index] && (
                      <IndividualReview
                        review={groups[category][index]}
                        number={index + 1}
                      />
                    )}
                  </Tabs.Content>
                ))}
              </Tabs.Root>
            </Tabs.Content>
          </Tabs.Root>
        </>
      )}
    </section>
  )
}

export function IndividualReview({
  review,
  number,
}: {
  review: TeamReview
  number: number
}) {
  const id = useId()
  const total = reviewTotal(review)
  return (
    <article className="pf-review" aria-labelledby={`${id}-heading`}>
      <header className="pf-review-head">
        <JudgeAvatar seed={number} star={review.kind === "special"} />
        <div>
          <h3 id={`${id}-heading`}>
            {labels[review.kind]} review {number}
          </h3>
          <p>Anonymous judge</p>
        </div>
        <div className="pf-review-total">
          <span>Total score</span>
          <strong>
            {total ?? "—"}
            <small> / {reviewMax(review)}</small>
          </strong>
        </div>
      </header>
      {review.researchOnly && (
        <p className="pf-note pf-research-only">
          This judge couldn’t attend Demo Day, so they reviewed your research
          only. Their review has no presentation scores.
        </p>
      )}
      <div className="pf-sections">
        {sectionsFor(Boolean(review.researchOnly)).map((section) => {
          const remark = review[
            sectionRemarks.find((item) => item.part === section.part)!.key
          ]?.trim()
          return (
            <section key={section.title} className="pf-section">
              <div className="pf-section-heading">
                <h4>{section.title}</h4>
                <strong>
                  {total === null
                    ? "—"
                    : section.criteria.reduce(
                        (sum, criterion) => sum + (review[criterion.key] ?? 0),
                        0
                      )}
                  <small> / {section.criteria.length * SCORE_MAX}</small>
                </strong>
              </div>
              <dl className="pf-scores">
                {section.criteria.map((criterion) => (
                  <div key={criterion.key} className="pf-score">
                    <dt>{criterion.label}</dt>
                    <dd>
                      <span className="pf-dots" aria-hidden>
                        {Array.from({ length: SCORE_MAX }, (_, d) => (
                          <span
                            key={d}
                            className={
                              d < (review[criterion.key] ?? 0)
                                ? "on"
                                : undefined
                            }
                          />
                        ))}
                      </span>
                      <span className="pf-value">
                        {review[criterion.key]}
                        <span>/{SCORE_MAX}</span>
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="pf-comment">
                <h5>
                  <MessageSquareText size={14} aria-hidden />
                  Judge’s comments
                </h5>
                <p>{remark || "No written comment was provided."}</p>
              </div>
            </section>
          )
        })}
      </div>
    </article>
  )
}
