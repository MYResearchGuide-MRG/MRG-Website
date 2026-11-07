import { ArrowUpRight, BookOpen, LockKeyhole, UsersRound } from "lucide-react"
import { useBackend, useLiveBackend } from "../admin/backend"
import { useMentorAccess } from "../admin/mentor-access"
import { useProjectBoards } from "../admin/project-registry"
import { loadDraft, teamProfiles } from "../projectboard/data"
import { boardUrl } from "../projectboard/paths"

export default function MentorDashboard({ onSignIn }: { onSignIn: () => void }) {
  const { current: mentor } = useMentorAccess()
  const boards = useProjectBoards()
  const backend = useBackend()
  if (!mentor) return <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-6 pt-24 text-center">
    <LockKeyhole size={28} className="mb-5 text-zinc-500" aria-hidden />
    <h1 className="text-3xl font-semibold tracking-tight">Mentor access</h1>
    <p className="mt-3 text-sm text-zinc-400">Sign in with the mentor code sent by the committee to review your projects.</p>
    <button onClick={onSignIn} className="mt-7 rounded-md bg-white px-5 py-3 text-sm font-medium text-black hover:bg-zinc-200">Sign in as mentor</button>
  </main>

  const assigned = boards.filter(board => mentor.projectIds.includes(board.id)).sort((a,b) => b.year - a.year || a.code.localeCompare(b.code, undefined, {numeric:true}))
  return <main className="mx-auto min-h-[72svh] w-full max-w-[1120px] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
    <header className="border-b border-white/15 pb-9">
      <p className="mb-3 text-sm text-zinc-400">Mentor workspace</p>
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Your projects</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">Review your teams’ project pages and submitted materials. Your access is read-only.</p>
      <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-2 text-sm"><span className="font-medium">{mentor.name}</span><span className="text-zinc-400">{mentor.email}</span>{mentor.affiliation && <span className="text-zinc-500">{mentor.affiliation}</span>}</div>
    </header>
    <div className="flex items-end justify-between gap-4 border-b border-white/10 py-6"><h2 className="text-lg font-medium">Assigned projects</h2><span className="text-sm tabular-nums text-zinc-500">{assigned.length}</span></div>
    {assigned.length ? <div className="divide-y divide-white/10">{assigned.map(board => {
      const draft = useLiveBackend ? backend.drafts[board.id] : loadDraft(board)
      const team = draft?.teamMembers || teamProfiles(board)
      const completed = [draft?.video,draft?.slides,draft?.paper].filter(Boolean).length
      return <article key={board.id} className="grid gap-6 py-7 md:grid-cols-[minmax(0,1fr)_250px] md:gap-10">
        <div className="min-w-0"><div className="mb-3 flex items-center gap-3 text-xs text-zinc-400"><span className="rounded border border-white/20 px-2 py-1 text-zinc-200">{board.code}</span><span>MYSSP {board.year}</span><span>{board.track}</span></div>
          <h3 className="max-w-[650px] text-xl font-medium leading-snug tracking-tight sm:text-2xl">{draft?.title || board.title}</h3>
          <p className="mt-3 text-sm text-zinc-400">{team.length ? team.map(person => person.name).join(", ") : "No students assigned yet"}</p>
          <a href={boardUrl(board.id)} className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/25 px-4 py-2.5 text-sm transition-colors hover:border-white/60 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Review project page <ArrowUpRight size={16} aria-hidden /></a>
        </div>
        <dl className="grid content-start gap-4 border-t border-white/10 pt-5 text-sm md:border-l md:border-t-0 md:pl-7 md:pt-0">
          <div className="flex items-center gap-3"><UsersRound size={17} className="text-zinc-500" aria-hidden /><dt className="text-zinc-400">Student team</dt><dd className="ml-auto font-medium tabular-nums">{team.length}</dd></div>
          <div className="flex items-center gap-3"><BookOpen size={17} className="text-zinc-500" aria-hidden /><dt className="text-zinc-400">Materials linked</dt><dd className="ml-auto font-medium tabular-nums">{completed}/3</dd></div>
          <div className="border-t border-white/10 pt-4 text-xs text-zinc-500">{draft?.savedAt ? `Last saved ${new Date(draft.savedAt).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}` : "Project page not submitted yet"}</div>
        </dl>
      </article>
    })}</div> : <div className="py-16 text-center"><h2 className="text-lg font-medium">No active project assignment</h2><p className="mt-2 text-sm text-zinc-400">Ask the committee to assign a project to this mentor account.</p></div>}
  </main>
}
