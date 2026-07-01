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

export function ProjectDetailModal({ project, onClose }: ProjectDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="track-badge">{project.track}</span>
            <span className="project-id">{project.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">{project.title}</h2>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
              project.status === "open" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
            )}>
              {project.status === "open" ? "Applications Open" : "Applications Closed"}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Mentor</div>
                <div className="font-medium">{project.mentor}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Team Size</div>
                <div className="font-medium">{project.participants}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Time</div>
                <div className="font-medium">{project.time}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Project Abstract</h3>
            <p className="text-muted-foreground leading-relaxed">{project.abstract}</p>
          </div>

          {project.prerequisites && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Prerequisites</h3>
              <p className="text-muted-foreground">{project.prerequisites}</p>
            </div>
          )}

          {project.outcomes && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Expected Outcomes</h3>
              <p className="text-muted-foreground">{project.outcomes}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button size="lg" className="flex-1" asChild>
              <a href="https://forms.gle/M4dHMyq5dXSGEHXT6">
                Apply to this project
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#mentors">View Mentor</a>
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

export function FilterBar({ selectedTrack, onTrackChange, searchQuery, onSearchChange, tracks }: FilterBarProps) {
  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b py-4">
      <div className="container">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search projects by title or keywords..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {tracks.map((track) => (
              <button
                key={track}
                onClick={() => onTrackChange(track)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
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
