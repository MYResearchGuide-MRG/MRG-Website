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
