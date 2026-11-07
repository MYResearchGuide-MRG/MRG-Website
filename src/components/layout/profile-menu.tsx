import * as React from "react"
import { FolderOpen, LayoutDashboard, LogOut, Settings, UserRound } from "lucide-react"
import { useBackend, useLiveBackend } from "@/components/admin/backend"
import { useDemoAccess } from "@/components/admin/demo-access"
import { useMentorAccess } from "@/components/admin/mentor-access"

export function ProfileMenu({ isAdmin, onSignOut }: { isAdmin: boolean; onSignOut: () => void }) {
  const access = useDemoAccess()
  const backend = useBackend()
  const { current: mentor } = useMentorAccess()
  const person = isAdmin ? undefined : access.people.find(p => useLiveBackend ? p.userId === backend.userId : p.id === access.session?.participantId)
  const name = isAdmin ? backend.accountName || "Committee account" : mentor?.name || person?.displayProfile?.name || person?.name || "My profile"
  const email = isAdmin ? backend.accountEmail : mentor?.email || person?.email || ""
  const photo = isAdmin ? backend.accountPhoto : person?.displayProfile?.photo || ""
  const [open, setOpen] = React.useState(false)
  const root = React.useRef<HTMLDivElement>(null)
  const trigger = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const closeOnRoute = () => setOpen(false)
    document.addEventListener("pointerdown", closeOutside)
    window.addEventListener("hashchange", closeOnRoute)
    return () => { document.removeEventListener("pointerdown", closeOutside); window.removeEventListener("hashchange", closeOnRoute) }
  }, [open])
  return <div ref={root} className="relative" onKeyDown={event => {
    if (event.key === "Escape" && open) { setOpen(false); trigger.current?.focus() }
  }}>
    <button ref={trigger} type="button" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#242424] text-xs font-semibold transition-colors hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
      {photo ? <img src={photo} alt="" className="size-full object-cover" /> : name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || <UserRound size={17} />}
    </button>
    {open && <div role="menu" aria-label="Account" className="animate-in fade-in slide-in-from-top-1 fixed top-[72px] right-3 left-3 z-50 rounded-xl border border-white/15 bg-[#151515] p-2 shadow-[0_20px_55px_rgb(0_0_0/0.55)] duration-150 sm:absolute sm:top-[calc(100%+12px)] sm:right-0 sm:left-auto sm:w-[320px]">
      <a role="menuitem" href={mentor ? "#/mentor" : "#/profile"} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/[0.06]">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[#272727] text-xs">{photo ? <img src={photo} alt="" className="size-full object-cover" /> : name.slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0"><span className="block truncate text-sm font-medium text-white">{name}</span><span className="block truncate text-xs text-zinc-400">{email}</span></span>
      </a>
      <div className="my-1 border-t border-white/10" />
      <a role="menuitem" href={mentor ? "#/mentor" : "#/profile/projects"} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/[0.06]"><FolderOpen size={17} aria-hidden />{isAdmin ? "All projects" : mentor ? "Mentor projects" : "My project"}</a>
      {!mentor && <a role="menuitem" href="#/profile/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/[0.06]"><Settings size={17} aria-hidden />Account settings</a>}
      {isAdmin && <a role="menuitem" href="#/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/[0.06]"><LayoutDashboard size={17} aria-hidden />Admin panel</a>}
      <button role="menuitem" type="button" onClick={() => { setOpen(false); onSignOut() }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.06]"><LogOut size={17} aria-hidden />Sign out</button>
    </div>}
  </div>
}
