import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react"
import action from "@/components/ui/action-motion.module.css"
import { OverviewContent } from "../projectboard/OverviewEditor"
import { teamProfiles, type Board, type Draft } from "../projectboard/data"
import { projectShareUrl } from "../projectboard/paths"
import {
  emptyAnswers,
  judgingSections,
  REMARKS_MAX,
  RUBRIC_URL,
  sectionRemarks,
  scoreKeys,
  scoreLabels,
  SCORE_MAX,
  SCORE_MIN,
  validScore,
  type FeedbackAnswers,
  type ScoreKey,
} from "./form"
import {
  getJudgeAccess,
  reviewStatus,
  saveReview,
  useJudgeAccess,
  type JudgeReview,
} from "./judge-access"
import {
  judgingHash,
  judgingProjectHash,
  useLineupBoards,
  useProjectContent,
} from "./lineup"
import StatusBadge from "./StatusBadge"
import "../projectboard/projectboard.css"
import "./judging.css"

const AUTOSAVE_MS = 1200
const scores = Array.from(
  { length: SCORE_MAX - SCORE_MIN + 1 },
  (_, i) => SCORE_MIN + i
)
const fieldId = (key: ScoreKey | "researchRemarks" | "presentationRemarks") =>
  `judge-field-${key}`

function answersOf(review: JudgeReview | undefined): FeedbackAnswers {
  if (!review) return emptyAnswers()
  return {
    ...(Object.fromEntries(
      scoreKeys.map((key) => [key, review[key]])
    ) as Record<ScoreKey, number | null>),
    researchRemarks: review.researchRemarks,
    presentationRemarks: review.presentationRemarks,
  }
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "error"; message: string }

