import { useState, type FormEvent } from "react"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  LoaderCircle,
} from "lucide-react"
import { adminSignIn, useLiveBackend } from "./backend"
import { isLocalPreview } from "./local-preview"
import { setPreviewCommitteeSession } from "./committee-session"
import "./auth.css"

export function AdminSignIn({
  onSuccess,
  onDevice,
}: {
  onSuccess: () => void
  onDevice?: () => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [visible, setVisible] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      await adminSignIn(email, password)
      setPassword("")
      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <form onSubmit={submit} className="auth-form">
        <label className="auth-field">
          Email address
          <span className="auth-input">
            <Mail size={16} aria-hidden="true" />
            <input
              type="email"
              placeholder="you@example.com"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </span>
        </label>
        <label className="auth-field">
          Password
          <span className="auth-input">
            <LockKeyhole size={16} aria-hidden="true" />
            <input
              type={visible ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        {error && (
          <p role="alert" className="ad-error">
            {error}
          </p>
        )}
        <button className="auth-submit" disabled={busy}>
          {busy ? "Signing in…" : "Admin sign in"}
          {busy ? (
            <LoaderCircle size={16} className="auth-spinner" />
          ) : (
            <ArrowRight size={16} />
          )}
        </button>
      </form>
      {isLocalPreview && !useLiveBackend && onDevice && (
        <button className="ad-device-link" onClick={() => {
          setPreviewCommitteeSession(true)
          onDevice()
        }}>
          Open workspace on this device
        </button>
      )}
    </>
  )
}
