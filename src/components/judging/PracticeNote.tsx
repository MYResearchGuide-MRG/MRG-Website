import type { ReactNode } from "react"
import { FlaskConical } from "lucide-react"

/**
 * The grey practice box: an icon tile and a two-line message, with optional
 * actions on the right. Used for the invite on the locked lineup and the
 * banner on every practice page, so they always line up the same way.
 */
export default function PracticeNote({
  title,
  description,
  actions,
  note = false,
  className = "",
}: {
  title: string
  description: string
  actions?: ReactNode
  /** Marks it as a note for assistive tech (the practice-mode banner). */
  note?: boolean
  className?: string
}) {
  return (
    <div
      className={`judge-practice-note ${className}`}
      role={note ? "note" : undefined}
    >
      <div className="judge-practice-note-body">
        <span className="judge-practice-note-icon" aria-hidden>
          <FlaskConical size={17} />
        </span>
        <div className="min-w-0">
          <p className="judge-practice-note-title">{title}</p>
          <p className="judge-practice-note-text">{description}</p>
        </div>
      </div>
      {actions && <div className="judge-practice-note-actions">{actions}</div>}
    </div>
  )
}
