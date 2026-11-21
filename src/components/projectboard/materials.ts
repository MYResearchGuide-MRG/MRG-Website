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
      "Upload your video to YouTube, set it to Public or Unlisted, then paste the video link.",
    rules: [
      "2–3 minutes, for a general audience, at a minimum resolution of 1080p. Videos outside this length will not be accepted.",
      "Keep audio clear throughout and minimise background noise.",
      "Slides, diagrams, footage and screen recordings are allowed. Avoid heavy transitions and visual or sound effects.",
      "No software logos may appear anywhere in the video.",
      "All team members must appear on camera and speak, with speaking time equally distributed.",
    ],
  },
  {
    key: "slides",
    title: "Presentation slides",
    service: "canva",
    provider: "Canva",
    label: "Canva slides link",
    placeholder: "https://www.canva.com/design/…/view",
    instruction:
      "Paste a Canva share link or embed code. We prepare the slide preview automatically. Canva short links also work.",
    rules: [
      "No more than 12 pages: 10 pages of main content, plus one title page and one thank-you page.",
      "Use the official Demo Day slides template and follow the presentation guidelines.",
    ],
  },
  {
    key: "paper",
    title: "Research write-up",
    service: "drive",
    provider: "Google Drive PDF",
    label: "Google Drive PDF link",
    placeholder: "https://drive.google.com/file/d/…/view",
    instruction:
      "Upload the final PDF to Google Drive and paste its file link. Set General access to Anyone with the link · Viewer. Use a file, not a folder or editable Google Doc.",
    rules: [
      "Submit the final compiled PDF, complete and ready for review.",
      "Use the official research write-up template and follow the paper guidelines.",
    ],
  },
] as const

export function webUrl(value: string): URL | null {
  if (!value.trim() || value.length > 2048) return null
  try {
    const url = new URL(value.trim())
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url
      : null
  } catch {
    return null
  }
}

// Never use submitted URLs or HTML directly as iframe sources. Build an embed
// URL only for the three approved providers, retaining no arbitrary parameters.
export function materialEmbed(
  key: MaterialKey,
  value: string
): MaterialEmbed | null {
  const url = webUrl(value)
  if (!url || url.port) return null
  const host = url.hostname.toLowerCase()
  if (key === "video") {
    let id: string | null = null
    if (host === "youtu.be")
      id = url.pathname.match(/^\/([\w-]+)\/?$/)?.[1] ?? null
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
          : (url.pathname.match(
              /^\/(?:embed|shorts|live)\/([\w-]+)\/?$/
            )?.[1] ?? null)
    }
    return id && /^[\w-]{11}$/.test(id)
      ? {
          src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`,
          href: `https://www.youtube.com/watch?v=${id}`,
        }
      : null
  }
  if (key === "slides" && ["www.canva.com", "canva.com"].includes(host)) {
    const path = url.pathname.match(
      /^\/design\/([\w-]+)(?:\/([\w-]+))?\/(?:view|edit|watch)\/?$/
    )
    if (!path) return null
    const href = `https://www.canva.com/design/${path[1]}${path[2] ? `/${path[2]}` : ""}/view`
    return { href, src: `${href}?embed` }
  }
  if (key !== "paper" || host !== "drive.google.com") return null
  const id =
    url.pathname.match(
      /^\/file\/(?:u\/\d+\/)?d\/([\w-]+)(?:\/(?:view|preview|edit))?\/?$/
    )?.[1] ??
    (["/open", "/uc"].includes(url.pathname)
      ? url.searchParams.get("id")
      : null)
  if (!id || !/^[\w-]{1,200}$/.test(id)) return null
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
  const url = webUrl(value)
  if (
    !url ||
    url.port ||
    Array.from(value).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
    )
  )
    return "Enter a complete HTTPS share link, without HTML or sign-in details."
  if (
    materialEmbed(key, value) ||
    (key === "slides" && isCanvaShortLink(value))
  )
    return null
  if (key === "paper" && url.hostname === "drive.google.com" && url.pathname.includes("/folders/"))
    return "Choose the individual file in Google Drive and copy its share link, not the folder link."
  if (key === "paper" && url.hostname === "docs.google.com")
    return "Export the write-up as a PDF, upload it to Google Drive, then paste the PDF file’s share link."
  return key === "video"
    ? "Use a YouTube video link."
    : key === "slides"
      ? "Use a Canva design or Canva short link."
      : "Use a Google Drive link to the final PDF file."
}

export function isCanvaShortLink(value: string): boolean {
  const url = webUrl(value)
  return Boolean(
    url &&
    !url.port &&
    ["canva.link", "www.canva.link"].includes(url.hostname) &&
    /^\/[\w-]+\/?$/.test(url.pathname)
  )
}

/** Extract a URL from Canva's copied embed code; never render pasted HTML. */
export function canvaLinkFromPaste(value: string): string | null {
  const text = value.trim()
  if (!text || text.length > 20_000) return null
  const direct = materialEmbed("slides", text)
  if (direct) return direct.href
  if (isCanvaShortLink(text)) return text
  for (const match of text.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi)) {
    const source = match[2].replace(/&(?:amp|#38|#x26);/gi, "&")
    const embed = materialEmbed("slides", source)
    if (embed) return embed.href
  }
  return null
}

/** A provider match cannot prove public permissions or the file's actual contents. */
export function materialHint(key: MaterialKey, value: string): string | null {
  if (!value.trim() || materialError(key, value)) return null
  if (isCanvaShortLink(value))
    return "Canva short link accepted. Preview preparation may need the full public view link if Canva blocks the lookup."
  if (
    webUrl(value)?.hostname.includes("canva.com") &&
    /\/edit(?:[/?#]|$)/.test(value)
  )
    return "We can prepare a viewer preview, but the design must also be shared publicly. Use Canva’s public view link if it asks viewers to sign in."
  return key === "paper"
    ? "Drive file recognised. Check that it opens a PDF in a private browser window without signing in."
    : "Link recognised. Check that it opens without signing in; preview availability depends on the provider."
}

export function linkService(value: string): {
  icon: MaterialService
  label: string
} {
  const host = webUrl(value)?.hostname.replace(/^www\./, "")
  if (host === "github.com" || host === "gist.github.com")
    return { icon: "github", label: "GitHub" }
  if (host === "drive.google.com")
    return { icon: "drive", label: "Google Drive" }
  if (
    host === "docs.google.com" &&
    webUrl(value)?.pathname.startsWith("/presentation/")
  )
    return { icon: "drive", label: "Google Slides" }
  if (["youtube.com", "youtu.be", "m.youtube.com"].includes(host ?? ""))
    return { icon: "youtube", label: "YouTube" }
  if (host === "canva.com" || host === "canva.link")
    return { icon: "canva", label: "Canva" }
  return { icon: "web", label: host ?? "Website" }
}

export function validAdditionalMaterials(
  value: unknown
): value is AdditionalMaterial[] {
  if (!Array.isArray(value) || value.length > MAX_ADDITIONAL_MATERIALS)
    return false
  const ids = new Set<string>()
  return value.every((item: unknown) => {
    if (!item || typeof item !== "object") return false
    const link = item as Record<string, unknown>
    if (
      typeof link.id !== "string" ||
      !link.id ||
      link.id.length > 100 ||
      ids.has(link.id)
    )
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
