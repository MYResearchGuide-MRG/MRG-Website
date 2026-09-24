import * as React from "react"
import { useReducedMotion } from "motion/react"

/**
 * Selection announcement moment, MYT (UTC+8): the register goes public at
 * 22:00 on 12 September 2026, when this release reaches production. Kept as an
 * explicit offset so the moment is stable regardless of the visitor's timezone.
 */
export const selectionAnnouncementDate = "2026-09-12T22:00:00+08:00"

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
export const resourcesRouteHash = "#/resources"
export const homeRouteHash = "#/"

/**
 * A scene anchor inside the results route: `#/results/age`. Anything after the
 * route hash names an element on that page.
 */
function sceneFromHash(hash: string): string | null {
  const prefix = `${resultsRouteHash}/`
  return hash.startsWith(prefix) ? hash.slice(prefix.length) : null
}

/**
 * Current view, re-rendering on hash navigation.
 *
 * In-page anchors must not navigate. The announcement is built out of them —
 * every scene carries one and the opening's skip control is a native anchor —
 * and treating any unrecognised hash as "home" would unmount the page the
 * anchor points into. A plain hash therefore keeps the current view, and only
 * falls back to home when its target element is absent, which is how the back
 * button returns from `#/results` to a section on the home page.
 */
export function useRoute(): "results" | "resources" | "home" {
  const [route, setRoute] = React.useState<"results" | "resources" | "home">(() =>
    window.location.hash === resultsRouteHash || sceneFromHash(window.location.hash) !== null
      ? "results"
      : window.location.hash === resourcesRouteHash
        ? "resources"
      : "home",
  )

  React.useEffect(() => {
    const onChange = () => {
      const hash = window.location.hash
      const scene = sceneFromHash(hash)
      if (hash === resultsRouteHash || scene !== null) {
        setRoute("results")
      } else if (hash === resourcesRouteHash) {
        setRoute("resources")
      } else if (hash === homeRouteHash || hash === "" || hash === "#") {
        setRoute("home")
      } else if (document.getElementById(hash.slice(1)) === null) {
        setRoute("home")
      } else {
        return
      }
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])

  // A shared scene link can only resolve once the scene it names has mounted.
  React.useEffect(() => {
    if (route !== "results") return
    const scene = sceneFromHash(window.location.hash)
    if (scene) document.getElementById(scene)?.scrollIntoView()
  }, [route])

  return route
}

/**
 * Live announcement flag, re-rendering every second so gates flip at the
 * moment without a refresh. Pair with useCountdown's readout.
 */
export function useAnnounced(): boolean {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return isSelectionAnnounced(now)
}