export default function JudgingProject({ projectId }: { projectId: string }) {
  const { reviews, judgingOpen, feedbackReleased } = useJudgeAccess()
  const boards = useLineupBoards()
  const index = boards.findIndex((board) => board.id === projectId)
  const board = boards[index]
  const content = useProjectContent(board)
  const saved = reviews[projectId]
  const submitted = Boolean(saved?.submittedAt)

  const [answers, setAnswers] = useState(() => answersOf(saved))
  const [saveState, setSaveState] = useState<SaveState>(() =>
    saved ? { kind: "saved", at: saved.updatedAt } : { kind: "idle" }
  )
  const answersRef = useRef(answers)
  const baseVersion = useRef(saved?.updatedAt ?? null)
  const dirty = useRef(false)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const timer = useRef<number | undefined>(undefined)

  // Saves run one at a time, in order, each with the newest answers.
  const persist = useCallback(
    (submit: boolean) => {
      const run = async () => {
        const snapshot = answersRef.current
        if (!submit && !dirty.current) return true
        // Submitted reviews are final; there is nothing left to save.
        if (getJudgeAccess().reviews[projectId]?.submittedAt) {
          dirty.current = false
          return true
        }
        setSaveState({ kind: "saving" })
        try {
          const review = await saveReview(
            projectId,
            snapshot,
            submit,
            baseVersion.current
          )
          baseVersion.current = review.updatedAt
          if (answersRef.current === snapshot) dirty.current = false
          setSaveState({ kind: "saved", at: review.updatedAt })
          return true
        } catch (error) {
          setSaveState({
            kind: "error",
            message: error instanceof Error ? error.message : "Could not save.",
          })
          return false
        }
      }
      const next = queue.current.then(run, run)
      queue.current = next
      return next
    },
    [projectId]
  )

  function change(next: FeedbackAnswers) {
    answersRef.current = next
    dirty.current = true
    setAnswers(next)
    window.clearTimeout(timer.current)
    if (judgingOpen && !submitted)
      timer.current = window.setTimeout(() => void persist(false), AUTOSAVE_MS)
  }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => {
      window.removeEventListener("beforeunload", warn)
      window.clearTimeout(timer.current)
      // Leaving another way (back button, header link) must still save the
      // latest answers; go() already saved them for the in-page links.
      if (dirty.current && getJudgeAccess().judgingOpen) void persist(false)
    }
  }, [persist])

  async function go(hash: string) {
    window.clearTimeout(timer.current)
    if (
      dirty.current &&
      judgingOpen &&
      !(await persist(false)) &&
      !window.confirm(
        "Your latest changes could not be saved. Leave this project anyway?"
      )
    )
      return
    dirty.current = false
    window.location.hash = hash
  }

  if (!board)
    return (
      <main className="mx-auto min-h-[70svh] max-w-xl px-6 pt-40 text-center">
        <h1 className="display-md">This project isn’t in your lineup</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The committee may have changed the presentation order.
        </p>
        <a href={judgingHash} className="btn-dark mt-7">
          <ArrowLeft size={16} aria-hidden /> Back to lineup
        </a>
      </main>
    )

  const previous = boards[index - 1]
  const next = boards[index + 1]
  const status = reviewStatus(saved)
  const missing = missingKeys(answers)
  const total = scoreKeys.length + sectionRemarks.length
  const answered = total - missing.length

  function jumpToMissing() {
    const key = missing[0]
    if (!key) return
    const el = document.getElementById(fieldId(key))
    el?.closest("[data-judge-field]")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
    el?.focus({ preventScroll: true })
  }

  return (
    <main className="judge-page mx-auto w-full max-w-[1040px] px-6 pt-[calc(70px+2.5rem)] pb-16">
      <nav
        className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5 text-sm"
        aria-label="Lineup navigation"
      >
        <a
          href={judgingHash}
          onClick={(event) => {
            event.preventDefault()
            void go(judgingHash)
          }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden /> Lineup
        </a>
        <span className="text-muted-foreground tabular-nums">
          Project {index + 1} of {boards.length}
        </span>
        <span className="flex gap-2">
          <NavButton board={previous} label="Previous" onGo={go} />
          <NavButton board={next} label="Next" onGo={go} forward />
        </span>
      </nav>

      <ProjectSummary
        board={board}
        content={content}
        status={status}
        closed={!judgingOpen && feedbackReleased}
      />

      <section
        aria-labelledby="judge-form-heading"
        className="mt-14 border-t border-border pt-12"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="judge-form-heading" className="judge-heading">
            Your feedback
          </h2>
          {!judgingOpen && (
            <span className="judge-tag judge-tag-soft-default" role="status">
              <span className="judge-tag-dot" aria-hidden />
              {saved || feedbackReleased
                ? "Judging is closed"
                : "Opens on Demo Day"}
            </span>
          )}
        </div>
        <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck
            size={16}
            className="mt-0.5 flex-none text-foreground"
            aria-hidden
          />
          <span>
            <span className="font-medium text-foreground">
              Your feedback is anonymous to teams.
            </span>{" "}
            Your name is hidden, and teams see feedback only after result
            announcement.
          </span>
        </p>
        {submitted && judgingOpen && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3 text-sm text-foreground">
            <Check
              size={16}
              className="mt-0.5 flex-none text-emerald-300"
              aria-hidden
            />
            Submitted. Your answers are final and can no longer be changed.
          </p>
        )}
        <fieldset
          disabled={!judgingOpen || submitted}
          className="mt-8 space-y-6 disabled:opacity-60"
        >
          {judgingSections.map((section, sectionIndex) => {
            const review = sectionRemarks[sectionIndex]
            const sectionKeys = [
              ...section.criteria.map((criterion) => criterion.key),
              review.key,
            ]
            const sectionDone = sectionKeys.filter(
              (key) => !missing.includes(key)
            ).length
            return (
              <section
                key={section.title}
                className="judge-section"
                aria-labelledby={`judge-section-${sectionIndex}`}
              >
                <header className="judge-section-header">
                  <div className="min-w-0">
                    <p className="label-micro text-muted-foreground">
                      Section {sectionIndex + 1}
                    </p>
                    <h3
                      id={`judge-section-${sectionIndex}`}
                      className="display-md mt-3"
                    >
                      {section.title}
                    </h3>
                    <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                    <a
                      href={RUBRIC_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="judge-section-rubric"
                    >
                      <FileText size={14} aria-hidden />
                      Rubric · Section {sectionIndex + 1}
                      <ArrowUpRight size={14} aria-hidden />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                  <span
                    className={`judge-tag judge-section-count ${sectionDone === sectionKeys.length ? "judge-tag-soft-success" : "judge-tag-soft-default"}`}
                  >
                    {sectionDone === sectionKeys.length && (
                      <Check size={13} aria-hidden />
                    )}
                    {sectionDone} / {sectionKeys.length}
                  </span>
                </header>

                <div className="judge-criteria">
                  <div className="judge-criteria-scale-head" aria-hidden>
                    <span className="judge-rating-low">Poor</span>
                    <span className="judge-rating-high">Excellent</span>
                  </div>
                  {section.criteria.map((criterion) => {
                    const value = answers[criterion.key]
                    return (
                      <fieldset
                        key={criterion.key}
                        className="judge-criterion"
                        data-judge-field
                      >
                        <legend className="contents">
                          <span className="judge-criterion-label">
                            <span className="block text-[15px] font-medium">
                              {criterion.label}
                            </span>
                          </span>
                        </legend>
                        <div className="judge-rating">
                          <span className="judge-rating-end judge-rating-low">
                            Poor
                          </span>
                          <div
                            className="judge-scale"
                            role="radiogroup"
                            aria-label={criterion.label}
                          >
                            {scores.map((score) => (
                              <label
                                key={score}
                                className="judge-score"
                                title={scoreLabels[score]}
                              >
                                <input
                                  type="radio"
                                  name={criterion.key}
                                  value={score}
                                  checked={value === score}
                                  aria-label={`${score}: ${scoreLabels[score]}`}
                                  id={
                                    score === SCORE_MIN
                                      ? fieldId(criterion.key)
                                      : undefined
                                  }
                                  onChange={() =>
                                    change({
                                      ...answersRef.current,
                                      [criterion.key]: score,
                                    })
                                  }
                                />
                                <span className="judge-score-circle">
                                  {score}
                                </span>
                              </label>
                            ))}
                          </div>
                          <span className="judge-rating-end judge-rating-high">
                            Excellent
                          </span>
                        </div>
                      </fieldset>
                    )
                  })}
                </div>

                <div className="judge-remarks" data-judge-field>
                  <label
                    htmlFor={fieldId(review.key)}
                    className="block text-[15px] font-medium"
                  >
                    {review.label}
                  </label>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {review.hint}
                  </p>
                  <textarea
                    id={fieldId(review.key)}
                    value={answers[review.key]}
                    maxLength={REMARKS_MAX}
                    rows={6}
                    onChange={(event) =>
                      change({
                        ...answersRef.current,
                        [review.key]: event.target.value,
                      })
                    }
                    className="mt-3 w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/60 focus:border-[#777]"
                    placeholder="Write your review…"
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
                    {answers[review.key].length.toLocaleString()} /{" "}
                    {REMARKS_MAX.toLocaleString()}
                  </p>
                </div>
              </section>
            )
          })}
        </fieldset>
      </section>

      <div
        className="judge-actionbar"
        role="region"
        aria-label="Review progress"
      >
        <div className="judge-actionbar-inner">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {submitted ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300">
                  <Check size={15} aria-hidden /> Submitted
                </span>
              ) : missing.length === 0 ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <Check size={15} aria-hidden /> Review complete
                </span>
              ) : (
                <span className="font-medium tabular-nums">
                  {answered} of {total} answered
                </span>
              )}
              {!submitted && (
                <SaveStatus state={saveState} open={judgingOpen} />
              )}
            </div>
            <div className="judge-actionbar-progress" aria-hidden>
              <span style={{ width: `${(answered / total) * 100}%` }} />
            </div>
          </div>
          {judgingOpen && !submitted && missing.length > 0 && (
            <button
              type="button"
              onClick={jumpToMissing}
              className="judge-secondary-button hidden sm:inline-flex"
            >
              Next unanswered
            </button>
          )}
          {next ? (
            <button
              type="button"
              onClick={() => void go(judgingProjectHash(next.id))}
              className={`judge-primary-button ${action.light}`}
            >
              <span className="hidden sm:inline">Next team:</span> {next.code}
              <ArrowRight size={16} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void go(judgingHash)}
              className={`judge-primary-button ${action.light}`}
            >
              Back to lineup
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

function missingKeys(answers: FeedbackAnswers) {
  const keys: (ScoreKey | (typeof sectionRemarks)[number]["key"])[] = []
  judgingSections.forEach((section, i) => {
    section.criteria.forEach((criterion) => {
      if (!validScore(answers[criterion.key])) keys.push(criterion.key)
    })
    const remark = sectionRemarks[i].key
    if (!answers[remark].trim()) keys.push(remark)
  })
  return keys
}

function NavButton({
  board,
  label,
  onGo,
  forward,
}: {
  board?: Board
  label: string
  onGo: (hash: string) => void
  forward?: boolean
}) {
  const Icon = forward ? ArrowRight : ArrowLeft
  return (
    <button
      disabled={!board}
      onClick={() => board && onGo(judgingProjectHash(board.id))}
      aria-label={
        board
          ? `${label} project: ${board.code}`
          : `No ${label.toLowerCase()} project`
      }
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#454545] bg-[rgb(12_12_12/85%)] px-3 hover:border-[#777] hover:bg-[#242424] disabled:opacity-35 disabled:hover:border-[#454545] disabled:hover:bg-[rgb(12_12_12/85%)]"
    >
      {!forward && <Icon size={15} aria-hidden />}
      {board ? board.code : label}
      {forward && <Icon size={15} aria-hidden />}
    </button>
  )
}

function SaveStatus({ state, open }: { state: SaveState; open: boolean }) {
  if (!open) return null
  if (state.kind === "saving")
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        role="status"
      >
        <LoaderCircle size={14} className="animate-spin" aria-hidden />
        Saving…
      </span>
    )
  if (state.kind === "saved") return null
  if (state.kind === "error")
    return (
      <span className="text-sm text-red-300" role="alert">
        {state.message}
      </span>
    )
  return (
    <span className="text-sm text-muted-foreground">Saves automatically</span>
  )
}

