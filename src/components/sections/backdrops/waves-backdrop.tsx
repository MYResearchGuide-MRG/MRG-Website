import * as React from "react"
import { useReducedMotion } from "motion/react"

import { useCanvasSize, useInk } from "./use-ink"

const LINES = 26

/**
 * Drifting contour lines — a refined take on the wave line-art the original
 * build had, redrawn on canvas so the phase can move. Each line is a sum of
 * two sines at different frequencies, offset down the field.
 */
export function WavesBackdrop() {
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

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      ctx.lineWidth = 1

      for (let i = 0; i < LINES; i++) {
        const p = i / (LINES - 1)
        // Lines bunch toward the lower half, thinning out as they rise.
        const baseY = h * (0.28 + p * 0.62)
        const amp = 26 + Math.sin(p * Math.PI) * 54
        const alpha = 0.09 + Math.sin(p * Math.PI) * 0.26

        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.beginPath()
        for (let x = 0; x <= w; x += 6) {
          const k = x / w
          const y =
            baseY +
            Math.sin(k * 5.2 + t * 0.00022 + p * 2.4) * amp +
            Math.sin(k * 2.1 - t * 0.00014 + p * 1.1) * amp * 0.5
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }

    if (reduced) {
      draw(0)
      return
    }

    let raf = 0
    let visible = true
    const loop = (t: number) => {
      if (visible) draw(t)
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
