import { ResearchWindow } from "./ResearchWindow"
import { useResearchDeadlinePassed } from "./use-research-deadline"
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Gavel,
  GripVertical,
  Lock,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { Reorder, useDragControls, useReducedMotion } from "motion/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Board } from "../projectboard/data"
import { AdminSelect } from "../admin/AdminSelect"
import { useLiveBackend } from "../admin/backend"
import { useCohorts } from "../admin/project-registry"
import {
  judgeTypeLabel,
  judgeTypeLabels,
  judgeTypeOf,
  judgeTypes,
  maxTotalFor,
  missingAnswers,
  presentationKeys,
  sectionsFor,
  SCORE_MAX,
  specialAwardBadge,
  specialAwardKeys,
  specialAwards,
  type JudgeType,
} from "./form"
import {
  feedbackCsv,
  judgeCsvTemplate,
  judgeInputError,
  judgesForAward,
  MAX_TOTAL,
  parseJudgeCsv,
  projectResult,
  rankResults,
  reviewMax,
  reviewTotal,
  type CommitteeJudge,
  type CommitteeReview,
  type JudgeInput,
} from "./judge-model"
import {
  discardReview,
  unsubmitReview,
  importJudges,
  inviteJudges,
  previewJudgeCode,
  saveJudge,
  setJudgeDeleted,
  setLineup,
  setSwitches,
  switchesFor,
  useCommitteeJudging,
  refreshCommitteeJudging,
} from "./judging-admin"
import "../admin/mentors.css"
import "./judging-admin.css"

type Section = "judges" | "lineup" | "results"
const errorText = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback

