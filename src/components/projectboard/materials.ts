export type MaterialKey = "video" | "slides" | "paper"
export type MaterialService = "youtube" | "canva" | "drive" | "github" | "web"
export type AdditionalMaterial = { id: string; name: string; url: string }
export type MaterialEmbed = { src: string; href: string }
export const MAX_ADDITIONAL_MATERIALS = 10

export const materialSpecs = [
  {
    key: "video",
    title: "Video presentation",
    service: "youtube",
    provider: "YouTube",
    label: "YouTube video link",
    placeholder: "https://www.youtube.com/watch?v=…",
    instruction:
      "Prepare your video as an MP4, then upload it to YouTube as Public or Unlisted with embedding allowed. Paste the video link here.",
    rules: [
      "2–3 minutes, for a general audience, at a minimum resolution of 1080p. Videos outside this length will not be accepted.",
      "Keep audio clear throughout and minimise background noise.",
      "Slides, diagrams, footage and screen recordings are allowed. Avoid heavy transitions and visual or sound effects.",
      "No software logos may appear anywhere in the video.",
      "All team members must appear on camera and speak, with speaking time equally distributed.",
    ],
    error: "Use a YouTube video link, such as youtube.com/watch?v=… or youtu.be/….",
  },
  {
    key: "slides",
    title: "Presentation slides",
    service: "canva",
    provider: "Canva",
    label: "Canva public view link",
    placeholder: "https://www.canva.com/design/…/view",
    instruction:
      "In Canva, choose Share → Public view link. Paste the full design link, not an edit link or a canva.link shortcut. If needed, enable Share → See all → Embed.",
    rules: [
      "No more than 12 pages: 10 pages of main content, plus one title page and one thank-you page.",
      "Use the official Demo Day slides template and follow the presentation guidelines.",
    ],
    error:
      "Use the full Canva public view link ending in /view. Edit links and canva.link shortcuts cannot be embedded.",
  },
  {
    key: "paper",
    title: "Research write-up",
    service: "drive",
    provider: "Google Drive · PDF",
    label: "Google Drive PDF link",
    placeholder: "https://drive.google.com/file/d/…/view",
    instruction:
      "Upload your write-up as a PDF. Set General access to Anyone with the link → Viewer, then copy the file link.",
    rules: [
      "Submit the final compiled PDF, complete and ready for review, through Google Drive.",
      "Use the official research write-up template and follow the paper guidelines.",
    ],
    error: "Use a Google Drive file link for your PDF, not a folder or a Google Docs editing link.",
  },
] as const

export function webUrl(value: string): URL | null {
  if (!value.trim() || value.length > 2048) return null
  try {
    const url = new URL(value.trim())
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url : null
  } catch {
    return null
  }
}

// Never use submitted URLs or HTML directly as iframe sources. Build an embed
// URL only for the three approved providers, retaining no arbitrary parameters.
export function materialEmbed(key: MaterialKey, value: string): MaterialEmbed | null {
  const url = webUrl(value)
  if (!url || url.port) return null
  const host = url.hostname.toLowerCase()
  if (key === "video") {
    let id: string | null = null
    if (host === "youtu.be") id = url.pathname.match(/^\/([\w-]+)\/?$/)?.[1] ?? null
    else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "www.youtube-nocookie.com",
        "youtube-nocookie.com",
      ].includes(host)
    ) {
      id =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : (url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)\/?$/)?.[1] ?? null)
    }
    return id && /^[\w-]{11}$/.test(id)
      ? {
          src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`,
          href: `https://www.youtube.com/watch?v=${id}`,
        }
      : null
  }
  if (key === "slides") {
    if (!["www.canva.com", "canva.com"].includes(host)) return null
    const path = url.pathname.match(/^\/design\/([\w-]+)(?:\/([\w-]+))?\/view\/?$/)
    if (!path) return null
    const href = `https://www.canva.com/design/${path[1]}${path[2] ? `/${path[2]}` : ""}/view`
    return { href, src: `${href}?embed` }
  }
  if (host !== "drive.google.com") return null
  const id =
    url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/(?:view|preview))?\/?$/)?.[1] ??
    (["/open", "/uc"].includes(url.pathname) ? url.searchParams.get("id") : null)
  if (!id || !/^[\w-]{10,200}$/.test(id)) return null
  const resourceKey = url.searchParams.get("resourcekey")
  const suffix =
    resourceKey && /^[\w-]{1,200}$/.test(resourceKey)
      ? `?resourcekey=${encodeURIComponent(resourceKey)}`
      : ""
  return {
    href: `https://drive.google.com/file/d/${id}/view${suffix}`,
    src: `https://drive.google.com/file/d/${id}/preview${suffix}`,
  }
}

export function materialError(key: MaterialKey, value: string): string | null {
  if (!value.trim()) return null
  if (materialEmbed(key, value)) return null
  return materialSpecs.find((item) => item.key === key)!.error
}

export function linkService(value: string): { icon: MaterialService; label: string } {
  const host = webUrl(value)?.hostname.replace(/^www\./, "")
  if (host === "github.com" || host === "gist.github.com")
    return { icon: "github", label: "GitHub" }
  if (host === "drive.google.com") return { icon: "drive", label: "Google Drive" }
  if (["youtube.com", "youtu.be", "m.youtube.com"].includes(host ?? ""))
    return { icon: "youtube", label: "YouTube" }
  if (host === "canva.com") return { icon: "canva", label: "Canva" }
  return { icon: "web", label: host ?? "Website" }
}

export function validAdditionalMaterials(value: unknown): value is AdditionalMaterial[] {
  if (!Array.isArray(value) || value.length > MAX_ADDITIONAL_MATERIALS) return false
  const ids = new Set<string>()
  return value.every((item: unknown) => {
    if (!item || typeof item !== "object") return false
    const link = item as Record<string, unknown>
    if (typeof link.id !== "string" || !link.id || link.id.length > 100 || ids.has(link.id))
      return false
    ids.add(link.id)
    return (
      typeof link.name === "string" &&
      link.name.trim().length > 0 &&
      link.name.length <= 100 &&
      typeof link.url === "string" &&
      webUrl(link.url) !== null
    )
  })
}
