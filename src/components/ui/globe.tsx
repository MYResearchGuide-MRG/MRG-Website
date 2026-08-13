import * as React from "react"
import createGlobe, { type COBEOptions } from "cobe"

import { cn } from "@/lib/utils"

/** cobe renders through WebGL; some environments don't provide a context. */
function hasWebGL() {
  try {
    const c = document.createElement("canvas")
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"))
  } catch {
    return false
  }
}

/**
 * COBE globe.
 *
 * Rewritten from the widely-copied snippet, which targets cobe v1 and does not
 * work as-is here:
 *
 *  - v2 removed the `onRender` option; the globe now re-renders on demand via
 *    `update()`, so rotation is driven from our own rAF loop.
 *  - `phi` and `width` were plain `let`s in the component body, so every
 *    re-render reset them and the globe collapsed to zero size.
 *  - `onRender` was a `useCallback` keyed on the drag offset, but the globe was
 *    built once with the first instance, so drag rotation never reached it.
 *
 * All mutable state lives in refs, which the single long-lived loop reads.
 */
export function Globe({
  className,
  config,
  fallback,
}: {
  className?: string
  config: COBEOptions
  /** Shown when WebGL is unavailable or the globe fails to initialise. */
  fallback?: React.ReactNode
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  // Capability check, not synchronisation: resolved once at mount so the
  // fallback renders on the first pass rather than after a second render.
  const [supported] = React.useState(hasWebGL)
  const [failed, setFailed] = React.useState(false)
  const phiRef = React.useRef(0)
  const widthRef = React.useRef(0)
  const dragStartRef = React.useRef<number | null>(null)
  const dragOffsetRef = React.useRef(0)
  const spinRef = React.useRef(0)

  const setCursor = (dragging: boolean) => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = dragging ? "grabbing" : "grab"
    }
  }

  const onPointerDown = (clientX: number) => {
    dragStartRef.current = clientX - dragOffsetRef.current
    setCursor(true)
  }

  const onPointerUp = () => {
    dragStartRef.current = null
    setCursor(false)
  }

  const onPointerMove = (clientX: number) => {
    if (dragStartRef.current === null) return
    dragOffsetRef.current = clientX - dragStartRef.current
    spinRef.current = dragOffsetRef.current / 200
  }

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!supported) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const measure = () => {
      // Fall back to the parent box: the canvas can measure 0 on the first
      // pass, and cobe would then be built at zero size and stay blank.
      widthRef.current =
        canvas.offsetWidth || canvas.parentElement?.offsetWidth || 0
    }
    measure()
    if (!widthRef.current) {
      queueMicrotask(() => setFailed(true))
      return
    }

    let globe: { update: (s: Partial<COBEOptions>) => void; destroy: () => void }
    try {
      globe = createGlobe(canvas, {
        ...config,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
      })
    } catch {
      queueMicrotask(() => setFailed(true))
      return
    }

    window.addEventListener("resize", measure)

    let raf = 0
    let visible = true
    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      if (dragStartRef.current === null && !reduced) {
        phiRef.current += 0.0035
      }
      globe.update({
        phi: phiRef.current + spinRef.current,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
      })
    }

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
      },
      { threshold: 0 }
    )
    io.observe(canvas)

    // One update paints the first frame even under reduced motion.
    globe.update({ phi: phiRef.current })

    // Reveal synchronously once the first frame is painted. Deferring this to
    // requestAnimationFrame left the canvas stuck at opacity 0 whenever the
    // effect re-ran (a theme change re-creates the globe) and the cleanup
    // cancelled the pending callback before it fired.
    canvas.style.opacity = "1"

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener("resize", measure)
      globe.destroy()
    }
  }, [config, supported])

  if (!supported || failed) {
    return (
      <div className={cn("aspect-square w-full", className)}>{fallback}</div>
    )
  }

  return (
    <div className={cn("aspect-square w-full", className)}>
      <canvas
        ref={canvasRef}
        className="size-full opacity-0 transition-opacity duration-700 [contain:layout_paint_size]"
        onPointerDown={(e) => onPointerDown(e.clientX)}
        onPointerUp={onPointerUp}
        onPointerOut={onPointerUp}
        onPointerMove={(e) => onPointerMove(e.clientX)}
        onTouchMove={(e) => e.touches[0] && onPointerMove(e.touches[0].clientX)}
      />
    </div>
  )
}
