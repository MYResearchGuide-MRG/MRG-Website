import { useEffect } from "react"
import {
  loadLiveProjectContent,
  useBackend,
  useLiveBackend,
} from "../admin/backend"
import { useProjectBoards } from "../admin/project-registry"
import { loadDraft, type Board } from "../projectboard/data"
import { useJudgeAccess } from "./judge-access"

export const judgingHash = "#/judging"
export const judgingProjectHash = (projectId: string) =>
  `${judgingHash}/${projectId}`

/** Live boards come from the database; in preview they are the static catalogue. */
/**
 * The judge's projects. Judges at Demo Day get the committee's presentation
 * order; research-only judges mark in their own time, so theirs is by code.
 */
export function useLineupBoards() {
  const { lineup, judge } = useJudgeAccess()
  const boards = useProjectBoards()
  const inLineup = lineup
    .map((id) => boards.find((board) => board.id === id))
    .filter((board): board is Board => Boolean(board))
  return judge && !judge.attendsDemoDay
    ? inLineup.sort((a, b) =>
        a.code.localeCompare(b.code, "en", { numeric: true })
      )
    : inLineup
}

export function useProjectContent(board: Board | undefined) {
  const backend = useBackend()
  const id = board?.id
  const version = id ? backend.revisions[id] : undefined
  useEffect(() => {
    if (useLiveBackend && id) void loadLiveProjectContent(id)
  }, [id, version, backend.userId])
  if (!board) return undefined
  return useLiveBackend ? backend.drafts[board.id] : loadDraft(board)
}
