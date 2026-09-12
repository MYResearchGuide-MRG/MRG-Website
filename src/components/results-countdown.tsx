import { Timer, Trophy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { isSelectionAnnounced, resultsRouteHash, useCountdown } from "@/lib/results"
import { cn } from "@/lib/utils"

/**
 * Ticking countdown to the results page. Locked until the announcement
 * moment — a live readout, not a link — then it opens into the
 * selected-applicants reveal.
 */
export function CountdownPill({ className }: { className?: string }) {
  const remaining = useCountdown()
  const announced = isSelectionAnnounced()
  if (!announced) {
    return (
      <div
        role="timer"
        aria-label={`Selection announcement in ${remaining}`}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-input bg-background/60 px-5 text-sm text-muted-foreground tabular-nums",
          className
        )}
      >
        <Timer aria-hidden className="size-4" />
        Selection announcement in {remaining}
      </div>
    )
  }
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className={cn(
        /* Solid paper pill on every band, no matter the theme: the button is
           the page's loudest CTA, so it stays white on black in dark and
           keeps a hairline border for definition on the white light page. */
        "group rounded-full bg-white text-black tabular-nums hover:bg-white/90 hover:text-black dark:border-transparent dark:bg-white dark:hover:bg-white/90",
        className
      )}
    >
      <a href={resultsRouteHash}>
        <Trophy
          aria-hidden
          className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-12"
        />
        View the finalists
      </a>
    </Button>
  )
}
