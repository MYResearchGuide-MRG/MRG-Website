import { useEffect, useState } from "react"
import { getBackend, useBackend, useLiveBackend } from "../admin/backend"
import { submissionClosed, submissionDeadlineLabel, submissionDeadlines } from "./submission-deadline"

export function deadlineForYear(year: number) {
  const remote = getBackend().submissionDeadlines
  return useLiveBackend && Object.hasOwn(remote, year) ? remote[year] : submissionDeadlines[year] ?? null
}

export function useSubmissionDeadline(year: number) {
  useBackend()
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
  return { closesAt, closed: submissionClosed(closesAt, now), label: submissionDeadlineLabel(closesAt) }
}
