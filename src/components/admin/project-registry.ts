import { useSyncExternalStore } from "react"
import { boards as originalBoards } from "../projectboard/data"
import { isLocalPreview } from "./local-preview"
import { useBackend, getBackend, useLiveBackend } from "./backend"
import {
  applyProjectSplits,
  readProjectSplits,
  splitError,
  type ProjectSplit,
} from "./project-registry-model"

const key = "myssp-project-splits-v1"
function read() {
  if (!isLocalPreview) return []
  try {
    return readProjectSplits(localStorage.getItem(key), originalBoards)
  } catch {
    return []
  }
}
let splits = read()
let boards = applyProjectSplits(originalBoards, splits)
const listeners = new Set<() => void>()
export const getProjectBoards = () => useLiveBackend ? getBackend().boards : boards
export const getProjectSplits = () => splits
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function useProjectBoards() {
  const local = useSyncExternalStore(subscribe, () => boards)
  const remote = useBackend()
  return useLiveBackend ? remote.boards : local
}
export function canSplitProject(id: string) {
  if (useLiveBackend) return getBackend().isAdmin && getBackend().boards.some(b => b.id === id && b.team.length > 1)
  return (
    originalBoards.some((board) => board.id === id && board.team.length > 1) &&
    !splits.some((split) => split.parentId === id)
  )
}
function publish() {
  boards = applyProjectSplits(originalBoards, splits)
  listeners.forEach((listener) => listener())
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      splits = read()
      publish()
    }
  })
export function saveProjectSplit(split: ProjectSplit): string | null {
  if (!isLocalPreview)
    return "Project splitting is only available in the local preview."
  const error = splitError(split, originalBoards, splits)
  if (error) return error
  const next = [...splits, split]
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, splits: next }))
  } catch {
    return "Could not save the split. Check browser storage and try again."
  }
  splits = next
  publish()
  return null
}