export function JudgingAdmin({
  boards,
  year,
}: {
  boards: Board[]
  year: number
}) {
  const data = useCommitteeJudging()
  const [section, setSection] = useState<Section>("judges")
  const [notice, setNotice] = useState("")
  const lineup = (data.lineups[year] || [])
    .map((id) => boards.find((board) => board.id === id))
    .filter((board): board is Board => Boolean(board))
  const cohortJudges = data.judges.filter(
    (judge) => judge.cohortYear === year && !judge.deletedAt
  )
  const lineupIds = new Set(lineup.map((board) => board.id))
  const cohortReviews = data.reviews.filter((review) =>
    lineupIds.has(review.projectId)
  )
  const { judgingOpen, feedbackReleased, researchMarking, researchClosesAt } =
    switchesFor(data, year)
  const deadlinePassed = useResearchDeadlinePassed(researchClosesAt)
  const lineupLocked =
    judgingOpen ||
    feedbackReleased ||
    (!deadlinePassed && (researchMarking ?? judgingOpen))

  return (
    <section className="am-root jd-root" aria-label="Judging">
      <div className="jd-topbar">
        {!useLiveBackend && (
          <p className="jd-demo">
            <span aria-hidden />
            Demo mode. Changes here don't affect real judges or teams.
          </p>
        )}
        <button
          className="ad-button jd-refresh"
          onClick={() => void refreshCommitteeJudging()}
        >
          <RefreshCw size={14} aria-hidden /> Refresh
        </button>
      </div>
      {data.ready && (
        <JudgingSteps
          progress={{
            judges: cohortJudges.length,
            uninvited: cohortJudges.filter(
              (judge) => !judge.invitedAt && !judge.revoked
            ).length,
            lineup: lineup.length,
            submitted: cohortReviews.filter((review) => review.submittedAt)
              .length,
            judgingOpen,
            feedbackReleased,
          }}
          onSection={setSection}
        />
      )}
      {data.error && (
        <p className="ad-notice" role="status">
          {data.error}
        </p>
      )}
      {notice && (
        <p className="ad-feedback" role="status">
          <Check size={15} aria-hidden />
          {notice}
          <button aria-label="Dismiss" onClick={() => setNotice("")}>
            ×
          </button>
        </p>
      )}
      <JudgingSwitches
        year={year}
        reviews={cohortReviews}
        judges={cohortJudges.filter((judge) => !judge.revoked)}
        lineupSize={lineup.length}
        onNotice={setNotice}
      />
      <div className="jd-tabs" role="tablist" aria-label="Judging sections">
        {(
          [
            ["judges", "Judges"],
            ["lineup", "Project lineup"],
            ["results", "Progress & results"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            id={`judging-tab-${id}`}
            role="tab"
            aria-selected={section === id}
            aria-controls="judging-section-panel"
            tabIndex={section === id ? 0 : -1}
            onClick={() => setSection(id)}
            onKeyDown={(event) => {
              const ids: Section[] = ["judges", "lineup", "results"]
              const current = ids.indexOf(id)
              const target =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? 2
                    : event.key === "ArrowRight"
                      ? (current + 1) % 3
                      : event.key === "ArrowLeft"
                        ? (current + 2) % 3
                        : -1
              if (target < 0) return
              event.preventDefault()
              setSection(ids[target])
              document.getElementById(`judging-tab-${ids[target]}`)?.focus()
            }}
          >
            {label}
            {id === "lineup" && lineupLocked && (
              <Lock size={12} className="jd-tab-lock" aria-label="locked" />
            )}
          </button>
        ))}
      </div>
      <div
        id="judging-section-panel"
        role="tabpanel"
        aria-labelledby={`judging-tab-${section}`}
      >
        {section === "judges" ? (
          <JudgeManagement
            year={year}
            reviews={cohortReviews}
            lineupSize={lineup.length}
            onNotice={setNotice}
          />
        ) : section === "lineup" ? (
          <LineupEditor
            key={`${year}:${(data.lineups[year] || []).join()}`}
            locked={lineupLocked}
            feedbackReleased={feedbackReleased}
            year={year}
            boards={boards}
            saved={data.lineups[year] || []}
            reviews={cohortReviews}
            judgeCount={cohortJudges.filter((judge) => !judge.revoked).length}
            onNotice={setNotice}
          />
        ) : (
          <Results
            year={year}
            lineup={lineup}
            judges={cohortJudges}
            allJudges={data.judges}
            reviews={cohortReviews}
            judgingOpen={judgingOpen}
            feedbackReleased={feedbackReleased}
            onNotice={setNotice}
          />
        )}
      </div>
    </section>
  )
}

// Switches -----------------------------------------------------------------------------

// Shared by the Judging switch and the lineup's save button, which both open judging.
function OpenJudgingDetails({
  judgeCount,
  lineupSize,
  feedbackReleased = false,
}: {
  judgeCount: number
  lineupSize: number
  feedbackReleased?: boolean
}) {
  return (
    <>
      <DialogDescription>
        {lineupSize === 0
          ? "There are no projects to judge yet."
          : `Your ${judgeCount === 1 ? "judge" : `${judgeCount} judges`} can use general marking for the ${lineupSize} project${lineupSize === 1 ? "" : "s"} in the lineup. Separate research-only windows keep their own settings.`}
      </DialogDescription>
      <ul className="jd-checklist">
        {lineupSize === 0 && (
          <li className="jd-warn">
            Add projects in the Project lineup tab first.
          </li>
        )}
        {lineupSize > 0 && judgeCount === 0 && (
          <li className="jd-warn">
            You haven't added any judges yet, so no one can score.
          </li>
        )}
        <li>
          While judging is open, you can't add, remove or reorder projects. You
          can close judging at any time to make changes.
        </li>
        {feedbackReleased && (
          <li className="jd-warn">
            Teams won't see their feedback while judging is open. You can
            release it again once judging closes.
          </li>
        )}
      </ul>
    </>
  )
}
function JudgingSwitches({
  year,
  reviews,
  judges,
  lineupSize,
  onNotice,
}: {
  year: number
  reviews: CommitteeReview[]
  judges: CommitteeJudge[]
  lineupSize: number
  onNotice: (text: string) => void
}) {
  const data = useCommitteeJudging()
  const current = switchesFor(data, year)
  const [confirm, setConfirm] = useState<
    "open-judging" | "close-judging" | "release" | null
  >(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [releaseChecked, setReleaseChecked] = useState(false)
  const submitted = reviews.filter((review) => review.submittedAt).length
  const drafts = reviews.length - submitted
  // Closing judging submits complete drafts automatically; only incomplete ones are lost.
  // Only drafts from active judges are submitted automatically.
  const activeJudges = new Set(judges.map((judge) => judge.id))
  const incompleteDrafts = reviews.filter(
    (review) =>
      !review.submittedAt &&
      (missingAnswers(review, review.researchOnly).length ||
        !activeJudges.has(review.judgeId))
  ).length
  const completeDrafts = drafts - incompleteDrafts
  const completeResearch = reviews.filter(
    (r) =>
      r.researchOnly &&
      !r.submittedAt &&
      activeJudges.has(r.judgeId) &&
      !missingAnswers(r, true).length
  ).length
  const closingDrafts =
    completeDrafts - (current.researchMarking != null ? completeResearch : 0)
  const releasingDrafts = current.judgingOpen
    ? completeDrafts
    : completeResearch
  // Every active judge scores every lineup project. Reviews from paused or
  // removed judges don't count, and while judging is open, complete drafts
  // count because releasing submits them.
  const expected = judges.length * lineupSize
  const reviewsIn = reviews.filter(
    (review) =>
      activeJudges.has(review.judgeId) &&
      (review.submittedAt ||
        ((current.judgingOpen || review.researchOnly) &&
          !missingAnswers(review, review.researchOnly).length))
  ).length
  const judgingCopy = current.judgingOpen
    ? {
        title: "General judging is open",
        text: "Attending judges can score projects and submit reviews.",
      }
    : {
        title: "General judging is closed",
        text: "Open this window when attending judges can start marking.",
      }
  const feedbackCopy = current.feedbackReleased
    ? {
        title: "Feedback released to teams",
        text: "Each team can read its own reviews, with every score and remark. Judge names stay hidden.",
      }
    : {
        title: "Feedback not yet released to teams",
        text: current.judgingOpen
          ? "Teams can't see their judges' feedback yet. Releasing it will close judging first."
          : "Release feedback when you're ready for teams to see it.",
      }
  async function change(
    next: typeof current,
    message: string,
    then: typeof confirm = null
  ) {
    setBusy(true)
    setError("")
    try {
      await setSwitches(year, next)
      onNotice(message)
      setConfirm(then)
    } catch (cause) {
      setError(errorText(cause, "Could not change judging status."))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="jd-switches">
      <div className="jd-switch-card" data-guide="judging-switch">
        <div>
          <strong>{judgingCopy.title}</strong>
          <p>{judgingCopy.text}</p>
        </div>
        <Switch
          label="Judging open"
          checked={current.judgingOpen}
          disabled={busy}
          onChange={() =>
            current.judgingOpen
              ? setConfirm("close-judging")
              : setConfirm("open-judging")
          }
        />
      </div>
      <div className="jd-switch-card" data-guide="feedback-switch">
        <div>
          <strong>{feedbackCopy.title}</strong>
          <p>{feedbackCopy.text}</p>
        </div>
        <Switch
          label="Feedback released"
          checked={current.feedbackReleased}
          disabled={busy}
          onChange={() =>
            current.feedbackReleased
              ? void change(
                  { ...current, feedbackReleased: false },
                  "Feedback hidden from teams again."
                )
              : (setReleaseChecked(false), setConfirm("release"))
          }
        />
      </div>
      <ResearchWindow
        key={year}
        year={year}
        current={current}
        lineupSize={lineupSize}
        onNotice={onNotice}
      />
      {error && (
        <p className="ad-error" role="alert">
          {error}
        </p>
      )}
      {confirm === "close-judging" && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setConfirm(null)
          }}
        >
          <DialogContent className="ad-modal am-dialog">
            <DialogTitle>Close judging?</DialogTitle>
            <DialogDescription>
              Attending judges will stop marking. Judges with a separate
              research-only window keep their own settings.
            </DialogDescription>
            {(closingDrafts > 0 || incompleteDrafts > 0) && (
              <ul className="jd-checklist">
                {closingDrafts > 0 && (
                  <li>
                    {closingDrafts === 1
                      ? "1 finished draft"
                      : `${closingDrafts} finished drafts`}{" "}
                    will be submitted for the judges, so{" "}
                    {closingDrafts === 1 ? "it counts" : "they count"} towards
                    results.
                  </li>
                )}
                {incompleteDrafts > 0 && (
                  <li className="jd-warn">
                    {incompleteDrafts === 1
                      ? "1 unfinished draft"
                      : `${incompleteDrafts} unfinished drafts`}{" "}
                    will be kept but won't count towards results.
                  </li>
                )}
              </ul>
            )}
            <div className="ad-modal-actions">
              <button
                className="ad-button"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="ad-button ad-primary"
                disabled={busy}
                onClick={() =>
                  void change(
                    { ...current, judgingOpen: false },
                    "General judging is closed."
                  )
                }
              >
                Close judging
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {confirm === "open-judging" && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setConfirm(null)
          }}
        >
          <DialogContent className="ad-modal am-dialog">
            <DialogTitle>Open judging?</DialogTitle>
            <OpenJudgingDetails
              judgeCount={judges.length}
              lineupSize={lineupSize}
              feedbackReleased={current.feedbackReleased}
            />
            {error && (
              <p className="ad-error" role="alert">
                {error}
              </p>
            )}
            <div className="ad-modal-actions">
              <button
                className="ad-button"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="ad-button ad-primary"
                disabled={busy || lineupSize === 0}
                onClick={() =>
                  void change(
                    { judgingOpen: true, feedbackReleased: false },
                    "Judging is open. Judges can now score projects."
                  )
                }
              >
                {busy ? "Opening…" : "Open judging"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {confirm === "release" && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setConfirm(null)
          }}
        >
          <DialogContent className="ad-modal am-dialog">
            <DialogTitle>Release feedback to teams?</DialogTitle>
            <DialogDescription>
              Each team will see its own scores and comments. Judge names stay
              hidden.
            </DialogDescription>
            <ul className="jd-checklist">
              <li className={reviewsIn < expected ? "jd-warn" : undefined}>
                {reviewsIn} of {expected} reviews are in.
              </li>
              {current.judgingOpen && (
                <li>Judges won't be able to change their scores after this.</li>
              )}
              {incompleteDrafts > 0 && (
                <li className="jd-warn">
                  {incompleteDrafts} unfinished draft
                  {incompleteDrafts === 1 ? " won't" : "s won't"} be shared.
                </li>
              )}
              <li>
                Teams won't get an email. They'll see it on their project page.
              </li>
            </ul>
            {error && (
              <p className="ad-error" role="alert">
                {error}
              </p>
            )}
            <label className="jd-release-check">
              <input
                type="checkbox"
                checked={releaseChecked}
                onChange={(event) => setReleaseChecked(event.target.checked)}
              />
              <span>I've read the comments and they're okay to share.</span>
            </label>
            <div className="ad-modal-actions">
              <button
                className="ad-button"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="ad-button ad-primary"
                disabled={
                  busy || !releaseChecked || submitted + releasingDrafts === 0
                }
                onClick={() =>
                  void change(
                    { judgingOpen: false, feedbackReleased: true },
                    "Feedback released. Teams can now see it on their project page."
                  )
                }
              >
                {busy ? "Releasing…" : "Release feedback"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: () => void
}) {
  return (
    <button
      className="ad-visibility-switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
    >
      <span>
        {checked
          ? label === "Judging open"
            ? "Open"
            : "Released"
          : label === "Judging open"
            ? "Closed"
            : "Hidden"}
      </span>
      <span className="ad-switch-track" aria-hidden="true">
        <span />
      </span>
    </button>
  )
}

// Judges -----------------------------------------------------------------------------------
const blankJudge = (year: number): JudgeInput => ({
  name: "",
  email: "",
  affiliation: "",
  kind: "main",
  specialAward: null,
  attendsDemoDay: true,
  revoked: false,
  cohortYear: year,
})

function JudgeManagement({
  year,
  reviews,
  lineupSize,
  onNotice,
}: {
  year: number
  reviews: CommitteeReview[]
  lineupSize: number
  onNotice: (text: string) => void
}) {
  const { judges, reviews: allReviews } = useCommitteeJudging()
  const [query, setQuery] = useState("")
  const [allCohorts, setAllCohorts] = useState(false)
  const [editing, setEditing] = useState<CommitteeJudge | "new" | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<CommitteeJudge | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [confirmIds, setConfirmIds] = useState<string[]>([])
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [attendanceSaving, setAttendanceSaving] = useState<string | null>(null)
  const attendanceLocked = (judge: CommitteeJudge) =>
    allReviews.some(
      (review) => review.judgeId === judge.id && review.submittedAt
    )
  async function toggleAttendance(judge: CommitteeJudge) {
    const attends = !judge.attendsDemoDay
    const losesScores =
      !attends &&
      allReviews.some(
        (review) =>
          review.judgeId === judge.id &&
          (presentationKeys.some((key) => review[key] !== null) ||
            review.presentationRemarks.trim())
      )
    if (
      losesScores &&
      !window.confirm(
        `${judge.name} has presentation scores in their drafts. Marking them as not at Demo Day clears those scores. Continue?`
      )
    )
      return
    setAttendanceSaving(judge.id)
    try {
      await saveJudge(
        {
          name: judge.name,
          email: judge.email,
          affiliation: judge.affiliation,
          kind: judge.kind,
          specialAward: judge.specialAward,
          revoked: judge.revoked,
          cohortYear: judge.cohortYear,
          attendsDemoDay: attends,
        },
        judge.id
      )
      onNotice(
        attends
          ? `${judge.name} will attend Demo Day and score research and the presentation, out of ${MAX_TOTAL}.`
          : `${judge.name} won't attend Demo Day and will score the research only, out of ${maxTotalFor(true)}.`
      )
    } catch (cause) {
      onNotice(errorText(cause, "Could not update Demo Day attendance."))
    } finally {
      setAttendanceSaving(null)
    }
  }
  const shown = judges.filter(
    (judge) =>
      !judge.deletedAt &&
      (allCohorts || judge.cohortYear === year) &&
      `${judge.name} ${judge.email} ${judge.affiliation}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
  )
  const selectable = shown.filter((judge) => !judge.revoked && !judge.deletedAt)
  const selectedHere = selectable.filter((judge) => selected.includes(judge.id))
  const allSelected =
    selectable.length > 0 &&
    selectable.every((judge) => selected.includes(judge.id))
  const invitees = judges.filter(
    (judge) =>
      confirmIds.includes(judge.id) && !judge.revoked && !judge.deletedAt
  )
  const cohort = judges.filter(
    (judge) => judge.cohortYear === year && !judge.deletedAt
  )
  const uninvited = cohort.filter((judge) => !judge.invitedAt && !judge.revoked)

  async function send() {
    if (!invitees.length || busy) return
    setBusy(true)
    const ids = invitees.map((judge) => judge.id)
    setConfirmIds([])
    try {
      const result = await inviteJudges(ids)
      setSelected([])
      if (useLiveBackend)
        onNotice(
          `${result.sent} judge invitation${result.sent === 1 ? "" : "s"} sent.${result.failed ? ` ${result.failed} failed; check the addresses and try again.` : ""}`
        )
      else {
        onNotice(
          `${ids.length} local code${ids.length === 1 ? "" : "s"} prepared. No email was sent.`
        )
        if (ids.length === 1) setPreviewId(ids[0])
      }
    } catch (cause) {
      onNotice(errorText(cause, "Could not send judge invitations."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {uninvited.length > 0 && (
        <div className="jd-uninvited" data-guide="access-codes">
          <Mail size={15} aria-hidden />
          <span>
            {uninvited.length} judge
            {uninvited.length === 1 ? " hasn't" : "s haven't"} been sent an
            access code.
          </span>
          <button
            className="ad-button"
            disabled={busy}
            onClick={() => setConfirmIds(uninvited.map((judge) => judge.id))}
          >
            Send access code{uninvited.length === 1 ? "" : "s"}
          </button>
        </div>
      )}
      <div className="am-toolbar">
        <label className="am-search">
          <Search size={16} aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email or affiliation"
            aria-label="Search judges"
          />
        </label>
        <AdminSelect
          label="Show judges from"
          value={allCohorts ? "all" : "cohort"}
          onChange={(value) => setAllCohorts(value === "all")}
          options={[
            { value: "cohort", label: `${year} cohort` },
            { value: "all", label: "All cohorts" },
          ]}
        />
        <button
          className="ad-button ad-primary"
          data-guide="add-judge"
          onClick={() => setEditing("new")}
        >
          <Plus size={15} aria-hidden /> Add judge
        </button>
        <button className="ad-button" onClick={() => setImportOpen(true)}>
          <Upload size={15} aria-hidden /> Import CSV
        </button>
      </div>
      {selectedHere.length > 0 && (
        <div className="am-selection">
          <span>{selectedHere.length} selected</span>
          <button
            className="ad-button"
            disabled={busy}
            onClick={() => setConfirmIds(selectedHere.map((judge) => judge.id))}
          >
            <Mail size={15} aria-hidden /> Send access codes
          </button>
          <button onClick={() => setSelected([])}>Clear</button>
        </div>
      )}
      <div className="am-table-wrap" data-guide="judges-table">
        <table className="am-table jd-judges-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Select all listed judges"
                  checked={allSelected}
                  disabled={!selectable.length}
                  onChange={() =>
                    setSelected(
                      allSelected
                        ? selected.filter(
                            (id) => !selectable.some((judge) => judge.id === id)
                          )
                        : [
                            ...new Set([
                              ...selected,
                              ...selectable.map((judge) => judge.id),
                            ]),
                          ]
                    )
                  }
                />
              </th>
              <th>Judge</th>
              <th
                title={`Untick for a judge who will score the research only (out of ${maxTotalFor(true)}), without the presentation`}
              >
                Demo Day
              </th>
              <th className="jd-num">Reviews</th>
              <th>Access</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((judge) => {
              const submitted = reviews.filter(
                (review) => review.judgeId === judge.id && review.submittedAt
              ).length
              return (
                <tr key={judge.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${judge.name}`}
                      checked={selected.includes(judge.id)}
                      disabled={judge.revoked || Boolean(judge.deletedAt)}
                      onChange={() =>
                        setSelected(
                          selected.includes(judge.id)
                            ? selected.filter((id) => id !== judge.id)
                            : [...selected, judge.id]
                        )
                      }
                    />
                  </td>
                  <td>
                    <div className="jd-judge-name">
                      <strong>{judge.name}</strong>
                      {judge.kind === "special" && (
                        <span className="jd-kind">
                          {specialAwardBadge(judge.specialAward)}
                        </span>
                      )}
                      {judge.kind === "special" && !judge.specialAward && (
                        <span
                          className="jd-kind jd-kind-missing"
                          title="Edit this judge to choose UTAR, MABECS or MathWorks. Until then they can’t be paused or have Demo Day attendance changed."
                        >
                          Choose an award
                        </span>
                      )}
                      {judge.cohortYear !== year && (
                        <span className="jd-kind jd-kind-cohort">
                          {judge.cohortYear} cohort
                        </span>
                      )}
                    </div>
                    <span>{judge.affiliation || "Affiliation not added"}</span>
                    <span className="am-email">{judge.email}</span>
                  </td>
                  <td>
                    <label
                      className={`jd-attend${attendanceLocked(judge) ? " is-locked" : ""}`}
                      title={
                        attendanceLocked(judge)
                          ? "Locked because this judge has already submitted reviews"
                          : judge.attendsDemoDay
                            ? `Scores research and presentation, out of ${MAX_TOTAL}. Untick if they can't attend.`
                            : `Scores research only, out of ${maxTotalFor(true)}`
                      }
                    >
                      <input
                        type="checkbox"
                        aria-label={`${judge.name} attends Demo Day`}
                        checked={judge.attendsDemoDay}
                        disabled={
                          attendanceSaving !== null || attendanceLocked(judge)
                        }
                        onChange={() => void toggleAttendance(judge)}
                      />
                      <em>Attending</em>
                      {attendanceLocked(judge) && (
                        <Lock size={12} aria-label="Locked" />
                      )}
                    </label>
                  </td>
                  <td className="jd-num" data-label="Reviews submitted">
                    {judge.cohortYear === year
                      ? `${submitted} / ${lineupSize}`
                      : "–"}
                  </td>
                  <td>
                    <span
                      className={`jd-pill ${
                        judge.revoked
                          ? "jd-pill-warning"
                          : judge.invitedAt
                            ? "jd-pill-success"
                            : "jd-pill-default"
                      }`}
                    >
                      <i aria-hidden />
                      {judge.revoked
                        ? "Paused"
                        : judge.invitedAt
                          ? "Invited"
                          : "Not invited"}
                    </span>
                  </td>
                  <td>
                    <div className="am-actions">
                      <button
                        aria-label={`Edit ${judge.name}`}
                        onClick={() => setEditing(judge)}
                      >
                        <Pencil size={15} aria-hidden /> Edit
                      </button>
                      <button
                        className="am-delete"
                        disabled={busy}
                        aria-label={`Delete ${judge.name}`}
                        title="Delete judge"
                        onClick={() => setDeleting(judge)}
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!shown.length && (
          <div className="am-empty">
            <Gavel size={24} aria-hidden />
            <h2>
              {allCohorts ? "No judges yet" : `No judges for ${year} yet`}
            </h2>
            <p>
              Add each judge, then send their access codes when the lineup is
              ready.
            </p>
            <button className="ad-button" onClick={() => setEditing("new")}>
              Add judge
            </button>
          </div>
        )}
      </div>
      {editing && (
        <JudgeEditor
          key={editing === "new" ? "new" : editing.id}
          judge={editing === "new" ? undefined : editing}
          year={year}
          existing={judges}
          busy={busy}
          onSendCode={(judge) => {
            setEditing(null)
            setConfirmIds([judge.id])
          }}
          onDelete={(judge) => {
            setEditing(null)
            setDeleting(judge)
          }}
          onClose={() => setEditing(null)}
          onSaved={(emailChanged) => {
            onNotice(
              editing === "new"
                ? "Judge added. Send their access code when ready."
                : emailChanged
                  ? "Email updated. Send a new access code; the previous login no longer works."
                  : "Judge details saved."
            )
            setEditing(null)
          }}
        />
      )}
      {importOpen && (
        <JudgeImport
          year={year}
          existing={judges}
          onClose={() => setImportOpen(false)}
          onImported={(count) => {
            setImportOpen(false)
            onNotice(
              `${count} judges added. Review the list before sending access codes.`
            )
          }}
        />
      )}
      {deleting && (
        <JudgeDeleteDialog
          judge={deleting}
          onClose={() => setDeleting(null)}
          onSaved={() => {
            onNotice(
              "Judge moved to Trash. Their sign-in no longer works; submitted reviews are kept."
            )
            setSelected((ids) => ids.filter((id) => id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}
      {confirmIds.length > 0 && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirmIds([])
          }}
        >
          <DialogContent className="ad-modal am-dialog">
            <DialogTitle>
              {invitees.some((judge) => judge.invitedAt)
                ? "Send new access codes?"
                : "Invite judges?"}
            </DialogTitle>
            <DialogDescription>
              {useLiveBackend
                ? "Each judge receives a private six-character code by email. Sending again replaces their existing code."
                : "This local preview prepares test codes only. No email will be sent."}
            </DialogDescription>
            <div className="am-confirm-list">
              {invitees.map((judge) => (
                <div key={judge.id}>
                  <strong>{judge.name}</strong>
                  <span>{judge.email}</span>
                </div>
              ))}
            </div>
            <div className="ad-modal-actions">
              <button className="ad-button" onClick={() => setConfirmIds([])}>
                Cancel
              </button>
              <button
                className="ad-button ad-primary"
                disabled={busy || !invitees.length}
                onClick={() => void send()}
              >
                <Mail size={15} aria-hidden />{" "}
                {useLiveBackend ? "Send codes" : "Prepare codes"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {previewId && !useLiveBackend && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPreviewId(null)
          }}
        >
          <DialogContent className="ad-modal am-dialog">
            <DialogTitle>Local judge sign-in</DialogTitle>
            <DialogDescription>
              Use this code with the judge’s email to test the judge pages in
              this browser. No email was sent.
            </DialogDescription>
            <p className="am-preview-code">{previewJudgeCode(previewId)}</p>
            <div className="ad-modal-actions">
              <button
                className="ad-button ad-primary"
                onClick={() => setPreviewId(null)}
              >
                Done
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function JudgeImport({
  year,
  existing,
  onClose,
  onImported,
}: {
  year: number
  existing: CommitteeJudge[]
  onClose: () => void
  onImported: (count: number) => void
}) {
  const [text, setText] = useState("")
  const [filename, setFilename] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const rows = useMemo(
    () => parseJudgeCsv(text, year, existing),
    [text, year, existing]
  )
  const errors = rows.filter((row) => row.error)
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!/\.(csv|tsv)$/i.test(file.name) || file.size > 1_048_576) {
      setError("Choose a CSV or TSV file smaller than 1 MB.")
      return
    }
    setText(await file.text())
    setFilename(file.name)
    setError("")
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([judgeCsvTemplate], { type: "text/csv;charset=utf-8" })
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "myssp-judges-template.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }
  async function commit() {
    if (!rows.length || errors.length || rows.length > 100 || busy) return
    setBusy(true)
    setError("")
    try {
      await importJudges(rows)
      onImported(rows.length)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not import judges."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="ad-modal am-dialog am-import">
        <DialogTitle>Import judges</DialogTitle>
        <DialogDescription>
          Use one row per judge. Review every row before adding them to the{" "}
          {year} cohort.
        </DialogDescription>
        <div className="am-import-tools">
          <label className="ad-button">
            <Upload size={15} aria-hidden />
            {filename || "Choose CSV file"}
            <input
              type="file"
              accept=".csv,.tsv"
              className="sr-only"
              onChange={(event) => void readFile(event)}
            />
          </label>
          <button className="ad-button" onClick={download}>
            <Download size={15} aria-hidden /> CSV template
          </button>
        </div>
        <p className="am-hint">
          Columns: <code>name,email,affiliation,judge_type</code>. Judge type
          must be <code>main</code>, <code>utar</code>, <code>mabecs</code> or{" "}
          <code>mathworks</code>. Optional <code>attends_demo_day</code>:{" "}
          <code>yes</code> or <code>no</code> (blank means yes).
        </p>
        <textarea
          aria-label="Paste judge CSV rows"
          rows={5}
          spellCheck={false}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setFilename("")
            setError("")
          }}
          placeholder={judgeCsvTemplate.replaceAll("\r", "")}
        />
        {rows.length > 0 && (
          <div className="am-import-review">
            <strong>
              {rows.length} row{rows.length === 1 ? "" : "s"}
            </strong>
            <span>
              {errors.length
                ? `${errors.length} need changes`
                : "Ready to import"}
            </span>
            <div>
              {rows.slice(0, 100).map((row) => (
                <p key={row.line}>
                  <span>
                    {row.name || `Row ${row.line}`}
                    <small>{row.email}</small>
                  </span>
                  <span>
                    {row.error ||
                      `${judgeTypeLabel(row)}${row.attendsDemoDay ? "" : " · Not at Demo Day"}`}
                  </span>
                </p>
              ))}
            </div>
          </div>
        )}
        {rows.length > 100 && (
          <p className="ad-error" role="alert">
            Import up to 100 judges at a time.
          </p>
        )}
        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}
        <div className="ad-modal-actions">
          <button className="ad-button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className="ad-button ad-primary"
            disabled={
              busy || !rows.length || rows.length > 100 || errors.length > 0
            }
            onClick={() => void commit()}
          >
            {busy
              ? "Importing…"
              : `Import ${rows.length || ""} judge${rows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function JudgeEditor({
  judge,
  year,
  existing,
  busy,
  onSendCode,
  onDelete,
  onClose,
  onSaved,
}: {
  judge?: CommitteeJudge
  year: number
  existing: CommitteeJudge[]
  busy: boolean
  onSendCode: (judge: CommitteeJudge) => void
  onDelete: (judge: CommitteeJudge) => void
  onClose: () => void
  onSaved: (emailChanged: boolean) => void
}) {
  const cohorts = useCohorts()
  const [input, setInput] = useState<JudgeInput>(
    judge
      ? {
          name: judge.name,
          email: judge.email,
          affiliation: judge.affiliation,
          kind: judge.kind,
          specialAward: judge.specialAward,
          attendsDemoDay: judge.attendsDemoDay,
          revoked: judge.revoked,
          cohortYear: judge.cohortYear,
        }
      : blankJudge(year)
  )
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const emailChanged = Boolean(
    judge && input.email.trim().toLowerCase() !== judge.email
  )
  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = judgeInputError(input, existing, judge?.id)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError("")
    try {
      await saveJudge(input, judge?.id)
      onSaved(emailChanged)
    } catch (cause) {
      setError(errorText(cause, "Could not save this judge."))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
    >
      <DialogContent className="ad-modal am-dialog am-editor jd-dialog-select">
        <DialogTitle>{judge ? "Edit judge" : "Add judge"}</DialogTitle>
        <DialogDescription>
          Judges see only their cohort’s Demo Day lineup. Mentors and
          participants cannot be judges.
        </DialogDescription>
        <form onSubmit={(event) => void submit(event)}>
          <div className="am-field-pair">
            <label>
              Name
              <input
                required
                maxLength={100}
                value={input.name}
                onChange={(event) =>
                  setInput({ ...input, name: event.target.value })
                }
                placeholder="Full name"
              />
            </label>
            <label>
              Email address
              <input
                required
                type="email"
                maxLength={254}
                value={input.email}
                onChange={(event) =>
                  setInput({ ...input, email: event.target.value })
                }
                placeholder="judge@example.com"
              />
            </label>
          </div>
          {emailChanged && (
            <p className="am-email-notice" role="status">
              Saving a new email signs out the previous login. Send a new access
              code after saving.
            </p>
          )}
          <div className="am-field-pair">
            <label>
              Affiliation
              <input
                maxLength={180}
                value={input.affiliation}
                onChange={(event) =>
                  setInput({ ...input, affiliation: event.target.value })
                }
                placeholder="University or organisation"
              />
            </label>
            <label>
              Judging cohort
              <select
                value={input.cohortYear}
                onChange={(event) =>
                  setInput({ ...input, cohortYear: Number(event.target.value) })
                }
              >
                {[...new Set([input.cohortYear, ...cohorts.map((c) => c.year)])]
                  .sort((a, b) => b - a)
                  .map((y) => (
                    <option key={y} value={y}>
                      {cohorts.find((c) => c.year === y)?.name || `MYSSP ${y}`}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <label className="jd-kind-field">
            Judge type
            <select
              value={judgeTypeOf(input)}
              onChange={(event) => {
                const type = event.target.value as JudgeType | "special"
                setInput({
                  ...input,
                  kind: type === "main" ? "main" : "special",
                  specialAward:
                    type === "main" || type === "special" ? null : type,
                })
              }}
            >
              {judgeTypeOf(input) === "special" && (
                <option value="special" disabled>
                  Special award: choose an award
                </option>
              )}
              {judgeTypes.map((type) => (
                <option key={type} value={type}>
                  {judgeTypeLabels[type]}
                </option>
              ))}
            </select>
            <small>
              A special award can have several judges, averaged in its own results.
              Teams see only “Main” or “Special award” on a review.
            </small>
          </label>
          {judge && judge.cohortYear !== input.cohortYear && (
            <p className="am-email-notice" role="status">
              The judge will see the {input.cohortYear} lineup instead. Their{" "}
              {judge.cohortYear} reviews stay with those teams.
            </p>
          )}
          {judge && (
            <label className="am-pause">
              <input
                type="checkbox"
                checked={input.revoked}
                onChange={(event) =>
                  setInput({ ...input, revoked: event.target.checked })
                }
              />
              <span>
                <strong>Pause judge access</strong>
                <small>
                  The judge can’t sign in until access is restored. Submitted
                  reviews still count.
                </small>
              </span>
            </label>
          )}
          {judge && (
            <div className="jd-editor-access">
              <span>
                <strong>Access code</strong>
                <small>
                  {judge.revoked
                    ? "Restore access before sending a code."
                    : emailChanged
                      ? "Save the new email first, then send a code."
                      : judge.invitedAt
                        ? "Email a new code. The previous code stops working."
                        : "Email this judge their sign-in code."}
                </small>
              </span>
              <button
                type="button"
                className="ad-button"
                disabled={saving || busy || judge.revoked || emailChanged}
                onClick={() => onSendCode(judge)}
              >
                <Mail size={15} aria-hidden />
                {judge.invitedAt ? "Reissue code" : "Send code"}
              </button>
            </div>
          )}
          {error && (
            <p className="ad-error" role="alert">
              {error}
            </p>
          )}
          <div className="ad-modal-actions">
            {judge && (
              <button
                type="button"
                className="ad-button am-destructive jd-editor-delete"
                disabled={saving || busy}
                onClick={() => onDelete(judge)}
              >
                <Trash2 size={15} aria-hidden /> Delete judge
              </button>
            )}
            <button
              type="button"
              className="ad-button"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ad-button ad-primary"
              disabled={saving}
            >
              {saving ? "Saving…" : judge ? "Save judge" : "Add judge"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function JudgeDeleteDialog({
  judge,
  onClose,
  onSaved,
}: {
  judge: CommitteeJudge
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  async function submit() {
    setSaving(true)
    setError("")
    try {
      await setJudgeDeleted(judge.id, true)
      onSaved()
    } catch (cause) {
      setError(errorText(cause, "Could not update this judge."))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
    >
      <DialogContent className="ad-modal am-dialog">
        <DialogTitle>Delete judge?</DialogTitle>
        <DialogDescription>
          Moves this judge to Trash and blocks their sign-in. Reviews they
          submitted stay with the teams. You can restore them from Trash.
        </DialogDescription>
        <div className="am-confirm-list">
          <div>
            <strong>{judge.name}</strong>
            <span>{judge.email}</span>
          </div>
        </div>
        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}
        <div className="ad-modal-actions">
          <button className="ad-button" disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button
            className="ad-button am-destructive"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? "Deleting…" : "Delete judge"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Lineup ---------------------------------------------------------------------------------------
const byCode = (a: Board, b: Board) =>
  a.code.localeCompare(b.code, undefined, { numeric: true })

function LineupEditor({
  year,
  boards,
  saved,
  reviews,
  locked,
  feedbackReleased,
  judgeCount,
  onNotice,
}: {
  year: number
  boards: Board[]
  saved: string[]
  reviews: CommitteeReview[]
  locked: boolean
  feedbackReleased: boolean
  judgeCount: number
  onNotice: (text: string) => void
}) {
  const cohortBoards = useMemo(
    () => boards.filter((board) => board.year === year).sort(byCode),
    [boards, year]
  )
  const [order, setOrder] = useState(() =>
    saved.filter((id) => cohortBoards.some((board) => board.id === id))
  )
  const [adding, setAdding] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState("")
  const dirty = order.join() !== saved.join()
  const remaining = cohortBoards.filter((board) => !order.includes(board.id))
  const removedWithReviews = saved.filter(
    (id) =>
      !order.includes(id) && reviews.some((review) => review.projectId === id)
  )
  const move = (index: number, by: number) =>
    setOrder((current) => {
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(index + by, 0, item)
      return next
    })
  async function save(startMarking = true) {
    setSaving(true)
    setError("")
    try {
      await setLineup(year, order, startMarking)
      setConfirming(false)
      onNotice(
        order.length
          ? startMarking
            ? "Lineup saved. General judging is open."
            : "Lineup saved. You can now start research-only marking."
          : "Lineup cleared. Judging is closed."
      )
    } catch (cause) {
      setError(errorText(cause, "Could not save the lineup."))
    } finally {
      setSaving(false)
    }
  }
  if (locked)
    return (
      <div>
        <p className="jd-lock-note" role="status">
          <Lock size={14} aria-hidden />
          {feedbackReleased
            ? "Feedback has been released. Hide it before changing the lineup."
            : "The lineup is locked while judging is open. Close any open marking windows to edit the lineup."}
        </p>
        <ol className="jd-lineup" data-guide="lineup">
          {saved.map((id, index) => {
            const board = cohortBoards.find((item) => item.id === id)
            return (
              board && (
                <li key={id} className="jd-lineup-row jd-locked">
                  <span className="jd-position">{index + 1}</span>
                  <span className="jd-lineup-project">
                    <span className="jd-code">{board.code}</span>
                    <span>{board.title}</span>
                  </span>
                </li>
              )
            )
          })}
        </ol>
      </div>
    )
  return (
    <div>
      {/* Sticky, so saving never needs a scroll to the end of a long lineup. */}
      <div className={dirty ? "jd-lineup-bar jd-dirty" : "jd-lineup-bar"}>
        <p className="jd-intro">
          {order.length
            ? "Judges will see projects in this order. You can't change the lineup while judging is open."
            : "Add projects and save the lineup before starting a marking round."}
        </p>
        <div className="jd-lineup-save">
          {!dirty && saved.length > 0 && (
            <span className="jd-muted">Saved</span>
          )}
          <button
            className="ad-button"
            disabled={!dirty || saving}
            onClick={() => setOrder(saved)}
          >
            Undo changes
          </button>
          {order.length > 0 && (
            <button
              className="ad-button"
              disabled={!dirty || saving}
              onClick={() => void save(false)}
            >
              Save lineup only
            </button>
          )}
          <button
            className="ad-button ad-primary"
            disabled={(!dirty && !order.length) || saving}
            // An empty lineup doesn't open judging, so it saves straight away.
            onClick={() =>
              order.length ? (setError(""), setConfirming(true)) : void save()
            }
          >
            {saving
              ? "Saving…"
              : order.length
                ? "Save lineup and open judging"
                : "Save empty lineup"}
          </button>
        </div>
      </div>
      {/* Drag by the handle (mouse or touch); the arrow buttons cover keyboard use. */}
      <Reorder.Group
        as="ol"
        axis="y"
        values={order}
        onReorder={setOrder}
        className="jd-lineup"
        data-guide="lineup"
      >
        {order.map((id, index) => {
          const board = cohortBoards.find((item) => item.id === id)
          if (!board) return null
          return (
            <LineupRow
              key={id}
              board={board}
              index={index}
              last={index === order.length - 1}
              onMove={(by) => move(index, by)}
              onRemove={() => setOrder(order.filter((item) => item !== id))}
            />
          )
        })}
      </Reorder.Group>
      {!order.length && (
        <div className="am-empty">
          <h2>No projects in the lineup</h2>
          <p>
            Add projects in presentation order, or add them all in code order
            and rearrange.
          </p>
        </div>
      )}
      {remaining.length > 0 && (
        <div className="jd-lineup-add" data-guide="lineup-add">
          <select
            aria-label="Project to add"
            value={adding}
            onChange={(event) => setAdding(event.target.value)}
          >
            <option value="">Add a project…</option>
            {remaining.map((board) => (
              <option key={board.id} value={board.id}>
                {board.code} · {board.title}
              </option>
            ))}
          </select>
          <button
            className="ad-button"
            disabled={!adding}
            onClick={() => {
              setOrder([...order, adding])
              setAdding("")
            }}
          >
            <Plus size={15} aria-hidden /> Add
          </button>
          <button
            className="ad-button"
            onClick={() =>
              setOrder([...order, ...remaining.map((board) => board.id)])
            }
          >
            Add all {remaining.length} remaining
          </button>
        </div>
      )}
      {removedWithReviews.length > 0 && (
        <p className="ad-notice">
          Removing{" "}
          {removedWithReviews
            .map(
              (id) => cohortBoards.find((board) => board.id === id)?.code || id
            )
            .join(", ")}{" "}
          hides it from judges. Feedback already given is kept.
        </p>
      )}
      {error && !confirming && (
        <p className="ad-error" role="alert">
          {error}
        </p>
      )}
      {confirming && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !saving) setConfirming(false)
          }}
        >
          <DialogContent className="ad-modal am-dialog">
            <DialogTitle>Save lineup and open judging?</DialogTitle>
            <OpenJudgingDetails
              judgeCount={judgeCount}
              lineupSize={order.length}
            />
            {error && (
              <p className="ad-error" role="alert">
                {error}
              </p>
            )}
            <div className="ad-modal-actions">
              <button
                className="ad-button"
                disabled={saving}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                className="ad-button ad-primary"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Opening…" : "Save and open judging"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function LineupRow({
  board,
  index,
  last,
  onMove,
  onRemove,
}: {
  board: Board
  index: number
  last: boolean
  onMove: (by: number) => void
  onRemove: () => void
}) {
  const controls = useDragControls()
  const reduceMotion = useReducedMotion()
  return (
    <Reorder.Item
      as="li"
      value={board.id}
      dragListener={false}
      dragControls={controls}
      layout={reduceMotion ? undefined : "position"}
      className="jd-lineup-row"
      whileDrag={{
        scale: 1.01,
        boxShadow: "0 12px 30px rgb(0 0 0 / 0.55)",
        zIndex: 2,
      }}
    >
      <span
        className="jd-drag-handle"
        aria-hidden="true"
        title="Drag to reorder"
        onPointerDown={(event) => {
          event.preventDefault()
          controls.start(event)
        }}
      >
        <GripVertical size={16} />
      </span>
      <span className="jd-position">{index + 1}</span>
      <span className="jd-lineup-project">
        <span className="jd-code">{board.code}</span>
        <span>{board.title}</span>
      </span>
      <span className="jd-lineup-actions">
        <button
          aria-label={`Move ${board.code} up`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowUp size={15} aria-hidden />
        </button>
        <button
          aria-label={`Move ${board.code} down`}
          disabled={last}
          onClick={() => onMove(1)}
        >
          <ArrowDown size={15} aria-hidden />
        </button>
        <button
          aria-label={`Remove ${board.code} from lineup`}
          onClick={onRemove}
        >
          <X size={15} aria-hidden />
        </button>
      </span>
    </Reorder.Item>
  )
}

// Results -------------------------------------------------------------------------------------
function Results({
  year,
  lineup,
  judges,
  allJudges,
  reviews: allReviews,
  judgingOpen,
  feedbackReleased,
  onNotice,
}: {
  year: number
  lineup: Board[]
  judges: CommitteeJudge[]
  allJudges: CommitteeJudge[]
  reviews: CommitteeReview[]
  judgingOpen: boolean
  feedbackReleased: boolean
  onNotice: (text: string) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState<CommitteeReview | null>(null)
  const [unsubmitting, setUnsubmitting] = useState<CommitteeReview | null>(null)
  const [chosenAward, setAward] = useState("main")
  // Special awards with a judge in this cohort, in a fixed order.
  const cohortAwards = specialAwardKeys.filter((award) =>
    allJudges.some(
      (judge) =>
        judge.kind === "special" &&
        judge.specialAward === award &&
        judge.cohortYear === year &&
        !judge.deletedAt
    )
  )
  // Fall back to the main award when the chosen award has no judge here
  // (its judge was deleted, or this cohort never had one).
  const award =
    chosenAward === "all" ||
    chosenAward === "main" ||
    cohortAwards.some((key) => key === chosenAward)
      ? chosenAward
      : "main"
  // "all" is an overview of every judge's scores, with three rankings.
  const overview = award === "all"
  const pool = overview
    ? [...allJudges].sort(
        (a, b) => Number(a.kind === "special") - Number(b.kind === "special")
      )
    : judgesForAward(allJudges, award)
  const reviews = allReviews.filter((review) =>
    pool.some((judge) => judge.id === review.judgeId)
  )
  const results = lineup.map((board) => projectResult(board.id, reviews))
  const ranks = rankResults(results)
  // The overview ranks projects by main judges, by each special award's
  // judges, and by every judge together.
  const rankBy = (include: (judge: CommitteeJudge) => boolean) => {
    const ids = new Set(allJudges.filter(include).map((judge) => judge.id))
    const scoped = allReviews.filter((review) => ids.has(review.judgeId))
    return rankResults(lineup.map((board) => projectResult(board.id, scoped)))
  }
  const overviewRanks = overview
    ? [
        {
          key: "main",
          label: "Main",
          special: false,
          ranks: rankBy((j) => j.kind === "main"),
        },
        ...cohortAwards.map((award) => ({
          key: award,
          label: specialAwards[award],
          special: true,
          ranks: rankBy((j) =>
            judgesForAward(allJudges, award).includes(j)
          ),
        })),
        // In the overview the pool is every judge, so ranks is the all-judges ranking.
        { key: "all", label: "All", special: false, ranks },
      ]
    : []
  const activeJudges = judges.filter(
    (judge) => !judge.revoked && pool.some((item) => item.id === judge.id)
  )
  // Show anyone who has reviewed a lineup project, even if later paused or moved.
  const columns = [
    ...activeJudges,
    ...pool.filter(
      (judge) =>
        !activeJudges.includes(judge) &&
        reviews.some((review) => review.judgeId === judge.id)
    ),
  ].sort((a, b) => Number(a.kind === "special") - Number(b.kind === "special"))

  const hasRemote = columns.some((judge) => !judge.attendsDemoDay)
  const remoteNote = hasRemote
    ? ` Judges not at Demo Day score research only, out of ${maxTotalFor(true)}. A project's average adds the research average from every judge to the presentation average from judges who attended.`
    : ""
  const submitted = reviews.filter((review) => review.submittedAt).length
  const judgeName = (id: string) =>
    allJudges.find((judge) => judge.id === id)?.name || "Unknown judge"

  function download() {
    const csv = feedbackCsv(
      lineup.map((board) => ({
        id: board.id,
        code: board.code,
        title: board.title,
      })),
      allJudges,
      reviews
    )
    const url = URL.createObjectURL(
      new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `myssp-${year}-judging.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (!lineup.length)
    return (
      <div className="am-empty">
        <h2>Set the lineup first</h2>
        <p>Progress and scores appear here once projects are in the lineup.</p>
      </div>
    )
  return (
    <>
      <div className="jd-results-bar" data-guide="results-bar">
        <AdminSelect
          label="Award results"
          value={award}
          onChange={setAward}
          options={[
            { value: "all", label: "All judges (overview)" },
            { value: "main", label: "Main award" },
            ...cohortAwards.map((award) => ({
              value: award,
              label: `Special award · ${specialAwards[award]}`,
            })),
          ]}
        />
        <div className="jd-results-stats">
          <span>
            <strong>{submitted}</strong> of{" "}
            {activeJudges.length * lineup.length} reviews submitted
          </span>
          <span>
            <strong>{reviews.length - submitted}</strong>{" "}
            {reviews.length - submitted === 1 ? "draft" : "drafts"}
          </span>
        </div>
        <button
          className="ad-button jd-export"
          disabled={!reviews.length}
          onClick={download}
        >
          <Download size={15} aria-hidden /> Export CSV
        </button>
      </div>
      <p className="jd-intro jd-results-note">
        {overview
          ? `Every judge's total score out of ${MAX_TOTAL}, for every project. Ranks compare averages from main judges, each special award's judges and all judges. Pick an award to see its averages.${remoteNote}`
          : `Scores are totals out of ${MAX_TOTAL}, from submitted reviews only. Rankings can change until every review is in. Select a project to read its reviews.${remoteNote}`}
      </p>
      <div className="am-table-wrap jd-results-wrap">
        <table className="jd-table">
          <thead>
            <tr className="jd-head-group">
              <th rowSpan={2}>Order</th>
              <th rowSpan={2}>Project</th>
              {columns.length > 0 && (
                <th colSpan={columns.length} className="jd-group-label">
                  Judge scores, out of {MAX_TOTAL}
                </th>
              )}
              {!overview && (
                <th rowSpan={2} className="jd-num jd-center">
                  Average
                  <small>out of {MAX_TOTAL}</small>
                </th>
              )}
              {overview ? (
                <th colSpan={3} className="jd-group-label jd-rank-first">
                  Rank by judges
                </th>
              ) : (
                <th rowSpan={2} className="jd-num jd-center">
                  Rank
                </th>
              )}
            </tr>
            <tr>
              {columns.map((judge) => (
                <th
                  key={judge.id}
                  className="jd-judge-col"
                  title={`${judge.name}${judge.kind === "special" ? ` · ${specialAwardBadge(judge.specialAward)}` : ""}${judge.attendsDemoDay ? "" : ` · Not at Demo Day, research only out of ${maxTotalFor(true)}`} · ${judge.email}`}
                >
                  <span
                    className={
                      judge.kind === "special"
                        ? "jd-judge-head jd-judge-special"
                        : "jd-judge-head"
                    }
                  >
                    {judge.kind === "special" && (
                      <>
                        <Star size={11} aria-hidden />
                        <span className="sr-only">
                          {specialAwardBadge(judge.specialAward)} judge:{" "}
                        </span>
                      </>
                    )}
                    {judge.name.replace(
                      /^((assoc\.?\s+)?prof\.?|dr\.?|mr\.?|ms\.?|mrs\.?)\s+/i,
                      ""
                    )}
                  </span>
                  {!judge.attendsDemoDay && (
                    <small className="jd-judge-remote">
                      Research only · /{maxTotalFor(true)}
                    </small>
                  )}
                </th>
              ))}
              {overviewRanks.map((rank) => (
                <th
                  key={rank.key}
                  className={
                    rank.key === "main"
                      ? "jd-judge-col jd-rank-col jd-rank-first"
                      : "jd-judge-col jd-rank-col"
                  }
                >
                  <span
                    className={
                      rank.special
                        ? "jd-judge-head jd-judge-special"
                        : "jd-judge-head"
                    }
                  >
                    {rank.special && <Star size={11} aria-hidden />}
                    {rank.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineup.map((board, index) => {
              const result = results[index]
              const expanded = open === board.id
              const projectReviews = reviews.filter(
                (review) => review.projectId === board.id
              )
              return (
                <Fragment key={board.id}>
                  <tr
                    className="jd-result-row"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : board.id)}
                  >
                    <td>{index + 1}</td>
                    <td>
                      <div className="jd-project-cell">
                        <button
                          className="jd-expand"
                          aria-expanded={expanded}
                          aria-label={`${expanded ? "Hide" : "Show"} reviews for ${board.code}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            setOpen(expanded ? null : board.id)
                          }}
                        >
                          {expanded ? (
                            <ChevronDown size={14} aria-hidden />
                          ) : (
                            <ChevronRight size={14} aria-hidden />
                          )}
                          <span className="jd-code">{board.code}</span>
                        </button>
                        <span className="jd-title" title={board.title}>
                          {board.title}
                        </span>
                      </div>
                    </td>
                    {columns.map((judge) => {
                      const review = projectReviews.find(
                        (item) => item.judgeId === judge.id
                      )
                      return (
                        <td key={judge.id} className="jd-judge-col">
                          <ScoreCell review={review} judge={judge.name} />
                        </td>
                      )
                    })}
                    {!overview && (
                      <td className="jd-num jd-center jd-average">
                        {result.averageTotal?.toFixed(1) ?? "–"}
                        {result.averageTotal !== null &&
                          result.maxTotal !== MAX_TOTAL && (
                            <small
                              className="jd-partial"
                              title="Only research-only reviews are in so far"
                            >
                              /{result.maxTotal}
                            </small>
                          )}
                      </td>
                    )}
                    {overview ? (
                      overviewRanks.map((rank) => (
                        <td
                          key={rank.key}
                          className={
                            rank.key === "main"
                              ? "jd-num jd-center jd-rank-first"
                              : "jd-num jd-center"
                          }
                        >
                          {rank.ranks.get(board.id) ?? "–"}
                        </td>
                      ))
                    ) : (
                      <td className="jd-num jd-center">
                        {ranks.get(board.id) ?? "–"}
                      </td>
                    )}
                  </tr>
                  {expanded && (
                    <tr className="jd-detail-row">
                      <td colSpan={columns.length + (overview ? 5 : 4)}>
                        {projectReviews.length ? (
                          <ProjectReviewDetail
                            reviews={projectReviews}
                            judgeOf={(id) =>
                              allJudges.find((judge) => judge.id === id)
                            }
                            feedbackReleased={feedbackReleased}
                            onUnsubmit={setUnsubmitting}
                            onDiscard={setDiscarding}
                          />
                        ) : (
                          <p className="jd-muted jd-detail">
                            No reviews for this project yet.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {discarding && (
        <DiscardDialog
          review={discarding}
          judge={judgeName(discarding.judgeId)}
          project={
            lineup.find((board) => board.id === discarding.projectId)?.code ||
            ""
          }
          onClose={() => setDiscarding(null)}
          onDone={() => {
            onNotice("Review discarded.")
            setDiscarding(null)
          }}
        />
      )}
      {unsubmitting && (
        <UnsubmitDialog
          review={unsubmitting}
          judge={judgeName(unsubmitting.judgeId)}
          project={
            lineup.find((board) => board.id === unsubmitting.projectId)?.code ||
            ""
          }
          judgingOpen={judgingOpen}
          onClose={() => setUnsubmitting(null)}
          onDone={() => {
            onNotice(
              `${judgeName(unsubmitting.judgeId)}'s review is a draft again and no longer counts until it is resubmitted.`
            )
            setUnsubmitting(null)
          }}
        />
      )}
    </>
  )
}

/** One judge's total for one project: a number once submitted, otherwise its status. */
type GuideProgress = {
  judges: number
  uninvited: number
  lineup: number
  submitted: number
  judgingOpen: boolean
  feedbackReleased: boolean
}

type GuideStep = {
  phase: string
  title: string
  text: string
  section?: Section
  // Highlight the first of these that is on the page.
  targets: (progress: GuideProgress) => string[]
  done: (progress: GuideProgress) => boolean
}

const guideSteps: GuideStep[] = [
  {
    phase: "Before the event",
    title: "Add judges",
    text: "Add your judges, then send each one their access code to sign in.",
    section: "judges",
    targets: (progress) =>
      progress.judges ? ["access-codes", "judges-table"] : ["add-judge"],
    done: (progress) => progress.judges > 0 && progress.uninvited === 0,
  },
  {
    phase: "Before the event",
    title: "Set up the lineup",
    text: "Add your projects, then drag and drop them into the order they’ll present.",
    section: "lineup",
    targets: () => ["lineup-add", "lineup"],
    done: (progress) => progress.lineup > 0,
  },
  {
    phase: "On demo day",
    title: "Open judging",
    text: "Save your lineup, or switch on Judging to let judges start scoring.",
    targets: () => ["judging-switch"],
    done: (progress) =>
      progress.judgingOpen ||
      progress.submitted > 0 ||
      progress.feedbackReleased,
  },
  {
    phase: "After demo day",
    title: "Look at the results",
    text: "Check each project’s average score and ranking here.",
    section: "results",
    targets: () => ["results-bar"],
    done: (progress) => progress.feedbackReleased,
  },
  {
    phase: "When you're ready",
    title: "Release feedback",
    text: "Once all the scores are in, turn on Feedback so teams (participants & mentors) can read their reviews.",
    targets: () => ["feedback-switch"],
    done: (progress) => progress.feedbackReleased,
  },
]

function spotlight(targets: string[]) {
  const element = targets
    .map((target) => document.querySelector(`[data-guide="${target}"]`))
    .find(Boolean)
  if (!(element instanceof HTMLElement)) return
  element.scrollIntoView({ behavior: "smooth", block: "center" })
  element.classList.remove("jd-spotlight")
  // Restart the animation when the same target is shown twice in a row.
  void element.offsetWidth
  element.classList.add("jd-spotlight")
  window.setTimeout(() => element.classList.remove("jd-spotlight"), 2600)
}

function JudgingSteps({
  progress,
  onSection,
}: {
  progress: GuideProgress
  onSection: (section: Section) => void
}) {
  const [hidden, setHiddenState] = useState(() => {
    try {
      return localStorage.getItem("myssp-judging-steps") === "hidden"
    } catch {
      return false
    }
  })
  const setHidden = (value: boolean) => {
    setHiddenState(value)
    try {
      localStorage.setItem("myssp-judging-steps", value ? "hidden" : "shown")
    } catch {
      // Remembering this is only a convenience.
    }
  }
  const doneSteps = guideSteps.map((step) => step.done(progress))
  const nextIndex = doneSteps.indexOf(false)
  // A new object per click, so clicking the same step again re-runs the effect.
  const [pending, setPending] = useState<{ targets: string[] } | null>(null)
  // Runs after the commit that switched tabs, so the target is on the page.
  useEffect(() => {
    if (pending) spotlight(pending.targets)
  }, [pending])

  const go = (step: GuideStep) => {
    if (step.section) onSection(step.section)
    setPending({ targets: step.targets(progress) })
  }

  return (
    <section className="jd-steps" aria-labelledby="judging-steps-title">
      <header>
        <h3 id="judging-steps-title">How to run judging</h3>
        <button
          className="jd-steps-toggle"
          aria-expanded={!hidden}
          aria-controls="judging-steps-list"
          onClick={() => setHidden(!hidden)}
        >
          {hidden ? "Show steps" : "Hide steps"}
          <ChevronDown size={14} aria-hidden />
        </button>
      </header>
      {!hidden && (
        <ol id="judging-steps-list">
          {guideSteps.map((step, index) => {
            const done = doneSteps[index]
            const next = index === nextIndex
            return (
              <li key={step.title}>
                <button
                  className={
                    done
                      ? "jd-step jd-step-done"
                      : next
                        ? "jd-step jd-step-next"
                        : "jd-step"
                  }
                  aria-current={next ? "step" : undefined}
                  onClick={() => go(step)}
                >
                  <span className="jd-step-top">
                    <span className="jd-step-mark" aria-hidden>
                      {done ? <Check size={13} /> : index + 1}
                    </span>
                    <span className="jd-step-phase">
                      {done ? "Done" : next ? "Up next" : step.phase}
                    </span>
                  </span>
                  <strong>{step.title}</strong>
                  <span className="jd-step-text">{step.text}</span>
                  <span className="jd-step-go">
                    Go there <ChevronRight size={13} aria-hidden />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function ScoreCell({
  review,
  judge,
}: {
  review?: CommitteeReview
  judge: string
}) {
  const total = review?.submittedAt ? reviewTotal(review) : null
  const label = !review
    ? "Not started"
    : review.submittedAt
      ? `Submitted, ${total ?? "–"} out of ${reviewMax(review)}${review.researchOnly ? ", research only" : ""}`
      : "Draft, not counted yet"
  return (
    <span
      className={`jd-score ${!review ? "jd-score-empty" : review.submittedAt ? "" : "jd-score-draft"}`}
      title={`${judge}: ${label}`}
    >
      <span aria-hidden>
        {!review ? "–" : review.submittedAt ? (total ?? "–") : "Draft"}
        {review?.submittedAt && review.researchOnly && (
          <small className="jd-partial">/{reviewMax(review)}</small>
        )}
      </span>
      <span className="sr-only">
        {judge}: {label}
      </span>
    </span>
  )
}

/** One project's reviews: a card per judge with their ratings, comments and actions. */
function ProjectReviewDetail({
  reviews,
  judgeOf,
  feedbackReleased,
  onUnsubmit,
  onDiscard,
}: {
  reviews: CommitteeReview[]
  judgeOf: (id: string) => CommitteeJudge | undefined
  feedbackReleased: boolean
  onUnsubmit: (review: CommitteeReview) => void
  onDiscard: (review: CommitteeReview) => void
}) {
  return (
    <div className="jd-detail">
      {reviews.map((review) => {
        const judge = judgeOf(review.judgeId)
        const total = reviewTotal(review)
        return (
          <article key={review.judgeId} className="jd-review-card">
            <header className="jd-review-card-head">
              <div className="jd-review-card-who">
                <strong>{judge?.name || "Unknown judge"}</strong>
                {judge?.kind === "special" && (
                  <span className="jd-kind">
                    {specialAwardBadge(judge.specialAward)}
                  </span>
                )}
                {review.researchOnly && (
                  <span
                    className="jd-kind jd-kind-remote"
                    title="Research only: no presentation scores"
                  >
                    Not at Demo Day
                  </span>
                )}
                <span
                  className={`jd-pill ${review.submittedAt ? "jd-pill-success" : "jd-pill-default"}`}
                >
                  <i aria-hidden />
                  {review.submittedAt ? "Submitted" : "Draft, not counted"}
                </span>
              </div>
              <div className="jd-review-card-total">
                <span>Total</span>
                <strong>
                  {total ?? "–"}
                  <small>/{reviewMax(review)}</small>
                </strong>
              </div>
            </header>
            <div
              className={`jd-review-card-sections${review.researchOnly ? "is-single" : ""}`}
            >
              {sectionsFor(review.researchOnly).map((section) => {
                const keys = section.criteria.map((criterion) => criterion.key)
                const scores = keys.map((key) => review[key])
                const subtotal = scores.every((score) => score !== null)
                  ? (scores as number[]).reduce((a, b) => a + b, 0)
                  : null
                const remarks =
                  section.part === "research"
                    ? review.researchRemarks
                    : review.presentationRemarks
                return (
                  <section key={section.title} className="jd-review-section">
                    <div className="jd-review-section-head">
                      <h4>{section.title}</h4>
                      <span>
                        {subtotal ?? "–"}
                        <small>/{keys.length * SCORE_MAX}</small>
                      </span>
                    </div>
                    <dl className="jd-review-ratings">
                      {section.criteria.map((criterion) => (
                        <div key={criterion.key}>
                          <dt>{criterion.label}</dt>
                          <dd>
                            {review[criterion.key] ?? "–"}
                            <small>/{SCORE_MAX}</small>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="jd-review-comment">
                      <span>Comments</span>
                      <p>{remarks.trim() || "No comments yet."}</p>
                    </div>
                  </section>
                )
              })}
            </div>
            <footer className="jd-review-card-actions">
              {review.submittedAt && (
                <button
                  className="ad-button"
                  disabled={feedbackReleased}
                  title={
                    feedbackReleased
                      ? "Hide feedback from teams first"
                      : "Let the judge change and resubmit this review"
                  }
                  onClick={() => onUnsubmit(review)}
                >
                  <RotateCcw size={14} aria-hidden /> Return to draft
                </button>
              )}
              <button
                className="ad-button am-destructive"
                onClick={() => onDiscard(review)}
              >
                <Trash2 size={14} aria-hidden /> Discard
              </button>
            </footer>
          </article>
        )
      })}
    </div>
  )
}

function UnsubmitDialog({
  review,
  judge,
  project,
  judgingOpen,
  onClose,
  onDone,
}: {
  review: CommitteeReview
  judge: string
  project: string
  judgingOpen: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function submit() {
    setBusy(true)
    setError("")
    try {
      await unsubmitReview(review.judgeId, review.projectId)
      onDone()
    } catch (cause) {
      setError(errorText(cause, "Could not return this review to draft."))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !busy) onClose()
      }}
    >
      <DialogContent className="ad-modal am-dialog">
        <DialogTitle>Return this review to draft?</DialogTitle>
        <DialogDescription>
          {judge}’s review for {project} becomes a draft again, so they can
          change it and submit it again. Their scores and comments are kept. It
          won’t count in the results until it’s resubmitted.
        </DialogDescription>
        <p className="am-email-notice">
          {judgingOpen
            ? "Let the judge know so they can resubmit. Closing judging submits it again automatically if it is still complete."
            : "Judging is closed, so the judge can only edit it after you reopen judging. Closing judging again submits it automatically if it is still complete."}
        </p>
        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}
        <div className="ad-modal-actions">
          <button className="ad-button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className="ad-button ad-primary"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Returning…" : "Return to draft"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DiscardDialog({
  review,
  judge,
  project,
  onClose,
  onDone,
}: {
  review: CommitteeReview
  judge: string
  project: string
  onClose: () => void
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function submit() {
    setBusy(true)
    setError("")
    try {
      await discardReview(review.judgeId, review.projectId)
      onDone()
    } catch (cause) {
      setError(errorText(cause, "Could not discard this review."))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !busy) onClose()
      }}
    >
      <DialogContent className="ad-modal am-dialog">
        <DialogTitle>Discard this review?</DialogTitle>
        <DialogDescription>
          Permanently deletes {judge}’s{" "}
          {review.submittedAt ? "submitted review" : "draft"} for {project},
          including the remark. This can’t be undone. Use it for test or
          mistaken reviews.
        </DialogDescription>
        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}
        <div className="ad-modal-actions">
          <button className="ad-button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className="ad-button am-destructive"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Discarding…" : "Discard review"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
