import * as React from "react"
import { useReducedMotion } from "motion/react"

import { useCanvasSize, useInk } from "./use-ink"

type Node = { x: number; y: number; vx: number; vy: number; r: number }

const LINK_DIST = 132 // px; links only draw inside this radius
const MOUSE_RADIUS = 170

/**
 * Particle network. Adapted from the "Aether Flow" canvas hero, with the
 * changes that make it usable here:
 *
 *  - monochrome, painted in the live theme's ink instead of purple
 *  - transparent (the original filled itself black each frame, which would
 *    have blacked out a white page)
 *  - device-pixel-ratio aware, and sized to its container rather than to
 *    window.innerWidth
 *  - the O(n^2) link pass is bucketed into a uniform grid, so cost scales with
 *    local density rather than total particle count
 *  - honours prefers-reduced-motion (renders one static frame) and stops
 *    animating while scrolled out of view
 */
export function NeuronBackdrop() {
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
    const count = Math.min(120, Math.round((w * h) / 13000))
    const nodes: Node[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      r: Math.random() * 1.4 + 0.8,
    }))

    const mouse = { x: -9999, y: -9999 }
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    const onLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerleave", onLeave)

    // Uniform grid so each node only tests its 9 neighbouring buckets.
    const cell = LINK_DIST
    const cols = Math.max(1, Math.ceil(w / cell))
    const rows = Math.max(1, Math.ceil(h / cell))

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      const buckets: number[][] = Array.from({ length: cols * rows }, () => [])
      nodes.forEach((n, i) => {
        const cx = Math.min(cols - 1, Math.max(0, Math.floor(n.x / cell)))
        const cy = Math.min(rows - 1, Math.max(0, Math.floor(n.y / cell)))
        buckets[cy * cols + cx].push(i)
      })

      ctx.lineWidth = 1
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const here = buckets[cy * cols + cx]
          if (!here.length) continue
          for (let ox = 0; ox <= 1; ox++) {
            for (let oy = ox === 0 ? 0 : -1; oy <= 1; oy++) {
              const nx = cx + ox
              const ny = cy + oy
              if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
              const there = buckets[ny * cols + nx]
              for (const a of here) {
                for (const bIdx of there) {
                  if (bIdx <= a && ox === 0 && oy === 0) continue
                  const p = nodes[a]
                  const q = nodes[bIdx]
                  const dx = p.x - q.x
                  const dy = p.y - q.y
                  const d2 = dx * dx + dy * dy
                  if (d2 > LINK_DIST * LINK_DIST) continue
                  const t = 1 - Math.sqrt(d2) / LINK_DIST
                  const near =
                    Math.hypot(p.x - mouse.x, p.y - mouse.y) < MOUSE_RADIUS
                  ctx.strokeStyle = `rgba(${r},${g},${b},${
                    t * (near ? 0.34 : 0.14)
                  })`
                  ctx.beginPath()
                  ctx.moveTo(p.x, p.y)
                  ctx.lineTo(q.x, q.y)
                  ctx.stroke()
                }
              }
            }
          }
        }
      }

      ctx.fillStyle = `rgba(${r},${g},${b},0.42)`
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const step = () => {
      for (const n of nodes) {
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1

        const dx = mouse.x - n.x
        const dy = mouse.y - n.y
        const dist = Math.hypot(dx, dy)
        if (dist < MOUSE_RADIUS && dist > 0.01) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS
          n.x -= (dx / dist) * force * 2.4
          n.y -= (dy / dist) * force * 2.4
        }

        n.x += n.vx
        n.y += n.vy
      }
      draw()
    }

    if (reduced) {
      draw()
      return () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerleave", onLeave)
      }
    }

    let raf = 0
    let visible = true
    const loop = () => {
      if (visible) step()
      raf = requestAnimationFrame(loop)
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
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerleave", onLeave)
    }
  }, [w, h, ink, reduced])

  return (
    <div
      ref={hostRef}
      className="backdrop-veil absolute inset-0 text-foreground"
      aria-hidden
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
