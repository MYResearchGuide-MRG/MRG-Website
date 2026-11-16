import { useSyncExternalStore } from "react"
import { ArrowRight, LockKeyhole } from "lucide-react"
import FeedbackLiveNotice from "./FeedbackLiveNotice"
import { useBackend } from "../admin/backend"
import { teamProfiles, type Board } from "../projectboard/data"
import { reviewStatus, useJudgeAccess } from "./judge-access"
import { judgingProjectHash, useLineupBoards, useProjectContent } from "./lineup"
import StatusBadge from "./StatusBadge"
import JudgingProject from "./JudgingProject"

function subscribe(fn: () => void) {
  window.addEventListener("hashchange", fn)
  return () => window.removeEventListener("hashchange", fn)
}
function useJudgingProjectId() {
  return useSyncExternalStore(subscribe, () =>
    /^#\/judging\/([a-z0-9-]{1,100})$/.exec(window.location.hash)?.[1] ?? null)
}

export default function JudgeWorkspace({ onSignIn }: { onSignIn: () => void }) {
  const access = useJudgeAccess()
  const projectId = useJudgingProjectId()
  if (!access.ready) return <main className="container min-h-[70svh] pt-32" role="status">Loading judging…</main>
  if (!access.judge) return <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-6 pt-24 text-center">
    <LockKeyhole size={28} className="mb-5 text-zinc-500" aria-hidden />
    <h1 className="text-3xl font-semibold tracking-tight">Judge access</h1>
    <p className="mt-3 text-sm text-zinc-400">Sign in with the judge access code sent by the committee to see the Demo Day lineup.</p>
    {access.error && <p className="mt-3 text-sm text-red-300" role="alert">{access.error}</p>}
    <button onClick={onSignIn} className="mt-7 rounded-md bg-white px-5 py-3 text-sm font-medium text-black hover:bg-zinc-200">Sign in as judge</button>
  </main>
  if (projectId) return <JudgingProject key={projectId} projectId={projectId} />
  return <Lineup />
}

function Lineup() {
  const { judge, reviews, judgingOpen, feedbackReleased, error } = useJudgeAccess()
  const boards = useLineupBoards()
  const backend = useBackend()
  const submitted = boards.filter(board => reviewStatus(reviews[board.id]) === "submitted").length
  const next = boards.find(board => reviewStatus(reviews[board.id]) !== "submitted")
  const nextIndex = next ? boards.indexOf(next) : -1
  return <main className="mx-auto min-h-[72svh] w-full max-w-[960px] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
    <header className="border-b border-white/15 pb-8">
      <p className="mb-3 text-sm text-zinc-400">Demo Day judging</p>
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Presentation lineup</h1>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="font-medium">{judge?.name}</span>
        {judge?.affiliation && <span className="text-zinc-500">{judge.affiliation}</span>}
        <span className={judgingOpen ? "text-emerald-300" : "text-zinc-400"}>{judgingOpen ? "Judging is open" : feedbackReleased ? "Judging is closed" : "Judging is not open yet"}</span>
      </div>
      {feedbackReleased && <FeedbackLiveNotice judgingOpen={judgingOpen} />}
      {!judgingOpen && !feedbackReleased && <p className="mt-3 max-w-2xl text-sm text-zinc-400">You can look through the projects now. The feedback form unlocks when the committee opens judging on Demo Day.</p>}
      {(error || backend.error) && <p className="mt-3 text-sm text-red-300" role="alert">{error || backend.error} Showing the last loaded lineup.</p>}
    </header>

    {boards.length > 0 && <section className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 py-7" aria-label="Progress">
      <div>
        <p className="text-sm text-zinc-400">Reviews submitted</p>
        <p className="mt-1 text-2xl font-medium tabular-nums">{submitted} <span className="text-zinc-500">/ {boards.length}</span></p>
      </div>
      {next ? <a href={judgingProjectHash(next.id)} className="inline-flex items-center gap-3 rounded-md bg-white px-5 py-3 text-sm font-medium text-black hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <span>Next up: <span className="tabular-nums">{nextIndex + 1}.</span> {next.code}</span><ArrowRight size={16} aria-hidden />
      </a> : <p className="text-sm text-emerald-300">All reviews submitted. Thank you!</p>}
    </section>}

    {boards.length ? <ol className="divide-y divide-white/10">{boards.map((board, index) => <LineupRow key={board.id} board={board} index={index} />)}</ol>
      : <div className="py-16 text-center"><h2 className="text-lg font-medium">The lineup isn’t ready yet</h2><p className="mt-2 text-sm text-zinc-400">The committee will publish the presentation order before Demo Day. Check back soon.</p></div>}
  </main>
}

function LineupRow({ board, index }: { board: Board; index: number }) {
  const { reviews } = useJudgeAccess()
  const content = useProjectContent(board)
  const team = content?.teamMembers || teamProfiles(board)
  return <li>
    <a href={judgingProjectHash(board.id)} className="group grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 py-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center">
      <span className="pt-0.5 text-lg font-medium tabular-nums text-zinc-500">{index + 1}</span>
      <span className="min-w-0">
        <span className="mb-1.5 flex items-center gap-3 text-xs text-zinc-400"><span className="rounded border border-white/20 px-2 py-0.5 text-zinc-200">{board.code}</span><span>{board.track}</span></span>
        <span className="block text-lg font-medium leading-snug tracking-tight group-hover:underline">{content?.title || board.title}</span>
        <span className="mt-1 block text-sm text-zinc-400">{team.map(person => person.name).join(", ") || "Team to be confirmed"}</span>
      </span>
      <span className="col-start-2 sm:col-start-auto"><StatusBadge status={reviewStatus(reviews[board.id])} /></span>
    </a>
  </li>
}
