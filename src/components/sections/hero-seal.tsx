import { motion, useReducedMotion } from "motion/react"

const SEAL_TEXT =
  "MY RESEARCH GUIDE · RESEARCH COMPETITION 2026 · UTAR BASECAMP · "

/**
 * Rotating circular wordmark that anchors the empty half of the hero.
 * Text runs on an SVG path; concentric rings and a set of tick marks give it
 * the feel of a stamped seal without introducing any colour.
 */
export function HeroSeal({ className }: { className?: string }) {
  const reduced = useReducedMotion()

  return (
    <div className={className} aria-hidden>
      <div className="relative aspect-square w-full">
        {/* Rotating ring of text */}
        <motion.svg
          viewBox="0 0 300 300"
          className="absolute inset-0 h-full w-full"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
        >
          <defs>
            <path
              id="seal-path"
              d="M150,150 m-116,0 a116,116 0 1,1 232,0 a116,116 0 1,1 -232,0"
              fill="none"
            />
          </defs>
          <text
            className="fill-muted-foreground"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13.5px",
              fontWeight: 500,
              letterSpacing: "0.22em",
            }}
          >
            <textPath href="#seal-path" startOffset="0%">
              {SEAL_TEXT}
            </textPath>
          </text>
        </motion.svg>

        {/* Static rings + tick marks */}
        <svg
          viewBox="0 0 300 300"
          className="absolute inset-0 h-full w-full text-border"
        >
          <circle
            cx="150"
            cy="150"
            r="128"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle
            cx="150"
            cy="150"
            r="98"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2
            const long = i % 5 === 0
            const r1 = 98
            const r2 = long ? 88 : 93
            return (
              <line
                key={i}
                x1={150 + Math.cos(a) * r1}
                y1={150 + Math.sin(a) * r1}
                x2={150 + Math.cos(a) * r2}
                y2={150 + Math.sin(a) * r2}
                stroke="currentColor"
                strokeWidth={long ? 1.1 : 0.6}
              />
            )
          })}
        </svg>

        {/* Centre mark */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-6xl leading-none md:text-7xl">
            MRG
          </span>
          <span className="label-micro mt-3 text-muted-foreground">
            Research Basecamp
          </span>
          <motion.span
            className="mt-5 h-px w-14 origin-center bg-border"
            initial={reduced ? undefined : { scaleX: 0 }}
            animate={reduced ? undefined : { scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </div>
  )
}
