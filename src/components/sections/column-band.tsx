import * as React from "react"
import { useReducedMotion } from "motion/react"

/**
 * A full-width band of columns between the eligibility section and the FAQ,
 * on the page's own background. Each column is a thin rod with blocks on it:
 * at the left a cap at either end, and further right the caps give way to a
 * single block riding the middle of the rod, while the columns dim toward the
 * right edge without ever quite going out.
 *
 * The shapes are driven by scrolling, not by time: as the band travels up the
 * screen a wave runs along it, and scrolling back plays it in reverse. Under
 * reduced motion it holds one still frame.
 */
// Target spacing between columns, in px; the count follows the width.
const PITCH = 34
const BACKGROUND = 18

const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

export function ColumnBand() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    let width = 0
    let height = 0
    let frame = 0
    let visible = false

    /** 0 as the band enters at the bottom of the screen, 1 as it leaves the top. */
    const progress = () => {
      const box = canvas.getBoundingClientRect()
      const span = window.innerHeight + box.height
      return Math.min(1, Math.max(0, (window.innerHeight - box.top) / span))
    }

    const paint = () => {
      frame = 0
      ctx.clearRect(0, 0, width, height)
      const wave = reduced ? 1.6 : progress() * 2 * Math.PI * 1.2
      const count = Math.max(10, Math.round(width / PITCH))
      const pitch = width / count
      const cap = pitch * 0.42
      const rod = Math.max(2, pitch * 0.14)
      for (let i = 0; i < count; i++) {
        // How far along the band, nudged back and forth by the wave so each
        // column's shape drifts between its neighbours'.
        const along = i / (count - 1)
        const p = along + 0.09 * Math.sin(wave + i * 0.38)
        const x = i * pitch + (pitch - cap) / 2
        const mid = x + (cap - rod) / 2

        // Bright at the left, dimming to a faint trace at the right.
        const shade = BACKGROUND + 10 + 62 * Math.pow(1 - along, 1.3)
        const low = BACKGROUND + (shade - BACKGROUND) * 0.55
        const gradient = ctx.createLinearGradient(0, 0, 0, height)
        gradient.addColorStop(0, `rgb(${shade},${shade},${shade})`)
        gradient.addColorStop(1, `rgb(${low},${low},${low})`)
        ctx.fillStyle = gradient

        // End caps shrink away over the first half of the band.
        const top =
          height * 0.3 * Math.pow(1 - smooth(p * 1.9), 1.2) + height * 0.05
        const bottom = height * 0.24 * Math.pow(1 - smooth(p * 2.1), 1.3)
        // The riding block grows in from the middle and drifts up as it goes.
        const block = height * 0.2 * smooth((p - 0.25) * 3)
        const centre = height * (0.58 - 0.24 * smooth((p - 0.3) * 1.6))

        ctx.fillRect(mid, 0, rod, height)
        ctx.fillRect(x, 0, cap, top)
        if (bottom > 1) ctx.fillRect(x, height - bottom, cap, bottom)
        if (block > 1) {
          const w = cap * 0.8
          ctx.fillRect(x + (cap - w) / 2, centre - block / 2, w, block)
        }
      }
    }
    const request = () => {
      if (visible && !frame) frame = requestAnimationFrame(paint)
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      paint()
    }

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      request()
    })
    const sizing = new ResizeObserver(resize)
    visibility.observe(canvas)
    sizing.observe(canvas)
    if (!reduced) window.addEventListener("scroll", request, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      visibility.disconnect()
      sizing.disconnect()
      window.removeEventListener("scroll", request)
    }
  }, [reduced])

  return (
    <div aria-hidden className="content-container my-8 md:my-12">
      <canvas
        ref={canvasRef}
        className="block h-[clamp(100px,11vw,160px)] w-full"
      />
    </div>
  )
}
