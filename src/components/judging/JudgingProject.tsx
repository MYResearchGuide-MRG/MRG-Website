import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, LoaderCircle, TriangleAlert } from "lucide-react"
import { OverviewContent } from "../projectboard/OverviewEditor"
import { ProjectMaterials } from "../projectboard/ProjectMaterials"
import { teamProfiles, type Board, type Draft } from "../projectboard/data"
import { linkService, materialSpecs, webUrl } from "../projectboard/materials"
import {
  emptyAnswers, judgingSections, missingAnswers, REMARKS_MAX, remarksHint, remarksLabel,
  scoreKeys, SCORE_MAX, SCORE_MIN, type FeedbackAnswers, type ScoreKey,
} from "./form"
import { getJudgeAccess, reviewStatus, saveReview, useJudgeAccess, type JudgeReview } from "./judge-access"
import { judgingHash, judgingProjectHash, useLineupBoards, useProjectContent } from "./lineup"
import StatusBadge from "./StatusBadge"
import FeedbackLiveNotice from "./FeedbackLiveNotice"
import "../projectboard/projectboard.css"
import "./judging.css"

const AUTOSAVE_MS = 1200
const scores = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i)
const fieldId = (key: ScoreKey | "remarks") => `judge-field-${key}`

function answersOf(review: JudgeReview | undefined): FeedbackAnswers {
  if (!review) return emptyAnswers()
  return { ...(Object.fromEntries(scoreKeys.map(key => [key, review[key]])) as Record<ScoreKey, number | null>), remarks: review.remarks }
}
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" })

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "error"; message: string }

