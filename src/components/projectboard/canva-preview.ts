import { isCanvaShortLink, materialEmbed } from "./materials"

const cache = new Map<string, Promise<string | null>>()
/** Best effort only. A network/provider failure must never reject a valid saved URL. */
export function resolveCanvaPreview(value: string, { retry = false } = {}): Promise<string | null> {
  if (!isCanvaShortLink(value)) return Promise.resolve(null)
  const url = new URL(value.trim())
  url.protocol = "https:"
  const key = url.href
  if (retry) cache.delete(key)
  if (!cache.has(key)) {
    if (cache.size >= 100) cache.delete(cache.keys().next().value!)
    cache.set(
      key,
      fetch(`/api/canva-link?url=${encodeURIComponent(key)}${retry ? "&refresh=1" : ""}`, {
        signal: AbortSignal.timeout(8000),
      })
        .then(async (response) => {
          if (!response.ok) return null
          const data = (await response.json()) as { href?: unknown }
          return typeof data.href === "string" &&
            materialEmbed("slides", data.href)
            ? data.href
            : null
        })
        .catch(() => null)
        .then((result) => {
          if (!result) cache.delete(key)
          return result
        })
    )
  }
  return cache.get(key)!
}
