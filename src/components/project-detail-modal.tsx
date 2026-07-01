import { ArrowRight, Clock, Users, GraduationCap, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ProjectDetailModalProps {
  project: {
    id: string
    track: string
    title: string
    mentor: string
    participants: string
    time: string
    abstract: string
    status: "open" | "closed"
    prerequisites?: string
    outcomes?: string
  }
  onClose: () => void
}

export function ProjectDetailModal({
  project,
  onClose,
}: ProjectDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-xl border bg-white shadow-2xl sm:max-h-[90vh] dark:bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6 sm:py-4 dark:bg-card">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="track-badge text-xs">{project.track}</span>
            <span className="project-id text-xs">{project.id}</span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 bg-white p-4 sm:p-6 dark:bg-card">
          <div>
            <h2 className="mb-2 text-2xl font-bold sm:text-3xl">
              {project.title}
            </h2>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
                project.status === "open"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {project.status === "open"
                ? "Applications Open"
                : "Applications Closed"}
            </div>
          </div>

          <div className="grid gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Mentor</div>
                <div className="text-sm font-medium">{project.mentor}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Team Size</div>
                <div className="text-sm font-medium">
                  {project.participants}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Time</div>
                <div className="text-sm font-medium">{project.time}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">Project Abstract</h3>
            <p className="leading-relaxed text-muted-foreground">
              {project.abstract}
            </p>
          </div>

          {project.prerequisites && (
            <div>
              <h3 className="mb-2 text-lg font-semibold">Prerequisites</h3>
              <p className="text-muted-foreground">{project.prerequisites}</p>
            </div>
          )}

          {project.outcomes && (
            <div>
              <h3 className="mb-2 text-lg font-semibold">Expected Outcomes</h3>
              <p className="text-muted-foreground">{project.outcomes}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button size="lg" className="w-full flex-1 sm:w-auto" asChild>
              <a href="https://forms.gle/M4dHMyq5dXSGEHXT6">
                Apply to this project
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              asChild
            >
              <a href="#mentors" onClick={onClose}>
                View Mentor
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FilterBarProps {
  selectedTrack: string
  onTrackChange: (track: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  tracks: string[]
}

export function FilterBar({
  selectedTrack,
  onTrackChange,
  searchQuery,
  onSearchChange,
  tracks,
}: FilterBarProps) {
  return (
    <div className="border-b bg-background py-4">
      <div className="container">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search projects by title or keywords..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {tracks.map((track) => (
              <button
                key={track}
                onClick={() => onTrackChange(track)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  selectedTrack === track
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {track}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
