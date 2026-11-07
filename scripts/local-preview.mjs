import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const root = path.join(workspace, "dist")
const args = process.argv.slice(2)
const portIndex = args.indexOf("--port")
const port = portIndex < 0 ? 5176 : Number(args[portIndex + 1])
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Use a port between 1024 and 65535.")

if (args.includes("--build")) {
  const build = spawnSync(process.execPath, [path.join(workspace, "node_modules/vite/bin/vite.js"), "build"], {
    cwd: workspace,
    env: { ...process.env, VITE_ACCESS_MODE: "preview" },
    stdio: "inherit",
  })
  if (build.status !== 0) process.exit(build.status || 1)
}
if (!fs.existsSync(path.join(root, "index.html"))) throw new Error("Build the preview first with npm run preview:local.")

const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
  ".ttf": "font/ttf", ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm",
}
const insideRoot = file => file === root || file.startsWith(root + path.sep)

// Local only. Send complete buffers with a known length: the streaming/gzip
// preview responses stall on this Windows setup before scripts finish loading.
const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname)
    let file = path.resolve(root, "." + pathname)
    if (!insideRoot(file)) { res.writeHead(403); res.end(); return }
    if (file === root || !path.extname(file)) file = path.join(root, "index.html")
    if (!insideRoot(fs.realpathSync(file))) { res.writeHead(403); res.end(); return }
    const data = fs.readFileSync(file)
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": "no-store",
      "Connection": "close",
      "X-Content-Type-Options": "nosniff",
    })
    res.end(req.method === "HEAD" ? undefined : data)
  } catch (error) {
    res.writeHead(error instanceof URIError ? 400 : 404, { "Connection": "close" })
    res.end("Not found")
  }
})
server.on("error", error => {
  console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use. Stop the old preview or pass --port 5179.` : error.message)
  process.exitCode = 1
})
server.listen(port, "127.0.0.1", () => console.log(`Local preview: http://127.0.0.1:${port}/#/admin`))
