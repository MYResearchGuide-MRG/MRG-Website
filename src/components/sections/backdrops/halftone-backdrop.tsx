import * as React from "react"
import { useReducedMotion } from "motion/react"

import styles from "../stay-connected.module.css"

/**
 * A slowly drifting ordered-halftone dot field on black, ported from
 * MYResearchGuide's community invitation banner. Coherent waves move the
 * density across a 4×4 Bayer screen, so dots fade in and out smoothly rather
 * than flickering. Paints at 30fps, only while on screen and the tab is
 * visible; reduced-motion users get a single still frame.
 */
const SCREEN = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const FRAME_INTERVAL_MS = 1000 / 30
const PHASE_PER_MS = 0.00072
// Brightest shade paint() can produce, so each grey gets one batched fill.
const MAX_SHADE = 160
const FILLS = Array.from(
  { length: MAX_SHADE + 1 },
  (_, shade) => `rgb(${shade},${shade},${shade})`
)
type Dot = {
  x: number
  y: number
  phaseX: number
  phaseY: number
  threshold: number
}

export function HalftoneBackdrop() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const timeRef = React.useRef(0)
  const reducedMotion = useReducedMotion()

  React.useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { alpha: false })
    if (!canvas || !ctx) return
    let width = 0
    let height = 0
    let dots: Dot[] = []
    let visible = false
    let frame = 0
    let lastPaint = 0
    let disposed = false

    const paint = () => {
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, width, height)
      const time = timeRef.current
      // Group dots by grey and fill each group once: setting fillStyle per
      // dot (tens of thousands a frame) is what canvas spends its time on.
      const paths: Path2D[] = []
      for (const dot of dots) {
        const field =
          0.46 +
          0.3 *
            Math.sin(dot.phaseX + time) *
            Math.cos(dot.phaseY - time * 0.5) +
          0.19 * Math.sin(dot.phaseX * 0.7 + dot.phaseY * 1.3 + time * 0.5)
        const density = Math.max(0, (field - 0.22) * 1.15)
        const amount = Math.min(
          1,
          Math.max(0, (density - dot.threshold + 0.09) / 0.18)
        )
        const alpha = amount * amount * (3 - 2 * amount)
        if (alpha < 0.01) continue
        const shade = Math.min(
          MAX_SHADE,
          Math.round(5 + alpha * (68 + density * 65))
        )
        const path = (paths[shade] ??= new Path2D())
        path.rect(dot.x, dot.y, 1.8, 1.8)
      }
      paths.forEach((path, shade) => {
        ctx.fillStyle = FILLS[shade]
        ctx.fill(path)
      })
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      dots = []
      const pitch = width < 600 ? 4.5 : 4
      for (let row = 0; row < height / pitch; row++) {
        for (let col = 0; col < width / pitch; col++) {
          const x = col * pitch + 1
          const y = row * pitch + 1
          dots.push({
            x,
            y,
            phaseX: x / 150 + y / 240,
            phaseY: y / 90 - x / 380,
            threshold: (SCREEN[(row % 4) * 4 + (col % 4)] + 0.5) / 16,
          })
        }
      }
      paint()
    }

    const tick = (now: number) => {
      if (disposed) return
      const elapsed = now - lastPaint
      if (elapsed >= FRAME_INTERVAL_MS) {
        timeRef.current += Math.min(elapsed, 100) * PHASE_PER_MS
        lastPaint = now
        paint()
      }
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      frame = 0
      if (visible && !document.hidden && !reducedMotion) {
        lastPaint = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }
    const visibility = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        sync()
      },
      { threshold: 0.05 }
    )
    const sizing = new ResizeObserver(resize)
    visibility.observe(canvas)
    sizing.observe(canvas)
    document.addEventListener("visibilitychange", sync)
    resize()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      visibility.disconnect()
      sizing.disconnect()
      document.removeEventListener("visibilitychange", sync)
    }
  }, [reducedMotion])

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
      <div className={styles.shade} aria-hidden />
    </>
  )
}
