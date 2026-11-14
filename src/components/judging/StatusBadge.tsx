import { Check, CircleDashed, PencilLine } from "lucide-react"
import type { ReviewStatus } from "./judge-access"

const statusLabel: Record<ReviewStatus, string> = {
  "not-started": "Not started",
  draft: "Draft saved",
  submitted: "Submitted",
}
export default function StatusBadge({ status }: { status: ReviewStatus }) {
  const Icon = status === "submitted" ? Check : status === "draft" ? PencilLine : CircleDashed
  const tone = status === "submitted"
    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
    : status === "draft" ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
    : "border-white/15 text-zinc-400"
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
    <Icon size={13} aria-hidden />{statusLabel[status]}
  </span>
}
