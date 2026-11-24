import path from "path"
import fs from "fs"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from "vite"
// @ts-expect-error The same plain Node handler also runs on Vercel and in the local preview.
import { canvaLinkHandler } from "./server/canva-link.mjs"

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

function serveProjectCovers(server: ViteDevServer | PreviewServer) {
  server.middlewares.use(async (req, res, next) => {
    if (req.url?.split("?")[0] !== "/api/project-cover") return next()
    // @ts-expect-error Shared JavaScript handler also runs on Vercel.
    const { projectCoverHandler } = await import("./server/project-cover.mjs")
    await projectCoverHandler(req, res, server.config.env)
  })
}

function projectImages(): Plugin {
  let backendOrigin: string | undefined
  return {
    name: "project-cover-previews",
    configResolved({ env }) {
      if (env.VITE_SUPABASE_URL) backendOrigin = new URL(env.VITE_SUPABASE_URL).origin
    },
    transformIndexHtml() {
      return backendOrigin ? [{
        tag: "link",
        attrs: { rel: "preconnect", href: backendOrigin, crossorigin: "anonymous" },
        injectTo: "head-prepend",
      }] : []
    },
    configureServer: serveProjectCovers,
    configurePreviewServer: serveProjectCovers,
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacySite(),
    {
      name: "canva-share-links",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split("?")[0] === "/api/canva-link")
            void canvaLinkHandler(req, res)
          else next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split("?")[0] === "/api/canva-link")
            void canvaLinkHandler(req, res)
          else next()
        })
      },
    },
    projectImages(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