function ProjectSummary({
  board,
  content,
  status,
  closed,
}: {
  board: Board
  content?: Draft
  status: ReturnType<typeof reviewStatus>
  closed: boolean
}) {
  const projectUrl = projectShareUrl(
    board.id,
    window.location.origin,
    window.location.pathname
  )
  const participants = content?.teamMembers || teamProfiles(board)
  return (
    <article className="pt-10">
      <header>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="judge-tag judge-tag-secondary-default">
            {board.code}
          </span>
          <span>{board.track}</span>
          <StatusBadge status={status} closed={closed} />
        </div>
        <h1 className="judge-heading mt-5">{content?.title || board.title}</h1>
      </header>

      <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="label-micro mb-3 text-muted-foreground">
            Participants
          </dt>
          <dd>
            <ul className="space-y-1">
              {participants.length ? (
                participants.map((person) => (
                  <li key={person.id}>
                    <span className="font-medium">{person.name}</span>
                    {person.school && (
                      <span className="text-muted-foreground">
                        , {person.school}
                      </span>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">Team to be confirmed</li>
              )}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="label-micro mb-3 text-muted-foreground">Mentor</dt>
          <dd>
            <span className="font-medium">{board.mentor}</span>
            {board.affiliation && (
              <span className="block text-muted-foreground">
                {board.affiliation}
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="pb-root judge-embed mt-9">
        <section>
          <h2 className="label-micro mb-3 text-muted-foreground">Abstract</h2>
          <OverviewContent text={content?.summary || board.description} />
        </section>
        <a
          href={projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn-dark mt-8 ${action.dark}`}
        >
          View full project <ArrowUpRight size={16} aria-hidden />
        </a>
      </div>
    </article>
  )
}
