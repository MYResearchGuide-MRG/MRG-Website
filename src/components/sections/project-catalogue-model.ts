import { projects, projectCodes, type Project } from "@/data/competition-data"
import type { Board } from "../projectboard/data"

const originalCodes = projectCodes(projects)
export type CatalogueProject = Project & { code: string; year: number }

// Original mentor briefs are already public. New projects must be published
// before appearing here, including when a committee member browses the page.
export function catalogueProjects(
  boards: Board[],
  visibility: Record<string, boolean>
): CatalogueProject[] {
  const briefs = new Map<string, CatalogueProject>(
    projects.map((p) => [
      p.id,
      { ...p, code: originalCodes.get(p.id)!, year: 2026 },
    ])
  )
  for (const board of boards) {
    if (visibility[board.id] !== true) continue
    briefs.set(board.id, board)
  }
  return [...briefs.values()]
}
