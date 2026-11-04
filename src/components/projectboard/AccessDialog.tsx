import { useRef, useState, type FormEvent } from "react"
import { ArrowRight, KeyRound, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { authenticate, isLocalPreview } from "../admin/demo-access"
import { AdminSignIn } from "../admin/AdminSignIn"
import { useLiveBackend } from "../admin/backend"
import "../admin/admin.css"
import "./projectboard.css"

export default function AccessDialog({
  open,
  onClose,
  onEnter,
}: {
  open: boolean
  onClose: () => void
  onEnter: () => void
}) {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [admin, setAdmin] = useState(false)
  const [busy, setBusy] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const accepted = await authenticate(email, code).catch(() => false)
    setBusy(false)
    if (!accepted) {
      setError(
        "Could not sign in. Check your email and access code, or ask the committee to reissue it."
      )
      return
    }
    onEnter()
    onClose()
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <DialogContent
        className="pb-modal"
        overlayClassName="pb-auth-overlay"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null
          titleRef.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocus.current?.focus()
          setEmail("")
          setCode("")
          setError("")
          setAdmin(false)
        }}
      >
        <div className="pb-auth-body">
          <div className="pb-auth-heading">
            <img
              src="/myssp-icon.png"
              width={48}
              height={56}
              alt=""
              className="pb-auth-logo"
            />
            <DialogTitle ref={titleRef} tabIndex={-1}>
              {admin ? "Committee sign in" : "Sign in to MYSSP"}
            </DialogTitle>
            <DialogDescription className="pb-auth-description">
              {admin ? "Use your committee account." : "Use the email and access code from your invitation."}
            </DialogDescription>
          </div>
          <div className="pb-auth-tabs" role="group" aria-label="Sign-in type"><button aria-pressed={!admin} onClick={()=>setAdmin(false)}>Participant</button><button aria-pressed={admin} onClick={()=>{setAdmin(true); setError("")}}>Admin sign in</button></div>
          {admin ? <AdminSignIn onSuccess={()=>{window.location.hash="#/admin"; onClose()}} onDevice={()=>{window.location.hash="#/admin"; onClose()}}/> : <form onSubmit={submit}>
            <label className="pb-field">
              Email address
              <span className="pb-auth-input">
                <Mail size={17} aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </span>
            </label>
            <label className="pb-field">
              Access code
              <span className="pb-auth-input">
                <KeyRound size={17} aria-hidden="true" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="6-character code"
                  autoComplete="current-password"
                  autoCapitalize="characters"
                  spellCheck={false}
                  minLength={6}
                  maxLength={6}
                  pattern="[A-Za-z0-9]{6}"
                  required
                  aria-describedby={error ? "pb-code-error" : undefined}
                />
              </span>
            </label>
            {error && (
              <p
                id="pb-code-error"
                role="alert"
                style={{ color: "#e7a5a5", fontSize: 12, marginBottom: 16 }}
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              className="pb-button pb-primary pb-full"
              disabled={busy || (!useLiveBackend && !isLocalPreview)}
            >
              {busy ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
            </button>
          </form>}
          <p className="pb-auth-help">Need access or a replacement code? <a href="mailto:myresearchguide.org@gmail.com">Contact us</a></p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
