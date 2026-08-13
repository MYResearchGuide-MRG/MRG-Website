import type { Variants } from "motion/react"

/** Shared easing curve. Mirrors --ease-out-expo in index.css. */
export const easeOutExpo = [0.16, 1, 0.3, 1] as const

/** Standard entrance: content lifts and fades into place. */
export const riseVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: easeOutExpo },
  },
}

/** Parent for staggered lists and grids. */
export const staggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
}

/**
 * Display headline reveal. Each line sits in an overflow-hidden wrapper and
 * slides up from below its own baseline.
 */
export const lineMaskVariants: Variants = {
  hidden: { y: "110%" },
  visible: {
    y: "0%",
    transition: { duration: 0.9, ease: easeOutExpo },
  },
}

/** Hairline rule that draws out horizontally. */
export const ruleVariants: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, ease: easeOutExpo },
  },
}

/** Shared viewport config so every section triggers at the same point. */
export const viewportOnce = { once: true, margin: "-12% 0px" } as const
