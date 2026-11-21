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
export function useLineupBoards() {
  const { lineup } = useJudgeAccess()
  const boards = useProjectBoards()
  return lineup
    .map((id) => boards.find((board) => board.id === id))
    .filter((board): board is Board => Boolean(board))
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
