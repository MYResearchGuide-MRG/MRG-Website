export type ResearchField = { name: string; prefix: string }

export const defaultResearchFields: ResearchField[] = [
  { name: "AI & Computer Sciences", prefix: "A" },
  { name: "Biology", prefix: "B" },
  { name: "Chemistry", prefix: "C" },
  { name: "Mathematics", prefix: "M" },
  { name: "Interdisciplinary & Social Sciences", prefix: "I" },
  { name: "Physics", prefix: "P" },
]

export function normalizeFieldName(name: string) {
  return name.trim().replace(/\s+/g, " ")
}

export function researchFieldError(
  field: ResearchField,
  existing: ResearchField[] = []
) {
  const name = normalizeFieldName(field.name)
  if (
    name.length < 2 ||
    name.length > 80 ||
    [...field.name].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
    )
  )
    return "Use a field name of 2 to 80 characters."
  if (["all", "all fields"].includes(name.toLowerCase()))
    return "Choose a more specific field name."
  if (!/^[A-Z]{1,5}$/.test(field.prefix))
    return "Use 1 to 5 letters for the code prefix, such as ENG."
  if (
    existing.some(
      (f) => normalizeFieldName(f.name).toLowerCase() === name.toLowerCase()
    )
  )
    return "This research field already exists. Select it from the list."
  return null
}

export function mergeResearchFields(
  saved: ResearchField[],
  projectTracks: string[] = []
) {
  const fields = [...defaultResearchFields]
  for (const field of saved) {
    if (researchFieldError(field)) continue
    const index = fields.findIndex(
      (f) => f.name.toLowerCase() === field.name.toLowerCase()
    )
    if (index < 0) fields.push(field)
    else fields[index] = field
  }
  for (const name of projectTracks) {
    const field = { name, prefix: "R" }
    if (!researchFieldError(field, fields)) fields.push(field)
  }
  return fields
}
