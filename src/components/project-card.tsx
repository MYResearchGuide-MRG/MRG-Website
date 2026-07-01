import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { ArrowRight, Clock, Users } from "lucide-react"

interface ProjectCardProps {
  id: string
  track: string
  title: string
  mentor: string
  participants: string
  time: string
  abstract: string
  status: "open" | "closed"
  onClick: () => void
}

export function ProjectCard({
  id,
  track,
  title,
  participants,
  time,
  abstract,
  status,
  onClick,
}: ProjectCardProps) {
  return (
    <article
      className="project-card group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="project-card-header">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="track-badge">{track}</span>
          <span className={cn("status-badge", status === "open" && "status-open")}>
            {status === "open" ? "Open" : "Closed"}
          </span>
        </div>
        <span className="project-id">{id}</span>
      </div>

      <h3 className="project-card-title">{title}</h3>

      <p className="project-card-abstract">{abstract}</p>

      <div className="project-card-meta">
        <div className="meta-item">
          <Users className="h-4 w-4" />
          <span>{participants}</span>
        </div>
        <div className="meta-item">
          <Clock className="h-4 w-4" />
          <span>{time}</span>
        </div>
      </div>

      <div className="project-card-footer">
        <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform">
          View details
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </article>
  )
}
