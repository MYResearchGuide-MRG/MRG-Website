import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import type { LucideIcon } from "lucide-react"

/**
 * The eligibility criteria as an isometric stack of thin plates, one per
 * requirement, drawn in hairline strokes over a drifting halftone cloud (the
 * same dot language as MYResearchGuide's MYSSP network graphic).
 *
 * The stack opens a gap above the active plate, so its face shows that
 * criterion's icon inside a pair of turning dotted rings, and dotted guides
 * join the two halves with a dot running down each. `active` is driven by the
 * section: it cycles on its own and follows whichever row is hovered.
 *
 * Decorative: the rows beside it carry the same information as text.
 */

// Plate geometry, in viewBox units. A 2:1 isometric rhombus of half-width W
// and half-height H, with an edge of thickness T, stacked S apart.
const W = 130
const H = 65
const T = 10
const S = 24
const LIFT = 84
const CX = 180
const Y0 = 82
const VIEW_W = 360
const VIEW_H = 384

const ease = [0.16, 1, 0.3, 1] as const

export function EligibilityStack({
  items,
  active,
}: {
  items: { title: string; Icon: LucideIcon }[]
  active: number
}) {
  const reduced = useReducedMotion()
  // The gap opens above the active plate; for the top plate, below it.
  const gap = Math.max(active, 1)
  const plateY = (i: number) => Y0 + LIFT + i * S - (i < gap ? LIFT : 0)
  const upper = plateY(gap - 1)
  const lower = plateY(gap)
  const duration = reduced ? 0 : 0.8

  const plates = items.map((item, i) => {
    const isActive = i === active
    const stroke = isActive ? "#e8e8e8" : i === 0 ? "#7a7a7a" : "#3f3f3f"
    return (
      <motion.g
        key={item.title}
        initial={false}
        animate={{ y: plateY(i) }}
        transition={{ duration, ease }}
      >
        <g
          stroke={stroke}
          strokeWidth={1}
          strokeLinejoin="round"
          className="transition-[stroke] duration-500"
        >
          <path
            d={`M ${CX - W} 0 L ${CX} ${H} L ${CX} ${H + T} L ${CX - W} ${T} Z`}
            fill="#050505"
          />
          <path
            d={`M ${CX + W} 0 L ${CX} ${H} L ${CX} ${H + T} L ${CX + W} ${T} Z`}
            fill="#050505"
          />
          <path
            d={`M ${CX} ${-H} L ${CX + W} 0 L ${CX} ${H} L ${CX - W} 0 Z`}
            fill="#0a0a0a"
          />
          {/* An inner hairline set in from the front edges, as on a machined
              plate. */}
          <path
            d={`M ${CX - W + 16} 0 L ${CX} ${H - 8} L ${CX + W - 16} 0`}
            fill="none"
            stroke="#262626"
          />
        </g>

        {/* The face, drawn in the plate's own flat coordinates (a unit
            square) and projected onto the rhombus, so the rings and icon lie
            in the plate rather than facing the viewer. */}
        <motion.g
          initial={false}
          animate={{ opacity: isActive ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 0.5, delay: isActive ? 0.25 : 0 }}
          transform={`matrix(${W} ${H} ${-W} ${H} ${CX} ${-H})`}
        >
          <g className="origin-center [transform-box:fill-box] motion-safe:animate-[spin_26s_linear_infinite]">
            <circle
              cx={0.5}
              cy={0.5}
              r={0.3}
              fill="none"
              stroke="#d4d4d4"
              strokeWidth={1.4}
              strokeDasharray="0.1 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <g className="origin-center [transform-box:fill-box] motion-safe:animate-[spin_40s_linear_infinite_reverse]">
            <circle
              cx={0.5}
              cy={0.5}
              r={0.37}
              fill="none"
              stroke="#5c5c5c"
              strokeWidth={1.4}
              strokeDasharray="0.1 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <item.Icon
            x={0.36}
            y={0.36}
            width={0.28}
            height={0.28}
            color="#f0f0f0"
            strokeWidth={0.9}
          />
        </motion.g>
      </motion.g>
    )
  })

  // Dotted guides across the gap, at the plate's two side corners and its
  // front corner, each with a dot running down it.
  const guides = [
    { x: CX - W, from: upper + T, to: lower },
    { x: CX + W, from: upper + T, to: lower },
    { x: CX, from: upper + H + T, to: lower + H },
  ]

  return (
    <div aria-hidden className="relative aspect-[360/384] w-full max-w-[340px]">
      <HalftoneCloud />
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="relative block size-full overflow-visible"
      >
        {/* Bottom plate first, so each plate covers the one beneath it. The
            guides go in just above the lower half of the gap, under the
            plates that hang over it. */}
        {plates
          .map((plate, i) => ({ plate, i }))
          .reverse()
          .map(({ plate, i }) => (
            <React.Fragment key={i}>
              {plate}
              {i === gap && (
                <motion.g
                  key={`guides-${gap}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.55 }}
                >
                  {guides.map((g, n) => (
                    <React.Fragment key={n}>
                      <line
                        x1={g.x}
                        x2={g.x}
                        y1={g.from}
                        y2={g.to}
                        stroke="#6b6b6b"
                        strokeWidth={1}
                        strokeDasharray="1 4"
                        strokeLinecap="round"
                      />
                      {!reduced && (
                        <motion.rect
                          x={g.x - 1.25}
                          width={2.5}
                          height={2.5}
                          fill="#f0f0f0"
                          initial={{ y: g.from, opacity: 0 }}
                          animate={{
                            y: [g.from, g.to],
                            opacity: [0, 1, 1, 0],
                          }}
                          transition={{
                            duration: 1.8,
                            delay: 0.6 + n * 0.35,
                            repeat: Infinity,
                            repeatDelay: 0.6,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </motion.g>
              )}
            </React.Fragment>
          ))}
      </svg>

    </div>
  )
}

/**
 * A soft halftone cloud behind the stack: a fixed grid of dots whose
 * brightness follows slow overlapping waves and fades out toward the edges.
 * Smooth changes rather than random frames, so it drifts instead of
 * flickering. Paints only while on screen; a single still frame under reduced
 * motion.
 */
function HalftoneCloud() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    let width = 0
    let height = 0
    let elapsed = 0
    let frame = 0
    let last = 0
    let visible = false
    let field: { x: number; y: number; wave: number; falloff: number }[] = []

    const paint = () => {
      const t = elapsed / 1000
      ctx.clearRect(0, 0, width, height)
      for (const p of field) {
        const density = (Math.sin(p.wave + t * 0.32) + 1) / 2
        const alpha = Math.max(0, density - 0.3) * 0.9 * p.falloff
        if (alpha < 0.02) continue
        ctx.fillStyle = `rgba(210,210,210,${alpha})`
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1.5, 1.5)
      }
    }

    const tick = (now: number) => {
      if (now - last >= 1000 / 30) {
        elapsed += Math.min(now - last, 80)
        last = now
        paint()
      }
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      frame = 0
      if (visible && !document.hidden && !reduced) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      } else paint()
    }

    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width
      height = entry.contentRect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      field = []
      for (let y = 2; y < height; y += 4.5) {
        for (let x = 2; x < width; x += 4.5) {
          const nx = x / width
          const ny = y / height
          const radial = Math.hypot((nx - 0.5) * 1.8, (ny - 0.5) * 1.8)
          const falloff = Math.sqrt(Math.max(0, 1 - radial))
          field.push({
            x,
            y,
            falloff,
            wave:
              Math.sin(nx * 13 + ny * 5) * 2.4 +
              Math.cos(ny * 16 - nx * 4) * 1.8 +
              nx * 9,
          })
        }
      }
      paint()
    })
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    resize.observe(canvas)
    observer.observe(canvas)
    document.addEventListener("visibilitychange", sync)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      observer.disconnect()
      document.removeEventListener("visibilitychange", sync)
    }
  }, [reduced])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute -inset-8 size-[calc(100%+4rem)]"
    />
  )
}
