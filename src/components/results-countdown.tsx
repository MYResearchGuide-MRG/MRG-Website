import { Timer } from "lucide-react"

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
      className={cn("rounded-full tabular-nums", className)}
    >
      <a href={resultsRouteHash}>
        <Timer aria-hidden />
        View selected applicants
      </a>
    </Button>
  )
}
