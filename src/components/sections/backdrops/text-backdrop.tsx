import * as React from "react"
import { useReducedMotion } from "motion/react"

import { useCanvasSize, useInk, usePaper } from "./use-ink"

const WORDS = ["MRG", "RESEARCH", "BASECAMP", "UTAR", "2026"]
const PIXEL_STEP = 5
const HOLD_FRAMES = 200

type P = {
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  maxSpeed: number
  maxForce: number
  size: number
  dead: boolean
}

/**
 * Particles that swarm into the shape of a word, hold, then reform into the
 * next one. Adapted from the 21st.dev "particle text effect", changed for
 * this site:
 *
 *  - monochrome: the original picked a random RGB per word
 *  - the trail is painted in the page's paper colour, not hardcoded black,
 *    so it works on a white ground and inverts with the theme
 *  - sized to its container with device-pixel-ratio, not a fixed 1000x500
 *  - the right-click "destroy particles" interaction is dropped; suppressing
 *    the context menu on a hero is hostile
 *  - honours prefers-reduced-motion by drawing the first word statically
 */
export function TextBackdrop() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const hostRef = React.useRef<HTMLDivElement>(null)
  const { w, h } = useCanvasSize(canvasRef)
  const ink = useInk(hostRef)
  const paper = usePaper(hostRef)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { willReadFrequently: true })
    if (!canvas || !ctx || !w || !h) return

    const [ir, ig, ib] = ink
    const [pr, pg, pb] = paper
    const particles: P[] = []

    const offscreen = document.createElement("canvas")
    offscreen.width = w
    offscreen.height = h
    const off = offscreen.getContext("2d", { willReadFrequently: true })
    if (!off) return

    const randomEdge = () => {
      const a = Math.random() * Math.PI * 2
      const mag = (w + h) / 2
      return { x: w / 2 + Math.cos(a) * mag, y: h / 2 + Math.sin(a) * mag }
    }

    const setWord = (word: string) => {
      off.clearRect(0, 0, w, h)
      off.fillStyle = "#fff"
      off.textAlign = "center"
      off.textBaseline = "middle"

      // Shrink to fit: the longest word ("BASECAMP") overflows a narrow panel
      // at a fixed size, so measure and step down until it sits inside 78%.
      let size = Math.min(w * 0.2, h * 0.3)
      const maxWidth = w * 0.78
      for (let i = 0; i < 12; i++) {
        off.font = `400 ${size}px "Instrument Serif", Georgia, serif`
        if (off.measureText(word).width <= maxWidth) break
        size *= 0.9
      }
      off.fillText(word, w / 2, h / 2)

      const px = off.getImageData(0, 0, w, h).data
      const spots: number[] = []
      for (let i = 0; i < px.length; i += PIXEL_STEP * 4) {
        if (px[i + 3] > 0) spots.push(i)
      }
      for (let i = spots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[spots[i], spots[j]] = [spots[j], spots[i]]
      }

      let n = 0
      for (const s of spots) {
        const x = (s / 4) % w
        const y = Math.floor(s / 4 / w)
        let p = particles[n]
        if (!p) {
          const start = randomEdge()
          p = {
            x: start.x,
            y: start.y,
            vx: 0,
            vy: 0,
            tx: x,
            ty: y,
            maxSpeed: Math.random() * 5 + 3,
            maxForce: 0,
            size: Math.random() * 0.9 + 0.5,
            dead: false,
          }
          p.maxForce = p.maxSpeed * 0.06
          particles.push(p)
        }
        p.tx = x
        p.ty = y
        p.dead = false
        n++
      }
      for (let i = n; i < particles.length; i++) {
        const e = randomEdge()
        particles[i].tx = e.x
        particles[i].ty = e.y
        particles[i].dead = true
      }
    }

    const stepOne = (p: P) => {
      const dx = p.tx - p.x
      const dy = p.ty - p.y
      const d = Math.hypot(dx, dy)
      const slow = d < 100 ? d / 100 : 1
      if (d > 0.01) {
        const desiredX = (dx / d) * p.maxSpeed * slow
        const desiredY = (dy / d) * p.maxSpeed * slow
        let sx = desiredX - p.vx
        let sy = desiredY - p.vy
        const sm = Math.hypot(sx, sy)
        if (sm > p.maxForce) {
          sx = (sx / sm) * p.maxForce
          sy = (sy / sm) * p.maxForce
        }
        p.vx += sx
        p.vy += sy
      }
      p.x += p.vx
      p.y += p.vy
    }

    const paint = () => {
      for (const p of particles) {
        if (p.dead) continue
        ctx.fillStyle = `rgba(${ir},${ig},${ib},0.7)`
        ctx.fillRect(p.x, p.y, p.size + 0.6, p.size + 0.6)
      }
    }

    setWord(WORDS[0])

    if (reduced) {
      // Snap to the target shape and draw a single frame.
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x = p.tx
        p.y = p.ty
      }
      paint()
      return
    }

    let raf = 0
    let frame = 0
    let wordIndex = 0
    let visible = true

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!visible) return

      // Motion-blur trail in the page's own paper colour. This has to be
      // opaque enough to actually erase: at a low alpha the streaks compound
      // every frame and the panel silts up into a solid mass.
      ctx.fillStyle = `rgba(${pr},${pg},${pb},0.42)`
      ctx.fillRect(0, 0, w, h)

      for (const p of particles) stepOne(p)
      paint()

      frame++
      if (frame % HOLD_FRAMES === 0) {
        wordIndex = (wordIndex + 1) % WORDS.length
        setWord(WORDS[wordIndex])
      }
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
  }, [w, h, ink, paper, reduced])

  return (
    <div
      ref={hostRef}
      className="backdrop-veil absolute inset-y-0 right-0 w-full text-foreground lg:w-[56%]"
      aria-hidden
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
