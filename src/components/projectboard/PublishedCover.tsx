import { useState } from "react"
import { loadLiveProjectContent, useBackend } from "../admin/backend"

export function PublishedCover({ id, version, alt, priority = "lazy", canRetry = false }: {
  id: string; version: string; alt: string; priority?: "high" | "eager" | "lazy"; canRetry?: boolean
}) {
  const backend = useBackend()
  const [failedUrl, setFailedUrl] = useState("")
  const [retryUrl, setRetryUrl] = useState("")
  const url = "/api/project-cover?" + new URLSearchParams({ id, v: version })
  const cached = backend.covers[id]
  const original = cached?.version === version && cached.image
  const src = original || (failedUrl !== url && url)
  if (!src) return retryUrl === url
    ? canRetry ? <button className="pb-button" onClick={() => {
        setRetryUrl("")
        setFailedUrl("")
      }}>Retry image</button> : <span>Preview unavailable</span>
    : null
  return <img src={src} alt={alt} loading={priority === "lazy" ? "lazy" : "eager"}
    fetchPriority={priority === "high" ? "high" : "auto"} decoding="async"
    onError={src === url ? () => {
      setFailedUrl(url)
      void loadLiveProjectContent(id, "cover").then(() => setRetryUrl(url))
    } : undefined} />
}
