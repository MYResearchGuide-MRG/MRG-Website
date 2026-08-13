import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

const CELL = 64

/** Stable pseudo-random so the flicker pattern doesn't reshuffle on re-render. */
function seeded(i: number) {
  const x = Math.sin(i * 127.1) * 43758.5453
  return x - Math.floor(x)
}

/** Masked grid with sparse flickering cells and a drifting spotlight. */
export function GridBackdrop() {
  const reduced = useReducedMotion()
  const [cols, setCols] = React.useState(0)
  const [rows, setRows] = React.useState(0)

  React.useEffect(() => {
    const measure = () => {
      setCols(Math.ceil(window.innerWidth / CELL))
      setRows(Math.ceil(Math.min(window.innerHeight, 900) / CELL))
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const flickerCells = React.useMemo(() => {
    if (!cols || !rows) return []
    const total = cols * rows
    const count = Math.min(14, Math.floor(total / 12))
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.floor(seeded(i + 1) * total)
      return {
        key: i,
        x: (idx % cols) * CELL,
        y: Math.floor(idx / cols) * CELL,
        delay: seeded(i + 50) * 6,
        duration: 2.5 + seeded(i + 90) * 3,
      }
    })
  }, [cols, rows])

  return (
    <>
      <div className="hero-grid absolute inset-0" />

      {!reduced && (
        <div className="hero-grid-mask absolute inset-0">
          {flickerCells.map((c) => (
            <motion.span
              key={c.key}
              className="absolute bg-foreground/[0.045]"
              style={{ left: c.x, top: c.y, width: CELL, height: CELL }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: c.duration,
                delay: c.delay,
                repeat: Infinity,
                repeatDelay: 3.5,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {!reduced && (
        <motion.div
          className="hero-spotlight absolute -top-1/3 left-1/4 h-[45rem] w-[45rem]"
          animate={{ x: [0, 140, -60, 0], y: [0, 70, 120, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </>
  )
}
