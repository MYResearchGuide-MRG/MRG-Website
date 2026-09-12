import type { MotionValue } from "motion/react"

import type { CategoryShare } from "@/lib/applicant-pool/types"

import { CategoryDonut } from "./CategoryDonut"

/**
 * Education levels as a part-to-whole ring. Thin wrapper over `CategoryDonut`,
 * which owns the ring's geometry and its legend; only the wording differs.
 */
export function EducationDonut({
  slices,
  construct,
  className,
}: {
  slices: CategoryShare[]
  construct: MotionValue<number>
  className?: string
}) {
  return (
    <CategoryDonut
      slices={slices}
      construct={construct}
      title="Education level"
      summaryLabel="Education levels of the eligible pool"
      className={className}
    />
  )
}
