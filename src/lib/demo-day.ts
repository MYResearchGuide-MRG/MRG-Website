import { useSyncExternalStore } from "react"
import { latestDemoDayYear } from "@/data/demo-day"

export type DemoDaySection = "judges" | "awards"

export function parseDemoDayRoute(
  hash: string
): { section: DemoDaySection; year: number } | null {
  const match = /^#\/(judges|awards)(?:\/(\d{4}))?\/?$/.exec(hash)
  if (!match) return null
  return {
    section: match[1] as DemoDaySection,
    year: match[2] ? Number(match[2]) : latestDemoDayYear,
  }
}

export function demoDayHref(section: DemoDaySection, year: number) {
  return `#/${section}/${year}`
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

function getYear() {
  return parseDemoDayRoute(window.location.hash)?.year ?? latestDemoDayYear
}

export function useDemoDayYear() {
  return useSyncExternalStore(subscribe, getYear, () => latestDemoDayYear)
}
