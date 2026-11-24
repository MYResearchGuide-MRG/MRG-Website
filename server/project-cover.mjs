import sharp from "sharp"

const cache = new Map()
const maxBytes = 4 * 1024 * 1024
let cachedBytes = 0

function remember(key, image) {
  if (cache.has(key) || image.length > maxBytes) return
  while (cachedBytes + image.length > maxBytes) {
    const oldest = cache.keys().next().value
    cachedBytes -= cache.get(oldest).length
    cache.delete(oldest)
  }
  cache.set(key, image)
  cachedBytes += image.length
}

// Only the public Supabase key is used. Even a browser or process cache hit
// checks the current public row and version before returning pixels or a 304.
export async function projectCoverHandler(req, res, env = process.env) {
  res.setHeader("Cache-Control", "no-store")
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    res.writeHead(405).end()
    return
  }
  const params = new URL(req.url, "http://localhost").searchParams
  const id = params.get("id") || ""
  const version = params.get("v") || ""
  if (!/^[a-z0-9-]{1,100}$/.test(id) || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(version)) {
    res.writeHead(400).end()
    return
  }
  try {
    const url = new URL("/rest/v1/myssp_submissions", env.VITE_SUPABASE_URL)
    const key = [url.origin, id, version].join("/")
    let image = cache.get(key)
    const etag = '"cover-webp-1-' + version + '"'
    const revalidate = req.headers["if-none-match"] === etag
    url.search = new URLSearchParams({
      project_id: "eq." + id, cache_version: "eq." + version,
      select: image || revalidate ? "cache_version" : "cover:content->>coverImage",
    }).toString()
    const upstream = await fetch(url, {
      headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(8000),
    })
    if (!upstream.ok) throw new Error("Could not check publication")
    const [row] = await upstream.json()
    if (!row) { res.writeHead(404).end(); return }
    if (!image && !revalidate) {
      const prefix = "data:image/jpeg;base64,"
      if (!row.cover?.startsWith(prefix) || row.cover.length > 1500000) {
        res.writeHead(404).end()
        return
      }
      image = await sharp(Buffer.from(row.cover.slice(prefix.length), "base64"), { limitInputPixels: 20_000_000 })
        .rotate().resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 77, effort: 3 }).toBuffer()
      remember(key, image)
    }
    res.setHeader("Cache-Control", "private, no-cache")
    res.setHeader("ETag", etag)
    if (revalidate) { res.writeHead(304).end(); return }
    res.writeHead(200, { "Content-Type": "image/webp", "Content-Length": image.length, "X-Content-Type-Options": "nosniff" })
    res.end(image)
  } catch {
    res.writeHead(503).end()
  }
}
