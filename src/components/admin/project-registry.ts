import { useSyncExternalStore } from "react"
import { boards as originalBoards, type Board } from "../projectboard/data"
import { isLocalPreview } from "./local-preview"
import { getResearchFields } from "./research-fields"
import {
  useBackend,
  getBackend,
  useLiveBackend,
  createLiveCohort,
  saveLiveProject,
} from "./backend"
import {
  cohortError,
  projectInputError,
  projectFromInput,
  type Cohort,
  type ProjectInput,
} from "./cohort-model"
import {
  applyProjectSplits,
  readProjectSplits,
  splitError,
  type ProjectSplit,
} from "./project-registry-model"

const key = "myssp-project-splits-v1"
const workspaceKey = "myssp-cohorts-v1"
function readWorkspace(): {
  cohorts: Cohort[]
  projects: Board[]
  overrides: Record<string, ProjectInput>
} {
  try {
    const value = isLocalPreview
      ? JSON.parse(localStorage.getItem(workspaceKey) || "null")
      : null
    if (
      value?.version === 1 &&
      Array.isArray(value.cohorts) &&
      Array.isArray(value.projects)
    ) {
      return {
        cohorts: value.cohorts.filter(
          (c: Cohort) => !cohortError(c.year, c.name, [])
        ),
        projects: value.projects.filter(
          (b: Board) =>
            !projectInputError(b, []) &&
            /^[a-z0-9-]{1,100}$/.test(b.id) &&
            Array.isArray(b.team)
        ),
        overrides: Object.fromEntries(
          Object.entries(value.overrides || {}).filter(
            (entry): entry is [string, ProjectInput] => !projectInputError(entry[1] as ProjectInput, [])
          )
        ),
      }
    }
  } catch {
    /* Ignore invalid device data. */
  }
  return { cohorts: [], projects: [], overrides: {} }
}
let workspace = readWorkspace()
function baseBoards() {
  return [
    ...originalBoards.filter(
      (b) => !workspace.projects.some((p) => p.id === b.id)
    ),
    ...workspace.projects,
  ]
}
function read() {
  if (!isLocalPreview) return []
  try {
    return readProjectSplits(localStorage.getItem(key), baseBoards())
  } catch {
    return []
  }
}
let splits = read()
function resolvedBoards() {
  return applyProjectSplits(baseBoards(), splits).map((board) => {
    const edit = workspace.overrides[board.id]
    return edit
      ? { ...board, ...edit, id: board.id, code: board.code, year: board.year }
      : board
  })
}
let boards = resolvedBoards()
function combineCohorts(saved: Cohort[], projects: Board[]) {
  return [
    ...new Map(
      [
        ...projects.map((b) => ({ year: b.year, name: `MYSSP ${b.year}` })),
        ...saved,
      ].map((c) => [c.year, c])
    ).values(),
  ].sort((a, b) => b.year - a.year)
}
let cohorts = combineCohorts(workspace.cohorts, boards)
const listeners = new Set<() => void>()
export const getProjectBoards = () =>
  useLiveBackend ? getBackend().boards : boards
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
export function useCohorts() {
  const local = useSyncExternalStore(subscribe, () => cohorts)
  const remote = useBackend()
  return useLiveBackend ? combineCohorts(remote.cohorts, remote.boards) : local
}
function saveWorkspace(next: typeof workspace) {
  localStorage.setItem(workspaceKey, JSON.stringify({ version: 1, ...next }))
  workspace = next
  publish()
}
export async function createCohort(year: number, name: string) {
  if (useLiveBackend) return createLiveCohort(year, name)
  if (!isLocalPreview) throw new Error("Committee sign-in required.")
  const error = cohortError(year, name, cohorts)
  if (error) throw new Error(error)
  saveWorkspace({
    ...workspace,
    cohorts: [...workspace.cohorts, { year, name: name.trim() }],
  })
}
export async function saveProjectBrief(input: ProjectInput, previous?: Board) {
  const error = projectInputError(input, getProjectBoards(), previous?.id)
  if (error) throw new Error(error)
  if (!getResearchFields().some(f => f.name === input.track)) throw new Error("Add this research field before assigning it to a project.")
  if (useLiveBackend) return saveLiveProject(input, previous)
  if (!isLocalPreview || !cohorts.some((c) => c.year === input.year))
    throw new Error("Choose an existing cohort.")
  const id =
    previous?.id ||
    `myssp-${input.year}-${input.code.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`
  if (
    previous &&
    splits.some((split) => split.teams.some((team) => team.id === id))
  ) {
    saveWorkspace({
      ...workspace,
      overrides: { ...workspace.overrides, [id]: input },
    })
    return id
  }
  const board = previous
    ? { ...previous, ...input }
    : projectFromInput(input, id)
  saveWorkspace({
    ...workspace,
    projects: [...workspace.projects.filter((p) => p.id !== id), board],
  })
  return id
}
export function canSplitProject(id: string) {
  if (useLiveBackend)
    return (
      getBackend().isAdmin &&
      getBackend().boards.some((b) => b.id === id && b.team.length > 1)
    )
  return (
    boards.some((board) => board.id === id && board.team.length > 1) &&
    !splits.some((split) => split.parentId === id)
  )
}
function publish() {
  boards = resolvedBoards()
  cohorts = combineCohorts(workspace.cohorts, boards)
  listeners.forEach((listener) => listener())
}
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === workspaceKey || event.key === null) {
      workspace = readWorkspace()
      splits = read()
      publish()
    }
  })
export function saveProjectSplit(split: ProjectSplit): string | null {
  if (!isLocalPreview)
    return "Project splitting is only available in the local preview."
  const error = splitError(split, baseBoards(), splits)
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
