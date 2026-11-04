import { useSyncExternalStore } from "react"
import { isLocalPreview } from "./local-preview"
import { useBackend, getBackend, useLiveBackend, setProjectControl } from "./backend"
import { getProjectBoards } from "./project-registry"
import { readVisibility } from "./library-visibility-model"

// Separate from publication: hidden projects can be editable, published ones locked.
const key = "myssp-project-editing-v1"
const listeners = new Set<() => void>()
function read() {
  if (!isLocalPreview) return {}
  try {
    return readVisibility(localStorage.getItem(key), getProjectBoards().map((b) => b.id))
  } catch { return {} }
}
let permissions = read()
const snapshot = () => permissions
function publish() { listeners.forEach((fn) => fn()) }
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
export function useProjectEditing() {
  const local = useSyncExternalStore(subscribe, snapshot)
  const remote = useBackend()
  return useLiveBackend ? remote.editing : local
}
export function isProjectEditable(id: string) {
  if (useLiveBackend) return getBackend().editing[id] === true
  return isLocalPreview && permissions[id] === true
}
export async function setProjectEditing(ids: readonly string[], allowed: boolean) {
  if (useLiveBackend) return setProjectControl(ids,"editing_enabled",allowed)
  const known = getProjectBoards().map((b) => b.id)
  if (!isLocalPreview || ids.some((id) => !known.includes(id))) return false
  const next = { ...permissions }
  ids.forEach((id) => { next[id] = allowed })
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, visibleIds: known.filter((id) => next[id]) }))
    permissions = next
    publish()
    return true
  } catch { return false }
}
if (typeof window !== "undefined") window.addEventListener("storage", (event) => {
  if (event.key === key || event.key === null) { permissions = read(); publish() }
})
