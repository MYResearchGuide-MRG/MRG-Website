import { useSyncExternalStore } from "react"
import { isLocalPreview } from "./local-preview"
import {
  getBackend,
  useBackend,
  useLiveBackend,
  createLiveResearchField,
} from "./backend"
import {
  mergeResearchFields,
  normalizeFieldName,
  researchFieldError,
  type ResearchField,
} from "./research-fields-model"

const key = "myssp-research-fields-v1"
function read(): ResearchField[] {
  try {
    const data = isLocalPreview
      ? JSON.parse(localStorage.getItem(key) || "[]")
      : []
    return Array.isArray(data)
      ? data.filter(
          (f) =>
            typeof f?.name === "string" &&
            typeof f?.prefix === "string" &&
            !researchFieldError(f)
        )
      : []
  } catch {
    return []
  }
}
let saved = read()
const listeners = new Set<() => void>()
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export function getResearchFields() {
  return mergeResearchFields(
    useLiveBackend ? getBackend().researchFields : saved
  )
}
export function useResearchFields(projectTracks: string[] = []) {
  const local = useSyncExternalStore(subscribe, () => saved)
  const backend = useBackend()
  return mergeResearchFields(
    useLiveBackend ? backend.researchFields : local,
    projectTracks
  )
}
export async function createResearchField(input: ResearchField) {
  const field = {
    name: normalizeFieldName(input.name),
    prefix: input.prefix.trim().toUpperCase(),
  }
  const error = researchFieldError(field, getResearchFields())
  if (error) throw new Error(error)
  if (useLiveBackend) return createLiveResearchField(field)
  if (!isLocalPreview) throw new Error("Committee sign-in required.")
  const next = [...saved, field]
  localStorage.setItem(key, JSON.stringify(next))
  saved = next
  listeners.forEach((fn) => fn())
  return field
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      saved = read()
      listeners.forEach((fn) => fn())
    }
  })
