import { useCallback, useSyncExternalStore } from "react"

export function useResearchDeadlinePassed(deadline: string | null | undefined) {
  const end = deadline ? Date.parse(deadline) : NaN
  const hasPassed = useCallback(() => Date.now() >= end, [end])
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!Number.isFinite(end)) return () => {}
      let timer: number | undefined
      const refresh = () => {
        window.clearTimeout(timer)
        notify()
        const remaining = end - Date.now()
        if (remaining > 0) {
          timer = window.setTimeout(refresh, Math.min(remaining, 2_147_483_647))
        }
      }
      refresh()
      document.addEventListener("visibilitychange", refresh)
      return () => {
        window.clearTimeout(timer)
        document.removeEventListener("visibilitychange", refresh)
      }
    },
    [end]
  )
  return useSyncExternalStore(subscribe, hasPassed)
}
