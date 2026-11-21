import { useEffect, useState, useSyncExternalStore } from "react"
import { getBackend, useBackend, useLiveBackend } from "../admin/backend"
import { submissionClosed, submissionDeadlineLabel, submissionDeadlines } from "./submission-deadline"
import { getPreviewDeadlines, subscribePreviewDeadlines } from "./preview-deadlines"

export function deadlineForYear(year: number) {
  const deadlines = useLiveBackend ? getBackend().submissionDeadlines : getPreviewDeadlines()
  return Object.hasOwn(deadlines, year) ? deadlines[year] : submissionDeadlines[year] ?? null
}

export function useSubmissionDeadline(year: number) {
  useBackend()
  useSyncExternalStore(subscribePreviewDeadlines,getPreviewDeadlines)
  const [now, setNow] = useState(Date.now)
  const closesAt = deadlineForYear(year)
  useEffect(() => {
    const update = () => setNow(Date.now())
    const remaining = closesAt ? Date.parse(closesAt) - Date.now() : 0
    const timer = remaining > 0 ? window.setTimeout(update, Math.min(remaining, 2_147_483_647)) : undefined
    const interval = window.setInterval(update, 30_000)
    window.addEventListener("focus", update)
    return () => { window.clearTimeout(timer); window.clearInterval(interval); window.removeEventListener("focus", update) }
  }, [closesAt, now])
  // Recheck the actual clock on renders triggered by a newly saved cutoff too.
  return { closesAt, closed: submissionClosed(closesAt), label: submissionDeadlineLabel(closesAt) }
}
