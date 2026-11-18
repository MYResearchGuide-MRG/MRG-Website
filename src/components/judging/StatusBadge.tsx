import { Check, CircleDashed, Minus, PencilLine } from "lucide-react"
import type { ReviewStatus } from "./judge-access"

const statusLabel: Record<ReviewStatus, string> = {
  "not-started": "Not started",
  draft: "Draft saved",
  submitted: "Submitted",
}
/** `closed`: judging has ended, so an untouched project reads "Not reviewed", not "Not started". */
export default function StatusBadge({ status, closed = false }: { status: ReviewStatus; closed?: boolean }) {
  if (closed && status === "not-started")
    return <span className="judge-tag judge-tag-soft-default">
      <Minus size={13} aria-hidden />Not reviewed
    </span>
  const Icon = status === "submitted" ? Check : status === "draft" ? PencilLine : CircleDashed
  const tone = status === "submitted" ? "judge-tag-soft-success"
    : status === "draft" ? "judge-tag-soft-warning"
    : "judge-tag-soft-default"
  return <span className={`judge-tag ${tone}`}>
    <Icon size={13} aria-hidden />{statusLabel[status]}
  </span>
}
