import { isLocalPreview } from "../admin/local-preview"

const key = "myssp-preview-deadlines-v1"
const listeners = new Set<() => void>()
function read(): Record<number,string|null> {
  if (!isLocalPreview) return {}
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}")
    return Object.fromEntries(Object.entries(saved).filter(([year,value]) =>
      /^(20\d{2}|2100)$/.test(year) && (value === null || typeof value === "string" && Number.isFinite(Date.parse(value)))
    )) as Record<number,string|null>
  } catch { return {} }
}
let deadlines = read()
export const getPreviewDeadlines = () => deadlines
export function subscribePreviewDeadlines(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
export function setPreviewDeadline(year:number, closesAt:string|null) {
  if (!isLocalPreview) throw new Error("Committee sign-in required.")
  const next = {...deadlines,[year]:closesAt}
  localStorage.setItem(key,JSON.stringify(next))
  deadlines = next
  listeners.forEach(fn => fn())
}
if (typeof window !== "undefined") window.addEventListener("storage",event => {
  if (event.key === key || event.key === null) { deadlines = read(); listeners.forEach(fn => fn()) }
})
