import { useSyncExternalStore } from "react"
import { getProjectBoards } from "./project-registry"
import { isLocalPreview } from "./local-preview"
import { useBackend, useLiveBackend, setProjectControl } from "./backend"
import {
  readVisibility,
  type LibraryVisibility,
} from "./library-visibility-model"

const key = "myssp-library-visibility-v1"
const listeners = new Set<() => void>()
function read(): LibraryVisibility {
  if (!isLocalPreview) return {}
  try {
    return readVisibility(
      localStorage.getItem(key),
      getProjectBoards().map((board) => board.id)
    )
  } catch {
    return {}
  }
}
let visibility = read()
const snapshot = () => visibility
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return
    visibility = read()
    listeners.forEach((listener) => listener())
  })
}
export function useLibraryVisibility() {
  const local = useSyncExternalStore(subscribe, snapshot)
  const remote = useBackend()
  return useLiveBackend ? remote.visibility : local
}
export async function setLibraryVisibility(
  ids: readonly string[],
  visible: boolean
): Promise<boolean> {
  if (useLiveBackend) return setProjectControl(ids,"published",visible)
  const projectIds = getProjectBoards().map((board) => board.id)
  if (!isLocalPreview || ids.some((id) => !projectIds.includes(id)))
    return false
  const next = { ...visibility }
  ids.forEach((id) => {
    next[id] = visible
  })
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        visibleIds: projectIds.filter((id) => next[id] === true),
      })
    )
    visibility = next
    listeners.forEach((listener) => listener())
    return true
  } catch {
    return false
  }
}
