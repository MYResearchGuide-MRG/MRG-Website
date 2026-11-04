import * as React from "react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Two-part call to action: a label block and a separate arrow chip whose
 * facing edges are slanted in parallel, so the pair reads as interlocking.
 * On hover the two swap colours and both slants flip direction.
 *
 * A rounded shape with one slanted side can't be drawn with border-radius
 * alone, so each part paints its fill from two layers in the same colour: a
 * straight rounded block for the square end, and a skewed rounded block for
 * the slanted end, overlapping so the seam is hidden.
 *
 * The fill layers ignore the pointer. A skewed layer pokes a few pixels past
 * the link's box and its slant flips on hover, so if it took hits, a pointer
 * resting near the slanted edge would hover, flip the slant out from under
 * itself, unhover, and flicker. Hover is judged on the link's own box.
 *
 * Colours: a base that contrasts with the page (near-black on light, muted
 * white on dark) and a slate blue (#a3adb8). Hover fills repeat under dark:
 * because the base's dark: fill would otherwise win.
 */
const base = "bg-neutral-900 dark:bg-neutral-200"
const accent = "bg-[#a3adb8]"
const motionCls =
  "transition-[transform,background-color,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"

export function SlantLink({
  className,
  children,
  ...props
}: React.ComponentProps<"a">) {
  return (
    <a
      className={cn(
        "group/slant inline-flex h-12 items-stretch gap-2 rounded-[10px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring",
        className
      )}
      {...props}
    >
      <span className="relative flex items-center pr-9 pl-6 text-sm font-medium">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-4 left-0 rounded-l-[10px]",
            base,
            "group-hover/slant:bg-[#a3adb8] dark:group-hover/slant:bg-[#a3adb8]",
            motionCls
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-10 -skew-x-12 rounded-[10px] group-hover/slant:skew-x-12",
            base,
            "group-hover/slant:bg-[#a3adb8] dark:group-hover/slant:bg-[#a3adb8]",
            motionCls
          )}
        />
        <span
          className={cn(
            "relative text-white group-hover/slant:text-neutral-900 dark:text-neutral-900",
            motionCls
          )}
        >
          {children}
        </span>
      </span>

      <span className="relative flex w-14 items-center justify-center pl-2">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 left-4 rounded-r-[10px]",
            accent,
            "group-hover/slant:bg-neutral-900 dark:group-hover/slant:bg-neutral-200",
            motionCls
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-10 -skew-x-12 rounded-[10px] group-hover/slant:skew-x-12",
            accent,
            "group-hover/slant:bg-neutral-900 dark:group-hover/slant:bg-neutral-200",
            motionCls
          )}
        />
        <ArrowRight
          aria-hidden
          className={cn(
            "relative size-4 text-neutral-900 group-hover/slant:translate-x-0.5 group-hover/slant:text-white dark:group-hover/slant:text-neutral-900",
            motionCls
          )}
        />
      </span>
    </a>
  )
}
