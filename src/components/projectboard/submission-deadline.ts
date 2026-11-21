// Exclusive cutoff: students may save throughout 20 November in Malaysia.
export const submissionDeadlines: Record<number, string | null> = {
  2026: "2026-11-21T00:00:00+08:00",
}

export function submissionClosed(closesAt: string | null | undefined, now = Date.now()) {
  return Boolean(closesAt && now >= Date.parse(closesAt))
}

export function submissionDeadlineLabel(closesAt: string | null | undefined) {
  if (!closesAt) return ""
  const lastMinute = new Date(Date.parse(closesAt) - 60_000)
  return `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(lastMinute)}, ${new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" }).format(lastMinute)} MYT`
}

// Inputs describe the final editable minute, always in Malaysia time. Store the
// exclusive cutoff one minute later, independent of the committee's device zone.
export function deadlineToInput(closesAt: string | null | undefined) {
  if (!closesAt || !Number.isFinite(Date.parse(closesAt))) return ""
  return new Date(Date.parse(closesAt) - 60_000 + 8 * 60 * 60_000).toISOString().slice(0,16)
}
export function deadlineFromInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const minute = Date.parse(`${value}:00+08:00`)
  if (!Number.isFinite(minute)) return null
  const cutoff = new Date(minute + 60_000).toISOString()
  return deadlineToInput(cutoff) === value ? cutoff : null
}
