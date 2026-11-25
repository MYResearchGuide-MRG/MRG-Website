import { researchDeadlineLabel } from "./judge-model"
import { useResearchDeadlinePassed } from "./use-research-deadline"
import { useState, useSyncExternalStore } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Clock,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import action from "@/components/ui/action-motion.module.css"
import { RUBRIC_URL } from "./form"
import FeedbackLiveNotice from "./FeedbackLiveNotice"
import { useBackend } from "../admin/backend"
import { teamProfiles, type Board } from "../projectboard/data"
import {
  reviewComplete,
  reviewStatus,
  submitAllReviews,
  useJudgeAccess,
} from "./judge-access"
import {
  judgingProjectHash,
  useLineupBoards,
  useProjectContent,
} from "./lineup"
import StatusBadge from "./StatusBadge"
import JudgingProject from "./JudgingProject"
import "./judging.css"

function subscribe(fn: () => void) {
  window.addEventListener("hashchange", fn)
  return () => window.removeEventListener("hashchange", fn)
}
function useJudgingProjectId() {
  return useSyncExternalStore(
    subscribe,
    () =>
      /^#\/judging\/([a-z0-9-]{1,100})$/.exec(window.location.hash)?.[1] ?? null
  )
}

export default function JudgeWorkspace({ onSignIn }: { onSignIn: () => void }) {
  const access = useJudgeAccess()
  const projectId = useJudgingProjectId()
  if (!access.ready)
    return (
      <main className="container min-h-[70svh] pt-32" role="status">
        Loading judging…
      </main>
    )
  if (!access.judge)
    return (
      <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-6 pt-24 text-center">
        <LockKeyhole
          size={28}
          className="mb-5 text-muted-foreground"
          aria-hidden
        />
        <h1 className="judge-heading">Judge access</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in with the judge access code sent by the committee to see the
          Demo Day lineup.
        </p>
        {access.error && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {access.error}
          </p>
        )}
        <button onClick={onSignIn} className="btn-light mt-8">
          Sign in as judge
        </button>
      </main>
    )
  if (projectId)
    return (
      <JudgingProject
        key={`${access.judge.id}:${projectId}`}
        projectId={projectId}
      />
    )
  return <Lineup />
}

