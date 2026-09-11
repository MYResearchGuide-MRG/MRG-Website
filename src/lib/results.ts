import * as React from "react"
import { useReducedMotion } from "motion/react"

/** Selection announcement moment, Malaysia time with an explicit offset. */
export const selectionAnnouncementDate = "2026-09-15T00:00:00+08:00"

/** True once the announcement moment has passed. */
export function isSelectionAnnounced(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(selectionAnnouncementDate).getTime()
}

/**
 * Floored "Xd HH:MM:SS" remaining time. Clamped at zero — once the target
 * has passed the countdown rests on zero instead of going negative, and
 * flooring (never rounding) means seconds never display as 60.
 */
export function formatCountdown(target: Date | string, now: Date | string): string {
  const targetMs = target instanceof Date ? target.getTime() : new Date(target).getTime()
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const remaining = Math.max(0, targetMs - nowMs)
  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * Live countdown string to the selection announcement, re-rendering every
 * second. There is no animated motion here — just text — so reduced-motion
 * users get the same ticking readout without any fallback gap.
 */
export function useCountdown(): string {
  useReducedMotion()
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return formatCountdown(selectionAnnouncementDate, now)
}

/** Hash route for the standalone selection-announcement page. */
export const resultsRouteHash = "#/results"
export const homeRouteHash = "#/"

/**
 * Current view, re-rendering on hash navigation. Scrolls to top on every
 * route change so the results page always opens at its head.
 */
export function useRoute(): "results" | "home" {
  const [hash, setHash] = React.useState(() => window.location.hash)
  React.useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])
  return hash === resultsRouteHash ? "results" : "home"
}