export default function JudgingProject({ projectId }: { projectId: string }) {
  const { reviews, judgingOpen, feedbackReleased } = useJudgeAccess()
  const boards = useLineupBoards()
  const index = boards.findIndex(board => board.id === projectId)
  const board = boards[index]
  const content = useProjectContent(board)
  const saved = reviews[projectId]
  const submitted = Boolean(saved?.submittedAt)

  const [answers, setAnswers] = useState(() => answersOf(saved))
  const [saveState, setSaveState] = useState<SaveState>(() => saved ? { kind: "saved", at: saved.updatedAt } : { kind: "idle" })
  const [showMissing, setShowMissing] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const answersRef = useRef(answers)
  const dirty = useRef(false)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const timer = useRef<number | undefined>(undefined)

  // Saves run one at a time, in order, each with the newest answers.
  const persist = useCallback((submit: boolean) => {
    const run = async () => {
      const snapshot = answersRef.current
      if (!submit && !dirty.current) return true
      if (getJudgeAccess().reviews[projectId]?.submittedAt && missingAnswers(snapshot).length) {
        setSaveState({ kind: "error", message: "Submitted reviews must stay complete. Fill in every field to save this change." })
        return false
      }
      setSaveState({ kind: "saving" })
      try {
        const review = await saveReview(projectId, snapshot, submit)
        if (answersRef.current === snapshot) dirty.current = false
        setSaveState({ kind: "saved", at: review.updatedAt })
        return true
      } catch (error) {
        setSaveState({ kind: "error", message: error instanceof Error ? error.message : "Could not save." })
        return false
      }
    }
    const next = queue.current.then(run, run)
    queue.current = next
    return next
  }, [projectId])

  function change(next: FeedbackAnswers) {
    answersRef.current = next
    dirty.current = true
    setAnswers(next)
    setJustSubmitted(false)
    window.clearTimeout(timer.current)
    if (judgingOpen) timer.current = window.setTimeout(() => void persist(false), AUTOSAVE_MS)
  }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) event.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => { window.removeEventListener("beforeunload", warn); window.clearTimeout(timer.current) }
  }, [])

  async function go(hash: string) {
    window.clearTimeout(timer.current)
    if (dirty.current && judgingOpen && !(await persist(false))
      && !window.confirm("Your latest changes could not be saved. Leave this project anyway?")) return
    dirty.current = false
    window.location.hash = hash
  }

  async function submit() {
    const missing = missingAnswers(answers)
    if (missing.length) {
      setShowMissing(true)
      const first = scoreKeys.find(key => answers[key] === null)
      document.getElementById(fieldId(first ?? "remarks"))?.focus()
      return
    }
    window.clearTimeout(timer.current)
    if (await persist(true)) setJustSubmitted(true)
  }

  if (!board) return <main className="mx-auto min-h-[70svh] max-w-xl px-6 pt-40 text-center">
    <h1 className="text-2xl font-medium">This project isn’t in your lineup</h1>
    <p className="mt-3 text-sm text-zinc-400">The committee may have changed the presentation order.</p>
    <a href={judgingHash} className="mt-7 inline-flex items-center gap-2 rounded-md border border-white/25 px-4 py-2.5 text-sm hover:border-white/60"><ArrowLeft size={16} aria-hidden /> Back to lineup</a>
  </main>

  const previous = boards[index - 1]
  const next = boards[index + 1]
  const missing = showMissing ? new Set(missingAnswers(answers)) : new Set<string>()
  const status = reviewStatus(saved)

  return <main className="judge-page mx-auto w-full max-w-[860px] px-5 pb-28 pt-28 sm:px-8 sm:pt-32">
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 text-sm" aria-label="Lineup navigation">
      <a href={judgingHash} onClick={event => { event.preventDefault(); void go(judgingHash) }} className="inline-flex items-center gap-2 text-zinc-300 hover:text-white"><ArrowLeft size={16} aria-hidden /> Lineup</a>
      <span className="tabular-nums text-zinc-400">Project {index + 1} of {boards.length}</span>
      <span className="flex gap-2">
        <NavButton board={previous} label="Previous" onGo={go} />
        <NavButton board={next} label="Next" onGo={go} forward />
      </span>
    </nav>

    <ProjectSummary board={board} content={content} status={status} />

    <section aria-labelledby="judge-form-heading" className="mt-12 border-t border-white/15 pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="judge-form-heading" className="text-2xl font-medium tracking-tight">Your feedback</h2>
        <SaveStatus state={saveState} open={judgingOpen} />
      </div>
      {feedbackReleased && <FeedbackLiveNotice judgingOpen={judgingOpen} />}
      {!judgingOpen && <p className="mt-4 rounded-md border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
        {saved ? "Judging is closed. Your saved answers are shown below." : "The form unlocks when the committee opens judging on Demo Day."}
      </p>}
      {submitted && judgingOpen && <p className="mt-4 text-sm text-zinc-400">Submitted. You can still change your answers while judging is open; changes save automatically.</p>}

      <fieldset disabled={!judgingOpen} className="mt-8 space-y-12 disabled:opacity-60">
        {judgingSections.map((section, sectionIndex) => <section key={section.title} aria-labelledby={`judge-section-${sectionIndex}`}>
          <h3 id={`judge-section-${sectionIndex}`} className="text-lg font-medium">Section {sectionIndex + 1}: {section.title}</h3>
          <p className="mt-2 max-w-[680px] text-sm leading-relaxed text-zinc-400">{section.description}</p>
          <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
            {section.criteria.map(criterion => {
              const value = answers[criterion.key]
              const invalid = missing.has(criterion.label)
              return <fieldset key={criterion.key} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6" aria-invalid={invalid || undefined}>
                <legend className="contents"><span className="text-[15px] font-medium">{criterion.label}{invalid && <span className="ml-2 text-xs font-normal text-red-300">Required</span>}</span></legend>
                <div className="judge-scale" role="radiogroup" aria-label={criterion.label}>
                  {scores.map(score => <label key={score} className="judge-score">
                    <input type="radio" name={criterion.key} value={score} checked={value === score}
                      id={score === SCORE_MIN ? fieldId(criterion.key) : undefined}
                      onChange={() => change({ ...answersRef.current, [criterion.key]: score })} />
                    <span>{score}</span>
                  </label>)}
                </div>
              </fieldset>
            })}
          </div>
        </section>)}

        <section>
          <label htmlFor={fieldId("remarks")} className="block text-lg font-medium">
            {remarksLabel}{missing.has(remarksLabel) && <span className="ml-2 text-xs font-normal text-red-300">Required</span>}
          </label>
          <p className="mt-2 text-sm text-zinc-400">{remarksHint}</p>
          <textarea id={fieldId("remarks")} value={answers.remarks} maxLength={REMARKS_MAX} rows={7}
            onChange={event => change({ ...answersRef.current, remarks: event.target.value })}
            className="mt-4 w-full resize-y rounded-md border border-white/20 bg-black/40 px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-zinc-600 focus:border-white/60"
            placeholder="What went well, what could be improved…" />
          <p className="mt-1 text-right text-xs tabular-nums text-zinc-500">{answers.remarks.length.toLocaleString()} / {REMARKS_MAX.toLocaleString()}</p>
        </section>
      </fieldset>

      {showMissing && missing.size > 0 && <p role="alert" className="mt-6 flex items-start gap-2 text-sm text-red-300">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />Still needed: {[...missing].join(", ")}.
      </p>}

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
        {judgingOpen && !submitted && <button onClick={() => void submit()} disabled={saveState.kind === "saving"}
          className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-60">
          Submit review <Check size={16} aria-hidden />
        </button>}
        {(submitted || !judgingOpen) && next && <button onClick={() => void go(judgingProjectHash(next.id))}
          className={`inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-medium ${justSubmitted || submitted ? "bg-white text-black hover:bg-zinc-200" : "border border-white/25 hover:border-white/60"}`}>
          Next: {next.code} <ArrowRight size={16} aria-hidden />
        </button>}
        {(submitted || !judgingOpen) && !next && <button onClick={() => void go(judgingHash)} className="inline-flex items-center gap-2 rounded-md border border-white/25 px-5 py-3 text-sm hover:border-white/60">Back to lineup</button>}
        {justSubmitted && <span className="text-sm text-emerald-300" role="status">Review submitted.</span>}
      </div>
    </section>
  </main>
}

