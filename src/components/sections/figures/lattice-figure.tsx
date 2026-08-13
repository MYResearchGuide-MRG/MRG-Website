import * as React from "react"
import { useReducedMotion } from "motion/react"

import { useCanvasSize, useInk } from "../backdrops/use-ink"

/** Icosahedron built from the golden-ratio rectangles. */
function icosahedron() {
  const t = (1 + Math.sqrt(5)) / 2
  const v: [number, number, number][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ]
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ]
  // Unique edges, so shared ones aren't stroked twice.
  const seen = new Set<string>()
  const edges: [number, number][] = []
  for (const f of faces) {
    for (let i = 0; i < 3; i++) {
      const a = f[i]
      const b = f[(i + 1) % 3]
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      if (!seen.has(key)) {
        seen.add(key)
        edges.push([a, b])
      }
    }
  }
  const norm = Math.hypot(1, t)
  return { verts: v.map((p) => p.map((n) => n / norm) as [number, number, number]), edges }
}

const { verts, edges } = icosahedron()

/**
 * Rotating wireframe icosahedron. Painted on canvas rather than as SVG path
 * data so the projection can be recomputed per frame, with depth cueing —
 * edges further from the camera are drawn fainter and thinner.
 */
export function LatticeFigure({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const hostRef = React.useRef<HTMLDivElement>(null)
  const { w, h } = useCanvasSize(canvasRef)
  const ink = useInk(hostRef)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !w || !h) return

    const [r, g, b] = ink
    const radius = Math.min(w, h) * 0.36
    const cx = w / 2
    const cy = h / 2

    const draw = (ax: number, ay: number) => {
      ctx.clearRect(0, 0, w, h)

      const proj = verts.map(([x, y, z]) => {
        // rotate Y then X
        const x1 = x * Math.cos(ay) - z * Math.sin(ay)
        const z1 = x * Math.sin(ay) + z * Math.cos(ay)
        const y2 = y * Math.cos(ax) - z1 * Math.sin(ax)
        const z2 = y * Math.sin(ax) + z1 * Math.cos(ax)
        const persp = 2.6 / (2.6 + z2)
        return {
          x: cx + x1 * radius * persp,
          y: cy + y2 * radius * persp,
          depth: (z2 + 1) / 2, // 0 = far, 1 = near
        }
      })

      for (const [a, e] of edges) {
        const p = proj[a]
        const q = proj[e]
        const d = (p.depth + q.depth) / 2
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.1 + d * 0.5})`
        ctx.lineWidth = 0.6 + d * 0.9
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      }

      for (const p of proj) {
        ctx.fillStyle = `rgba(${r},${g},${b},${0.2 + p.depth * 0.7})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1 + p.depth * 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (reduced) {
      draw(-0.35, 0.6)
      return
    }

    let raf = 0
    let t = 0
    let visible = true
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!visible) return
      t += 1
      draw(-0.35 + Math.sin(t * 0.0022) * 0.22, t * 0.0042)
    }
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
      },
      { threshold: 0 }
    )
    if (hostRef.current) io.observe(hostRef.current)
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [w, h, ink, reduced])

  return (
    <div className={className} aria-hidden>
      <div ref={hostRef} className="relative aspect-square w-full text-foreground">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    </div>
  )
}
