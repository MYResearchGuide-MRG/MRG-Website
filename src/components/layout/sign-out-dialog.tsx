import { useRef } from "react"
import { AlertDialog } from "radix-ui"

export function SignOutDialog({ open, onOpenChange, onConfirm, busy, unsaved, error }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  busy: boolean
  unsaved: boolean
  error: string
}) {
  const returnFocus = useRef<HTMLElement | null>(null)
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px]" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-black p-6 text-white shadow-2xl sm:p-8"
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocus.current?.focus({ preventScroll: true })
          }}
        >
          <AlertDialog.Title className="text-xl font-semibold">Sign out of MYSSP?</AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm leading-relaxed text-neutral-400">
            {unsaved
              ? "You have unsaved changes. Signing out will discard them. Stay signed in to save your work."
              : "You can keep browsing after signing out. Your saved changes will stay on your project."}
          </AlertDialog.Description>
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel disabled={busy} className="rounded-md border border-white/20 px-4 py-2.5 text-sm transition-colors hover:bg-white/10 disabled:opacity-50">
              Stay signed in
            </AlertDialog.Cancel>
            <button disabled={busy} onClick={onConfirm} className="rounded-md bg-white px-4 py-2.5 text-sm text-black transition-colors hover:bg-neutral-200 disabled:opacity-50">
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
