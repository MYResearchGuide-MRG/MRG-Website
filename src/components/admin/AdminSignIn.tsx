import { useState, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import { adminSignIn, useLiveBackend } from "./backend"
import { isLocalPreview } from "./local-preview"

export function AdminSignIn({onSuccess, onDevice}: {onSuccess:()=>void; onDevice?:()=>void}) {
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [error,setError] = useState("")
  const [busy,setBusy] = useState(false)
  async function submit(e:FormEvent) {
    e.preventDefault(); setBusy(true); setError("")
    try { await adminSignIn(email,password); setPassword(""); onSuccess() }
    catch(error) { setError(error instanceof Error ? error.message : "Could not sign in.") }
    finally { setBusy(false) }
  }
  return <>
    <form onSubmit={submit} className="ad-login-form">
      <label>Email address<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
      {error && <p role="alert" className="ad-error">{error}</p>}
      <button className="ad-button ad-primary" disabled={busy}>{busy ? "Signing in…" : "Admin sign in"}<ArrowRight size={16}/></button>
    </form>
    {isLocalPreview && !useLiveBackend && onDevice && <button className="ad-device-link" onClick={onDevice}>Open workspace on this device</button>}
  </>
}
