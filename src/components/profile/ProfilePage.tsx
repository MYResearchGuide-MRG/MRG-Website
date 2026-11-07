import * as React from "react"
import { ArrowUpRight, Camera, Check, FolderOpen, LogOut, Pencil, UserRound } from "lucide-react"

import { useBackend, useLiveBackend } from "@/components/admin/backend"
import { saveOwnProfile, useDemoAccess } from "@/components/admin/demo-access"
import { useLibraryVisibility } from "@/components/admin/library-visibility"
import { useProjectBoards } from "@/components/admin/project-registry"
import { prepareMemberPhoto } from "@/components/projectboard/project-image"
import { boardUrl } from "@/components/projectboard/paths"
import { useSubmissionDeadline } from "@/components/projectboard/use-submission-deadline"

type Section = "projects" | "settings"
function currentSection(): Section {
  return window.location.hash === "#/profile/settings" ? "settings" : "projects"
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?"
}

function ProfileSettingsForm({ displayName, email, photo, locked }: {
  displayName: string
  email: string
  photo: string
  locked: boolean
}) {
  const [name, setName] = React.useState(displayName)
  const [draftPhoto, setDraftPhoto] = React.useState(photo)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")
  const [saved, setSaved] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  async function choosePhoto(file: File | undefined) {
    if (!file) return
    setError("")
    try { setDraftPhoto(await prepareMemberPhoto(file)); setSaved(false) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read this image.") }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (saving || locked) return
    setSaving(true); setError(""); setSaved(false)
    try { await saveOwnProfile(name, draftPhoto); setSaved(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your profile.") }
    finally { setSaving(false) }
  }

  return <form onSubmit={saveProfile} className="mt-8 space-y-6">
    {locked && <p role="status" className="rounded-md border border-white/15 p-4 text-sm text-zinc-400">The submission deadline has passed. Your name and photo are part of your project submission and are now locked. Contact the committee for corrections.</p>}
    <fieldset disabled={locked} className="space-y-6 disabled:opacity-60">
    <div className="flex items-center gap-5">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-900 text-xl">{draftPhoto ? <img src={draftPhoto} alt="Profile photo preview" className="size-full object-cover" /> : initials(name)}</div>
      <div className="flex flex-wrap gap-3"><input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void choosePhoto(event.target.files?.[0])} aria-label="Upload profile photo" />
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm transition-colors hover:border-white/50"><Camera size={15} aria-hidden /> Change photo</button>
        {draftPhoto && <button type="button" onClick={() => { setDraftPhoto(""); setSaved(false) }} className="px-2 py-2 text-sm text-zinc-400 hover:text-white">Remove</button>}
      </div>
    </div>
    <label className="block text-sm">Display name<input value={name} onChange={event => { setName(event.target.value); setSaved(false) }} maxLength={100} required className="mt-2 block w-full rounded-md border border-white/20 bg-black px-4 py-3 text-white outline-none focus:border-white/60" /></label>
    <label className="block text-sm">Email address<input value={email} readOnly className="mt-2 block w-full rounded-md border border-white/10 bg-[#161616] px-4 py-3 text-zinc-400" /><span className="mt-2 block text-xs text-zinc-500">Contact the MYSSP committee to change your sign-in email.</span></label>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {saved && <p role="status" className="flex items-center gap-2 text-sm text-zinc-300"><Check size={15} aria-hidden /> Profile saved.</p>}
    <button type="submit" disabled={saving || (name.trim() === displayName && draftPhoto === photo)} className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"><Pencil size={14} aria-hidden />{saving ? "Saving…" : "Save changes"}</button>
    </fieldset>
  </form>
}

export default function ProfilePage({ isAdmin, onSignIn, onSignOut }: {
  isAdmin: boolean
  onSignIn: () => void
  onSignOut: () => void
}) {
  const access = useDemoAccess()
  const backend = useBackend()
  const boards = useProjectBoards()
  const visibility = useLibraryVisibility()
  const [section, setSection] = React.useState<Section>(currentSection)
  React.useEffect(() => {
    const onHash = () => setSection(currentSection())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])
  const person = isAdmin ? undefined : access.people.find(p =>
    useLiveBackend ? p.userId === backend.userId && !p.revoked : p.id === access.session?.participantId && !p.revoked
  )
  const signedIn = isAdmin || Boolean(person)
  const displayName = isAdmin ? backend.accountName || "Committee account" : person?.displayProfile?.name || person?.name || ""
  const email = isAdmin ? backend.accountEmail : person?.email || ""
  const photo = isAdmin ? backend.accountPhoto : person?.displayProfile?.photo || ""
  const assignedBoard = boards.find(b => b.id === person?.projectId)
  const deadline = useSubmissionDeadline(assignedBoard?.year ?? 0)

  if (!signedIn) return <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-6 pt-24 text-center">
    <UserRound className="mb-5 text-zinc-500" size={28} aria-hidden />
    <h1 className="text-3xl font-semibold tracking-tight">Sign in to see your profile.</h1>
    <p className="mt-3 text-sm text-zinc-400">Your project assignment and account details will appear here.</p>
    <button type="button" onClick={onSignIn} className="mt-7 rounded-md bg-white px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200">Sign in</button>
  </main>

  return <main className="mx-auto min-h-[70svh] w-full max-w-[1100px] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
    <div className="border-b border-white/10 pb-9 sm:flex sm:items-end sm:justify-between sm:gap-8">
      <div className="flex min-w-0 items-center gap-5">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-900 text-xl font-medium sm:size-20">
          {photo ? <img src={photo} alt="" className="size-full object-cover" /> : initials(displayName)}
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs text-zinc-500">{isAdmin ? "Committee profile" : "Participant profile"}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{displayName}</h1>
          <p className="mt-1 truncate text-sm text-zinc-400">{email}</p>
        </div>
      </div>
      <button type="button" onClick={onSignOut} className="mt-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white sm:mt-0"><LogOut size={15} aria-hidden /> Sign out</button>
    </div>

    <nav aria-label="Profile sections" className="flex gap-7 border-b border-white/10">
      <a href="#/profile/projects" aria-current={section === "projects" ? "page" : undefined} className={`border-b-2 py-4 text-sm transition-colors ${section === "projects" ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-white"}`}>{isAdmin ? "All projects" : "My project"}</a>
      <a href="#/profile/settings" aria-current={section === "settings" ? "page" : undefined} className={`border-b-2 py-4 text-sm transition-colors ${section === "settings" ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-white"}`}>Account settings</a>
      {isAdmin && <a href="#/admin" className="ml-auto py-4 text-sm text-zinc-400 transition-colors hover:text-white">Admin panel <ArrowUpRight className="ml-1 inline" size={14} aria-hidden /></a>}
    </nav>

    {section === "projects" ? <section className="pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-2xl font-medium tracking-tight">{isAdmin ? "All projects" : "Your project"}</h2>
          <p className="mt-2 text-sm text-zinc-400">{isAdmin ? "Open any project to review its page, including projects hidden from the public archive." : "Open your team's page to view its work."}</p></div>
        {isAdmin && <span className="text-sm tabular-nums text-zinc-500">{boards.length} projects</span>}
      </div>
      {isAdmin ? <div className="grid gap-3 sm:grid-cols-2">
        {boards.map(board => <a key={board.id} href={boardUrl(board.id)} className="group flex min-h-44 flex-col rounded-lg border border-white/10 bg-black p-5 transition-colors hover:border-white/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <div className="flex items-center justify-between gap-4 text-xs text-zinc-500"><span className="font-medium text-zinc-300">{board.code} · {board.year}</span><span>{visibility[board.id] ? "Public" : "Hidden"}</span></div>
          <h3 className="mt-5 line-clamp-2 text-base font-medium leading-snug">{backend.drafts[board.id]?.title || board.title}</h3>
          <span className="mt-auto flex items-center gap-2 pt-5 text-xs text-zinc-400 group-hover:text-white">{backend.drafts[board.id] ? "Submission started" : "Project brief"} <ArrowUpRight size={14} className="ml-auto" aria-hidden /></span>
        </a>)}
      </div> : assignedBoard ? <a href={boardUrl(assignedBoard.id)} className="group block max-w-2xl rounded-lg border border-white/10 bg-black p-6 transition-colors hover:border-white/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <div className="flex justify-between gap-4 text-xs text-zinc-500"><span>{assignedBoard.code} · MYSSP {assignedBoard.year}</span><span>{visibility[assignedBoard.id] ? "Public" : "Hidden"}</span></div>
        <h3 className="mt-5 text-xl font-medium leading-snug">{backend.drafts[assignedBoard.id]?.title || assignedBoard.title}</h3>
        <p className="mt-3 text-sm text-zinc-400">{assignedBoard.track}</p>
        <span className="mt-8 flex items-center gap-2 text-sm font-medium">Open project page <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></span>
      </a> : <p className="rounded-lg border border-white/10 bg-black p-6 text-sm text-zinc-400">No project is assigned to this account yet.</p>}
    </section> : <section className="max-w-xl pt-10">
      <h2 className="text-2xl font-medium tracking-tight">Account settings</h2>
      <p className="mt-2 text-sm text-zinc-400">Update the name and photo shown on your profile{isAdmin ? "." : " and project team."}</p>
      <ProfileSettingsForm key={`${backend.userId || person?.id}:${displayName}:${photo.slice(-32)}`} displayName={displayName} email={email} photo={photo} locked={!isAdmin && deadline.closed} />
      {!isAdmin && assignedBoard && <a href={boardUrl(assignedBoard.id)} className="mt-10 inline-flex items-center gap-2 border-t border-white/10 pt-6 text-sm text-zinc-400 transition-colors hover:text-white"><FolderOpen size={16} aria-hidden /> Go to your project <ArrowUpRight size={14} aria-hidden /></a>}
    </section>}
  </main>
}
