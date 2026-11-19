// This is a browser remember-me window, not an authorization decision. Supabase
// still validates tokens and database policies still check account permissions.
export const REMEMBERED_SESSION_MS = 30 * 24 * 60 * 60 * 1000

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">
type RememberedSession = { identity: string; expiresAt: number }

function sessionIdentity(value: string): string | null {
  try {
    const session = JSON.parse(value)
    const payload = session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const claims = JSON.parse(atob(payload))
    return typeof session.user?.id === "string" && typeof claims.session_id === "string"
      ? `${session.user.id}:${claims.session_id}` : null
  } catch { return null }
}

export function createRememberedSessionStorage(
  sessionKey: string,
  getStorage: () => StorageLike = () => window.localStorage,
  now: () => number = Date.now,
): StorageLike {
  const expiryKey = `${sessionKey}-remembered-v1`
  // Storage-disabled browsers can still sign in for the current tab.
  const memory = new Map<string, string>()
  let storageAvailable = true
  function read(key: string) {
    if (!storageAvailable) return memory.get(key) ?? null
    try { return getStorage().getItem(key) }
    catch { storageAvailable = false; return memory.get(key) ?? null }
  }
  function write(key: string, value: string) {
    memory.set(key, value)
    if (storageAvailable) {
      try { getStorage().setItem(key, value) } catch { storageAvailable = false }
    }
  }
  function remove(key: string) {
    memory.delete(key)
    if (storageAvailable) {
      try { getStorage().removeItem(key) } catch { storageAvailable = false }
    }
  }
  function windowFor(identity: string): RememberedSession {
    const saved = read(expiryKey)
    if (saved) {
      try {
        const record = JSON.parse(saved)
        if (record.identity === identity && Number.isFinite(record.expiresAt)) return record
      } catch { /* Replace invalid metadata without storing login credentials. */ }
    }
    // A new password/code sign-in creates a new Supabase session_id, including
    // when the same person signs in again. Token refreshes keep that ID.
    const record = { identity, expiresAt: now() + REMEMBERED_SESSION_MS }
    write(expiryKey, JSON.stringify(record))
    return record
  }
  function withinWindow(value: string) {
    const identity = sessionIdentity(value)
    if (identity && now() < windowFor(identity).expiresAt) return true
    remove(sessionKey)
    remove(`${sessionKey}-user`)
    // Keep only the expired ID/deadline so a refresh already in flight cannot
    // save the same expired session again. No tokens remain in this marker.
    return false
  }
  return {
    getItem(key) {
      const value = read(key)
      return key === sessionKey && value && !withinWindow(value) ? null : value
    },
    setItem(key, value) {
      if (key !== sessionKey || withinWindow(value)) write(key, value)
    },
    removeItem(key) {
      remove(key)
      if (key === sessionKey) remove(expiryKey)
    },
  }
}
