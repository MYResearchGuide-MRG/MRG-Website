import { useMemo } from "react"

/**
 * Anonymous judge portrait in the landing page's halftone style: a head and
 * shoulders silhouette drawn as halftone dots on black. The figure's dots grow
 * with brightness; the background is a sparse ordered dither (the same 4×4
 * Bayer screen as HalftoneBackdrop). `seed` turns the light so each review
 * gets its own portrait without revealing anything about the judge. Special
 * award judges get a five-point star for a head.
 */
const SCREEN = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const CELLS = 21

type Dot = { x: number; y: number; r: number; shade: number; head?: boolean }

const STAR_CENTRE_Y = 0.37
const STAR = Array.from({ length: 10 }, (_, k) => {
  const angle = -Math.PI / 2 + (k * Math.PI) / 5
  const radius = k % 2 ? 0.13 : 0.28
  return [0.5 + radius * Math.cos(angle), STAR_CENTRE_Y + radius * Math.sin(angle)] as const
})

function inStar(x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = STAR.length - 1; i < STAR.length; j = i++) {
    const [xi, yi] = STAR[i]
    const [xj, yj] = STAR[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function portraitDots(seed: number, star: boolean): Dot[] {
  const headY = star ? STAR_CENTRE_Y : 0.39
  const angle = seed * 2.39996 // golden angle, so neighbouring seeds differ clearly
  const lx = Math.cos(angle)
  const ly = Math.sin(angle) * 0.5 - 0.5 // light mostly from above
  const dots: Dot[] = []
  for (let j = 0; j < CELLS; j++) {
    for (let i = 0; i < CELLS; i++) {
      const x = (i + 0.5) / CELLS
      const y = (j + 0.5) / CELLS
      if ((x - 0.5) ** 2 + (y - 0.5) ** 2 > 0.235) continue // outside the round frame
      const inHead = star ? inStar(x, y) : ((x - 0.5) / 0.17) ** 2 + ((y - 0.39) / 0.19) ** 2 <= 1
      const inBody = ((x - 0.5) / 0.33) ** 2 + ((y - 1) / 0.36) ** 2 <= 1
      if (inHead || inBody) {
        // Halftone: dot size and shade follow how much each spot faces the light.
        const cx = x - 0.5
        const cy = y - (inHead ? headY : 0.9)
        const facing = (cx * lx + cy * ly) / Math.max(Math.hypot(cx, cy), 0.04)
        const value = Math.min(1, Math.max(0.25, 0.68 + 0.32 * facing))
        dots.push({ x, y, r: 0.46 * Math.sqrt(value), shade: Math.round(120 + value * 125), head: inHead })
      } else {
        // Background: faint dithered dots, a little denser toward the light.
        const value = 0.16 + 0.1 * ((x - 0.5) * lx + (y - 0.5) * ly)
        if (value > (SCREEN[(j % 4) * 4 + (i % 4)] + 0.5) / 16) dots.push({ x, y, r: 0.18, shade: 90 })
      }
    }
  }
  return dots
}

export function JudgeAvatar({ seed, star = false, size = 40 }: { seed: number; star?: boolean; size?: number }) {
  const dots = useMemo(() => portraitDots(seed, star), [seed, star])
  const cell = size / CELLS
  const draw = (dot: Dot, index: number) => <circle
    key={index}
    cx={dot.x * size}
    cy={dot.y * size}
    r={dot.r * cell}
    fill={`rgb(${dot.shade},${dot.shade},${dot.shade})`}
  />
  return <svg className="pf-avatar" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
    <circle cx={size / 2} cy={size / 2} r={size / 2} fill="#000" />
    {dots.filter(dot => !dot.head).map(draw)}
    {/* The head drifts on its own; the delay keeps neighbouring portraits out of step. */}
    <g className="pf-avatar-head" style={{ animationDelay: `${-seed * 0.9}s` }}>{dots.filter(dot => dot.head).map(draw)}</g>
  </svg>
}
