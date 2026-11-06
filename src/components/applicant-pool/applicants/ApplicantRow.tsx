import { motion, type Variants } from "motion/react"

import { easeOutExpo } from "@/components/motion/variants"
import type { SelectedRow } from "@/data/selected"

/** Each name slides in from the left, sharpening as it lands. */
const rowVariants: Variants = {
  hidden: { opacity: 0, x: -12, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: easeOutExpo },
  },
}

/**
 * One line of the published register: a name and the school behind it.
 *
 * `SelectedRow` also carries the project they chose and their programme. They
 * are deliberately not read here — the roster names applicants and where they
 * study, and nothing else about them. The separators are horizontal only, so
 * the rows read as a list rather than as cards.
 */
export function ApplicantRow({ row }: { row: SelectedRow }) {
  return (
    <motion.tr className="border-b border-border" variants={rowVariants}>
      <th scope="row" className="py-4 pr-6 text-left font-medium">
        {row.name}
      </th>
      <td className="py-4 text-muted-foreground">{row.school}</td>
    </motion.tr>
  )
}
