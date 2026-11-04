export const overviewFields = [
  { key: "summary", label: "Abstract", maxLength: 1500 },
  { key: "question", label: "Research question", maxLength: 300 },
  { key: "method", label: "Research approach", maxLength: 2000 },
  { key: "findings", label: "Findings", maxLength: 2000 },
] as const

export function overviewError(value: Record<string, unknown>): string | null {
  for (const { key, label, maxLength } of overviewFields) {
    const text = value[key]
    if (typeof text !== "string") return `Add valid text for ${label.toLowerCase()}.`
    if (key === "summary" && !text.trim()) return "Add an abstract before saving."
    if (text.length > maxLength) {
      return `${label} must be ${maxLength.toLocaleString()} characters or fewer (including Markdown).`
    }
  }
  return null
}
