import * as React from "react"

import { useInk } from "./use-ink"

/**
 * A faint, even grid of fine dots behind the programme timeline
 * that lights up under the mouse and leaves a fading tail where it has been.
 *
 * Each dot holds a little heat. Moving the pointer stamps heat onto the dots
 * along the path since the last move, so a fast swipe still leaves a solid
 * tail rather than a row of blobs, and heat cools over a few hundred
 * milliseconds. The loop only runs while something is still warm; at rest the
 * field is a single still frame. Mouse only: touch has no hover to follow.
 */
const PITCH = 9
const RADIUS = 130
const STEP = 10
const COOL_MS = 650
const BASE_ALPHA = 0.07

/** Seeded so the field doesn't reshuffle on every resize. */
function random(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

export function TrailBackdrop() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const ink = useInk(canvasRef)

  React.useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    const ctx = canvas?.getContext("2d")
    if (!canvas || !host || !ctx) return
    const [r, g, b] = ink
    let width = 0
    let height = 0
    let cols = 0
    let rows = 0
    let xs = new Float32Array(0)
    let ys = new Float32Array(0)
    let tone = new Float32Array(0)
    let heat = new Float32Array(0)
    let last: { x: number; y: number } | null = null
    let frame = 0
    let lastTick = 0

    const paint = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      for (let i = 0; i < xs.length; i++) {
        const h = heat[i]
        ctx.globalAlpha = tone[i] * (BASE_ALPHA + 0.5 * h)
        const size = 1.3 + 0.6 * h
        ctx.fillRect(xs[i] - size / 2, ys[i] - size / 2, size, size)
      }
      ctx.globalAlpha = 1
    }

    /** Warms the dots around one point, touching only nearby grid cells. */
    const stamp = (px: number, py: number) => {
      const reach = Math.ceil(RADIUS / PITCH) + 1
      const c0 = Math.round(px / PITCH)
      const r0 = Math.round(py / PITCH)
      for (let row = Math.max(0, r0 - reach); row <= Math.min(rows - 1, r0 + reach); row++) {
        for (let col = Math.max(0, c0 - reach); col <= Math.min(cols - 1, c0 + reach); col++) {
          const i = row * cols + col
          const d = Math.hypot(xs[i] - px, ys[i] - py)
          if (d >= RADIUS) continue
          // Gaussian, scaled so it has all but vanished by the edge.
          const falloff = Math.exp(-((d / RADIUS) ** 2) * 4)
          heat[i] = Math.max(heat[i], falloff)
        }
      }
    }

    const tick = (now: number) => {
      const elapsed = Math.min(now - lastTick, 100)
      lastTick = now
      const keep = Math.exp(-elapsed / COOL_MS)
      let warm = false
      for (let i = 0; i < heat.length; i++) {
        if (heat[i] === 0) continue
        heat[i] = heat[i] * keep < 0.004 ? 0 : heat[i] * keep
        if (heat[i] > 0) warm = true
      }
      paint()
      frame = warm ? requestAnimationFrame(tick) : 0
    }
    const wake = () => {
      if (frame) return
      lastTick = performance.now()
      frame = requestAnimationFrame(tick)
    }

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      const box = canvas.getBoundingClientRect()
      const x = event.clientX - box.left
      const y = event.clientY - box.top
      const from = last ?? { x, y }
      const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / STEP))
      for (let s = 1; s <= steps; s++) {
        stamp(from.x + ((x - from.x) * s) / steps, from.y + ((y - from.y) * s) / steps)
      }
      last = { x, y }
      wake()
    }
    const leave = () => {
      last = null
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const rand = random(20260910)
      cols = Math.ceil(width / PITCH)
      rows = Math.ceil(height / PITCH)
      xs = new Float32Array(cols * rows)
      ys = new Float32Array(cols * rows)
      tone = new Float32Array(cols * rows)
      heat = new Float32Array(cols * rows)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col
          xs[i] = (col + 0.5) * PITCH
          ys[i] = (row + 0.5) * PITCH
          tone[i] = 0.8 + rand() * 0.2
        }
      }
      paint()
    }

    const sizing = new ResizeObserver(resize)
    sizing.observe(canvas)
    host.addEventListener("pointermove", move)
    host.addEventListener("pointerleave", leave)
    resize()
    return () => {
      cancelAnimationFrame(frame)
      sizing.disconnect()
      host.removeEventListener("pointermove", move)
      host.removeEventListener("pointerleave", leave)
    }
  }, [ink])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 block size-full"
    />
  )
}
