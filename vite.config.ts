import path from "path"
import fs from "fs"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

/**
 * Serves the pre-redesign build (public/old/, produced by `bun run
 * build:legacy`) at /old/.
 *
 * Vite serves files under public/ verbatim but does not resolve a directory to
 * its index.html, so /old/ would 404 while only /old/index.html worked. This
 * rewrites the directory request in both dev and preview, and answers with a
 * hint when the legacy build hasn't been generated yet.
 */
function legacySite(): Plugin {
  const dir = path.resolve(__dirname, "public/old")

  const middleware = (
    req: { url?: string },
    res: {
      statusCode: number
      setHeader: (k: string, v: string) => void
      end: (body?: string) => void
    },
    next: () => void
  ) => {
    const url = req.url ?? ""
    if (url !== "/old" && url !== "/old/") return next()

    if (!fs.existsSync(path.join(dir, "index.html"))) {
      res.statusCode = 404
      res.setHeader("Content-Type", "text/html; charset=utf-8")
      res.end(
        `<!doctype html><meta charset="utf-8">
         <title>Legacy build missing</title>
         <body style="font:16px/1.6 ui-sans-serif,system-ui,sans-serif;max-width:38rem;margin:12vh auto;padding:0 1.5rem">
         <h1 style="font-size:1.35rem">The previous design hasn't been built yet</h1>
         <p>Run <code style="background:#eee;padding:.15em .4em">bun run build:legacy</code>, then reload this page.</p>
         <p><a href="/">Back to the current design</a></p>`
      )
      return
    }

    req.url = "/old/index.html"
    next()
  }

  return {
    name: "legacy-site",
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), legacySite()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
