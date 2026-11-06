import { useSyncExternalStore } from "react"
import { useBackend, useLiveBackend } from "./backend"
import { isLocalPreview } from "./local-preview"

// This flag only keeps the offline localhost workspace open across navigation.
// Live committee access always comes from the verified Supabase role.
const previewEnabled = isLocalPreview && !useLiveBackend
const key = "myssp-preview-committee-session"
let previewEntered = false
try {
  previewEntered = previewEnabled && sessionStorage.getItem(key) === "true"
} catch { /* Storage can be unavailable in a private browser. */ }
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function setPreviewCommitteeSession(entered: boolean) {
  if (!previewEnabled) return
  previewEntered = entered
  try {
    if (entered) sessionStorage.setItem(key, "true")
    else sessionStorage.removeItem(key)
  } catch { /* Keep navigation working for this tab without storage. */ }
  listeners.forEach((listener) => listener())
}

export function useCommitteeAccess() {
  const backend = useBackend()
  const local = useSyncExternalStore(subscribe, () => previewEntered)
  return useLiveBackend ? Boolean(backend.userId && backend.isAdmin) : previewEnabled && local
}