function NavButton({ board, label, onGo, forward }: { board?: Board; label: string; onGo: (hash: string) => void; forward?: boolean }) {
  const Icon = forward ? ArrowRight : ArrowLeft
  return <button disabled={!board} onClick={() => board && onGo(judgingProjectHash(board.id))}
    aria-label={board ? `${label} project: ${board.code}` : `No ${label.toLowerCase()} project`}
    className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 hover:border-white/50 disabled:opacity-35 disabled:hover:border-white/20">
    {!forward && <Icon size={15} aria-hidden />}{board ? board.code : label}{forward && <Icon size={15} aria-hidden />}
  </button>
}

function SaveStatus({ state, open }: { state: SaveState; open: boolean }) {
  if (!open) return null
  if (state.kind === "saving") return <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400" role="status"><LoaderCircle size={14} className="animate-spin" aria-hidden />Saving…</span>
  if (state.kind === "saved") return <span className="text-sm text-zinc-400" role="status">Saved {time(state.at)}</span>
  if (state.kind === "error") return <span className="text-sm text-red-300" role="alert">{state.message}</span>
  return <span className="text-sm text-zinc-500">Answers save automatically</span>
}

function ProjectSummary({ board, content, status }: { board: Board; content?: Draft; status: ReturnType<typeof reviewStatus> }) {
  const team = content?.teamMembers || teamProfiles(board)
  const links = (content?.additionalMaterials || []).filter(link => webUrl(link.url))
  return <article className="pt-8">
    <header>
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
        <span className="rounded border border-white/20 px-2 py-0.5 text-sm text-zinc-100">{board.code}</span>
        <span>{board.track}</span>
        <StatusBadge status={status} />
      </div>
      <h1 className="mt-4 text-3xl font-medium leading-tight tracking-tight sm:text-[2.5rem]">{content?.title || board.title}</h1>
      <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Students</dt>
          <dd><ul className="space-y-1">{team.length ? team.map(person => <li key={person.id}><span className="font-medium">{person.name}</span>{person.school && <span className="text-zinc-400">, {person.school}</span>}</li>) : <li className="text-zinc-400">Team to be confirmed</li>}</ul></dd>
        </div>
        <div>
          <dt className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Mentor</dt>
          <dd><span className="font-medium">{board.mentor}</span>{board.affiliation && <span className="block text-zinc-400">{board.affiliation}</span>}</dd>
        </div>
      </dl>
    </header>

    <section aria-label="Submitted materials" className="mt-9">
      <h2 className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Materials</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {materialSpecs.map(spec => {
          const url = webUrl(content?.[spec.key] || "")
          const body = <><span className="block text-sm font-medium">{spec.title}</span><span className="mt-0.5 block text-xs text-zinc-400">{url ? spec.provider : "Not submitted"}</span></>
          return url
            ? <a key={spec.key} href={url.href} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-3 rounded-md border border-white/20 px-4 py-3.5 hover:border-white/60 hover:bg-white/[0.04]"><span>{body}</span><ArrowUpRight size={17} className="mt-0.5 shrink-0 text-zinc-400 group-hover:text-white" aria-hidden /></a>
            : <div key={spec.key} className="rounded-md border border-dashed border-white/15 px-4 py-3.5 text-zinc-500">{body}</div>
        })}
      </div>
      {links.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{links.map(link => <li key={link.id}>
        <a href={webUrl(link.url)!.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs hover:border-white/60">
          {link.name || linkService(link.url).label}<ArrowUpRight size={13} aria-hidden />
        </a>
      </li>)}</ul>}
    </section>

    <div className="pb-root judge-embed mt-9">
      <section>
        <h2 className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Abstract</h2>
        <OverviewContent text={content?.summary || board.description} />
      </section>
      {content?.question && <section className="mt-6">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Research question</h2>
        <OverviewContent text={content.question} />
      </section>}
      <details className="judge-details mt-6">
        <summary>Research approach and findings <ChevronDown size={16} aria-hidden /></summary>
        <div className="space-y-6 pt-4">
          <section><h3 className="mb-2 text-sm font-medium">Research approach</h3><OverviewContent text={content?.method || board.tasks.map(task => `- ${task}`).join("\n")} /></section>
          <section><h3 className="mb-2 text-sm font-medium">Findings</h3>{content?.findings ? <OverviewContent text={content.findings} /> : <p className="text-sm text-zinc-500">The team has not added findings.</p>}</section>
        </div>
      </details>
      <details className="judge-details mt-3">
        <summary>Preview slides, write-up and video here <ChevronDown size={16} aria-hidden /></summary>
        <div className="pt-4"><ProjectMaterials content={content} editing={false} onChange={() => {}} onLinksChange={() => {}} /></div>
      </details>
    </div>
  </article>
}
