// Device-only judging data for localhost previews without the database. The
// committee panel writes it and the judge pages read it, so a judge added in
// the admin preview can sign in on the same browser. Production never uses it.
import { isLocalPreview } from "../admin/local-preview"
import { useLiveBackend } from "../admin/backend"
import { getProjectBoards } from "../admin/project-registry"
import type { CommitteeJudge, JudgingSwitches } from "./judge-model"
import type { JudgeReview } from "./judge-access"

export const judgingPreviewMode = isLocalPreview && !useLiveBackend

export type PreviewJudge = CommitteeJudge & { code?: string }
export type PreviewData = {
  judges: PreviewJudge[]
  lineups: Record<string, string[]>
  switches: Record<string, JudgingSwitches>
  /** judge id -> project id -> review */
  reviews: Record<string, Record<string, JudgeReview>>
}

const storageKey = "myssp-judging-preview-v2"
export const previewSessionKey = "myssp-judge-preview-session-v2"

function latestYear() {
  return Math.max(...getProjectBoards().map(board => board.year))
}
// A ready-made judge so the judge pages can be tried straight away.
function seed(): PreviewData {
  const year = latestYear()
  return {
    judges: [{
      id: "preview-judge", userId: null, cohortYear: year, name: "Preview Judge",
      email: "judge@preview.local", affiliation: "Local preview", revoked: false,
      invitedAt: Date.now(), deletedAt: null, code: "JUDGE1",
    }],
    lineups: {
      [year]: getProjectBoards().filter(board => board.year === year)
        .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
        .map(board => board.id),
    },
    switches: { [year]: { judgingOpen: false, feedbackReleased: false } },
    reviews: {},
  }
}

let cache: PreviewData | null = null
export function readPreview(): PreviewData {
  if (cache) return cache
  try {
    const stored = localStorage.getItem(storageKey)
    cache = stored ? JSON.parse(stored) as PreviewData : seed()
  } catch { cache = seed() }
  return cache
}

const listeners = new Set<() => void>()
export function onPreviewChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export function writePreview(next: PreviewData) {
  cache = next
  try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* storage full or blocked */ }
  listeners.forEach(fn => fn())
}
if (typeof window !== "undefined" && judgingPreviewMode) {
  window.addEventListener("storage", event => {
    if (event.key === storageKey) { cache = null; listeners.forEach(fn => fn()) }
  })
}