function Lineup() {
  const {
    judge,
    reviews,
    judgingOpen,
    researchClosesAt,
    feedbackReleased,
    error,
  } = useJudgeAccess()
  const boards = useLineupBoards()
  const backend = useBackend()
  const ready = boards.filter((board) =>
    reviewComplete(reviews[board.id])
  ).length
  const allSubmitted =
    boards.length > 0 &&
    boards.every((board) => reviewStatus(reviews[board.id]) === "submitted")
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  // Reviews are submitted together, so "next" is the first team still missing answers.
  const next = boards.find((board) => !reviewComplete(reviews[board.id]))
  const nextIndex = next ? boards.indexOf(next) : -1
  const nextContent = useProjectContent(next ?? boards[0])
  const deadlinePassed = useResearchDeadlinePassed(researchClosesAt)
  const statusLabel = judgingOpen
    ? "Judging is open"
    : feedbackReleased
      ? "Judging is closed"
      : deadlinePassed
        ? "Research marking deadline passed"
        : boards.length
          ? "Marking is paused"
          : "Waiting for the lineup"
  return (
    <main className="min-h-[72svh] pb-20">
      <header className="content-container pt-[calc(70px+3rem)] pb-2 sm:pt-[calc(70px+4.5rem)]">
        <p className="mb-3 text-sm text-muted-foreground">
          MYSSP {judge?.cohortYear} Demo Day
        </p>
        <h1 className="judge-heading">
          {judge?.attendsDemoDay === false
            ? "Research scores"
            : "Presentation Scores"}
        </h1>
        {researchClosesAt && (
          <p className="mt-3 text-sm text-muted-foreground">
            Research marking deadline ·{" "}
            {researchDeadlineLabel(researchClosesAt)}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span
            className={`judge-tag ${judgingOpen ? "judge-tag-secondary-success" : "judge-tag-soft-default"}`}
          >
            <span className="judge-tag-dot" aria-hidden />
            {statusLabel}
          </span>
        </div>
        {feedbackReleased && <FeedbackLiveNotice judgingOpen={judgingOpen} />}
        {(error || backend.error) && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {error || backend.error} Showing the last loaded lineup.
          </p>
        )}
      </header>

      <div className="content-container">
        <div className="section-y">
          <JudgeNotes />
        </div>

        {boards.length > 0 && (
          <section
            className="section-y pb-0 md:pb-0"
            aria-labelledby="progress-heading"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <h2 id="progress-heading" className="judge-heading">
                  Your progress
                </h2>
                <p className="mt-3 text-muted-foreground">
                  <span className="font-display text-2xl text-foreground tabular-nums">
                    {ready}
                    <span className="text-muted-foreground">
                      {" "}
                      / {boards.length}
                    </span>
                  </span>
                  <span className="ml-2 text-sm">
                    reviews {allSubmitted ? "submitted" : "complete"}
                  </span>
                </p>
              </div>
              {judgingOpen && (
                <p className="text-sm text-muted-foreground">
                  <Clock
                    size={14}
                    className="-mt-0.5 mr-1.5 inline"
                    aria-hidden
                  />
                  Open until the committee closes judging
                </p>
              )}
            </div>

            <ol className="judge-progress-bar" aria-hidden>
              {boards.map((board) => (
                <li
                  key={board.id}
                  data-state={
                    reviewStatus(reviews[board.id]) === "submitted"
                      ? "submitted"
                      : reviewComplete(reviews[board.id])
                        ? "complete"
                        : reviews[board.id]
                          ? "draft"
                          : "empty"
                  }
                />
              ))}
            </ol>

            {judgingOpen && !allSubmitted && (
              <p className="judge-autosubmit-note">
                <Clock size={16} className="flex-none" aria-hidden />
                <span>
                  <strong>When judging closes,</strong> complete reviews you
                  made will be submitted automatically.
                </span>
              </p>
            )}

            {(allSubmitted || judgingOpen || !next) && (
              <div className="judge-progress-next">
                {allSubmitted ? (
                  <p className="flex items-center gap-2 text-sm text-emerald-300">
                    <LockKeyhole size={16} aria-hidden /> All reviews submitted
                    and locked. Thank you!
                  </p>
                ) : next ? (
                  <>
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="text-sm text-muted-foreground">Next up</p>
                      <p className="mt-1 line-clamp-2 font-display text-lg leading-snug text-foreground">
                        <span className="tabular-nums">{nextIndex + 1}.</span>{" "}
                        {next.code} {nextContent?.title || next.title}
                      </p>
                    </div>
                    <a
                      href={judgingProjectHash(next.id)}
                      className={`judge-primary-button ${action.light}`}
                    >
                      {reviews[next.id] ? "Continue review" : "Start review"}
                      <ArrowRight size={16} aria-hidden />
                    </a>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Every team has a complete review. Submitting is final, so
                      check your answers before you submit.
                    </p>
                    {judgingOpen && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setSubmitError("")
                          setAcknowledged(false)
                          setConfirmSubmit(true)
                        }}
                        className={`judge-primary-button ${action.light}`}
                      >
                        <LockKeyhole size={16} aria-hidden /> Submit all reviews
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {!judgingOpen && !feedbackReleased && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {deadlinePassed
                  ? "The research marking deadline has passed."
                  : "Marking is paused by the committee."}{" "}
                You can still view the projects and your saved feedback.
              </p>
            )}
          </section>
        )}

        {boards.length ? (
          <div className="section-y pt-0 md:pt-0">
            {/* Continues the progress section: the lineup sits right under it. */}
            <ol
              aria-label="Presentation order"
              className="panel mt-8 divide-y divide-border overflow-hidden"
            >
              {boards.map((board, index) => (
                <LineupRow
                  key={board.id}
                  board={board}
                  index={index}
                  isNext={judgingOpen && board.id === next?.id && !allSubmitted}
                />
              ))}
            </ol>
          </div>
        ) : (
          <div className="section-y">
            <div className="panel px-6 py-16 text-center">
              <h2 className="display-md">The lineup isn’t ready yet</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                The committee will publish the presentation order before Demo
                Day. Check back soon.
              </p>
            </div>
          </div>
        )}
      </div>

      {confirmSubmit && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !submitting) setConfirmSubmit(false)
          }}
        >
          <DialogContent className="judge-dialog" showClose={!submitting}>
            <DialogTitle className="display-md pr-10">
              Submit all {boards.length} reviews? This can’t be undone.
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Submitting sends your final reviews to the committee.
            </DialogDescription>
            <ul className="judge-final-list">
              <li>You can’t take back any review once it is submitted.</li>
              <li>You can’t change any score or comment afterwards.</li>
              <li>
                Your reviews count towards the results exactly as submitted.
              </li>
            </ul>
            <label className="judge-final-ack">
              <input
                type="checkbox"
                checked={acknowledged}
                disabled={submitting}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              <span>
                I’ve checked every score and comment, and I understand my
                reviews can’t be changed after I submit.
              </span>
            </label>
            {submitError && (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {submitError}
              </p>
            )}
            <div className="judge-dialog-actions">
              <button
                type="button"
                className="judge-secondary-button inline-flex"
                disabled={submitting}
                onClick={() => setConfirmSubmit(false)}
              >
                Keep reviewing
              </button>
              <button
                type="button"
                className={`judge-primary-button ${action.light}`}
                disabled={!acknowledged || submitting}
                onClick={() =>
                  void (async () => {
                    setSubmitting(true)
                    setSubmitError("")
                    try {
                      await submitAllReviews()
                      setConfirmSubmit(false)
                    } catch (error) {
                      setSubmitError(
                        error instanceof Error
                          ? error.message
                          : "Could not submit all reviews."
                      )
                    } finally {
                      setSubmitting(false)
                    }
                  })()
                }
              >
                {submitting ? "Submitting…" : "Submit final reviews"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  )
}

function JudgeNotes() {
  return (
    <section className="judge-notes" aria-labelledby="judge-notes-title">
      <h2 id="judge-notes-title" className="judge-heading">
        Judge notes
      </h2>
      <div className="judge-notes-body">
        <ol>
          <li>
            All team members are expected to have contributed meaningfully and
            at an <strong>equal level</strong>. Judges may direct Q&amp;A
            questions to any member.
          </li>
          <li>
            Distinguish between limitations a team is aware of and has
            addressed, and gaps they have not identified. The former should{" "}
            <strong>not significantly penalise a team</strong>.
          </li>
          <li>
            Record scores for each section <strong>independently</strong> before
            judges confer. Final team scores will be determined after collecting
            each judge’s score.
          </li>
          <li>
            The research question and methodology are excluded from the rubric
            because they are based on the assigned project mentor’s scope.
            Assess how well the team <strong>executed and communicated</strong>{" "}
            their work, scoring against sections 1 and 2 of the{" "}
            <a
              href={RUBRIC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="judge-notes-link"
            >
              Official Judging Rubrics
              <ArrowUpRight size={14} aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </li>
        </ol>
        <div className="judge-notes-footer">
          <div className="judge-notes-rubric">
            <FileText size={16} aria-hidden />
            <span>
              <span className="block font-medium text-foreground">
                Official Judging Rubrics
              </span>
              <span className="block text-muted-foreground">
                Score against sections 1 and 2. Keep it open while scoring.
              </span>
            </span>
            <a
              href={RUBRIC_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the Official Judging Rubrics (opens in a new tab)"
              className={`btn-light judge-notes-rubric-open ${action.light}`}
            >
              Open
              <ArrowUpRight size={15} aria-hidden />
            </a>
          </div>
          <p className="judge-notes-important">
            <ShieldCheck
              size={16}
              className="flex-none text-foreground"
              aria-hidden
            />
            <span>
              <strong className="block font-medium text-foreground">
                Your feedback is anonymous to teams.
              </strong>
              Your name is hidden. Teams see feedback when the committee
              releases it.
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}

function LineupRow({
  board,
  index,
  isNext,
}: {
  board: Board
  index: number
  isNext: boolean
}) {
  const { reviews, judgingOpen, feedbackReleased } = useJudgeAccess()
  const content = useProjectContent(board)
  const team = content?.teamMembers || teamProfiles(board)
  return (
    <li>
      <a
        href={judgingProjectHash(board.id)}
        aria-current={isNext ? "step" : undefined}
        className="judge-lineup-row group grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 px-5 py-5 transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_1rem] sm:items-center sm:px-6"
      >
        <span className="judge-lineup-index">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className="mb-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="judge-tag judge-tag-secondary-default">
              {board.code}
            </span>
            <span>{board.track}</span>
            {isNext && (
              <span className="judge-tag judge-tag-soft-accent">Next up</span>
            )}
          </span>
          <span className="block font-display text-lg leading-snug">
            <span className="link-wipe">{content?.title || board.title}</span>
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            {team.map((person) => person.name).join(", ") ||
              "Team to be confirmed"}
          </span>
        </span>
        <span className="col-start-2 sm:col-start-auto">
          <StatusBadge
            status={reviewStatus(reviews[board.id])}
            closed={!judgingOpen && feedbackReleased}
          />
        </span>
        <ChevronRight
          size={16}
          className="hidden text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground sm:block"
          aria-hidden
        />
      </a>
    </li>
  )
}
