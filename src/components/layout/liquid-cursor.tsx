import * as React from "react"
import { useReducedMotion } from "motion/react"

const BASE = 40 // px; the element's drawn size, scaled down to the dot
const DOT = 12
const HOVER = 44
const PRESS = 8
const INTERACTIVE = "a, button, [role='button'], summary, label, select"

/**
 * A white dot that replaces the pointer and moves like a drop of liquid: it
 * trails the real pointer slightly, stretches along the direction it is
 * moving (more the faster it goes) and settles back into a circle when it
 * stops. Over anything clickable it swells; while pressed it shrinks.
 *
 * Drawn with mix-blend-difference, so it shows as white on dark surfaces and
 * inverts to dark on light ones rather than vanishing.
 *
 * Only for a mouse or trackpad (pointer: fine) and only without
 * prefers-reduced-motion. Touch screens and reduced-motion users keep the
 * system cursor, because then this would either never show or only lag.
 */
export function LiquidCursor() {
  const reduced = useReducedMotion()
  const dotRef = React.useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = React.useState(false)

  React.useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)")
    const update = () => setEnabled(fine.matches && !reduced)
    update()
    fine.addEventListener("change", update)
    return () => fine.removeEventListener("change", update)
  }, [reduced])

  React.useEffect(() => {
    const dot = dotRef.current
    if (!enabled || !dot) return

    document.documentElement.classList.add("liquid-cursor")

    const target = { x: -100, y: -100 }
    const pos = { x: -100, y: -100 }
    let size = DOT
    let targetSize = DOT
    let pressed = false
    let hovering = false
    let visible = false
    let angle = 0
    let stretch = 0

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX
      target.y = e.clientY
      if (!visible) {
        // Arrive in place instead of sliding in from the last exit point.
        pos.x = target.x
        pos.y = target.y
        visible = true
        dot.style.opacity = "1"
      }
      hovering = !!(e.target as Element | null)?.closest?.(INTERACTIVE)
    }
    const onDown = () => (pressed = true)
    const onUp = () => (pressed = false)
    const onLeave = () => {
      visible = false
      dot.style.opacity = "0"
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)
    document.documentElement.addEventListener("pointerleave", onLeave)

    let raf = 0
    const tick = () => {
      const px = pos.x
      const py = pos.y
      pos.x += (target.x - pos.x) * 0.28
      pos.y += (target.y - pos.y) * 0.28
      const vx = pos.x - px
      const vy = pos.y - py
      const speed = Math.hypot(vx, vy)

      // Stretch eases in and out so the drop wobbles back to round.
      stretch += (Math.min(speed / 28, 0.55) - stretch) * 0.25
      if (speed > 0.4) angle = Math.atan2(vy, vx)

      targetSize = pressed ? PRESS : hovering ? HOVER : DOT
      size += (targetSize - size) * 0.2

      const s = size / BASE
      dot.style.transform =
        `translate3d(${pos.x - BASE / 2}px, ${pos.y - BASE / 2}px, 0) ` +
        `rotate(${angle}rad) scale(${s * (1 + stretch)}, ${s * (1 - stretch * 0.45)})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove("liquid-cursor")
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={dotRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[100] rounded-full bg-white opacity-0 mix-blend-difference transition-opacity duration-200 will-change-transform"
      style={{ width: BASE, height: BASE }}
    />
  )
}
