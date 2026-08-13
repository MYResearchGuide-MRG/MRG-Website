import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { BACKDROPS, type BackdropId } from "./registry"

/** Cross-fades between backdrop variants. */
export function HeroBackdrop({ variant }: { variant: BackdropId }) {
  const reduced = useReducedMotion()
  const entry = BACKDROPS.find((b) => b.id === variant) ?? BACKDROPS[0]
  const Component = entry.Component

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={entry.id}
          className="absolute inset-0"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <Component />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
