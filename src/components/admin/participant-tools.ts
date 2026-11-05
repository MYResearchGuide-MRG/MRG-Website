import {
  accessStatus,
  type Assignment,
  type ProjectOption,
} from "./access-model"

export type ParticipantDetails = {
  name: string
  school: string
  projectId: string
  revoked: boolean
}

export function validateParticipantDetails(
  details: ParticipantDetails,
  projects: ProjectOption[]
) {
  if (!details.name.trim()) return "Enter the participant's name."
  if (details.name.trim().length > 100)
    return "Keep the name under 100 characters."
  if (details.school.trim().length > 200)
    return "Keep the school or college under 200 characters."
  if (!projects.some((project) => project.id === details.projectId))
    return "Choose an available project."
  return ""
}

export function participantInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function filterParticipants(
  people: Assignment[],
  projects: ProjectOption[],
  query: string,
  project: string,
  status: string,
  sort: string,
  now: number
) {
  const code = (id: string) => projects.find((p) => p.id === id)?.code || ""
  return people
    .filter(
      (person) =>
        (!query.trim() ||
          `${person.name} ${person.email} ${person.displayProfile?.school || ""} ${code(person.projectId)}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())) &&
        (!project || person.projectId === project) &&
        (!status || accessStatus(person, now) === status)
    )
    .sort((a, b) => {
      const names =
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
        a.email.localeCompare(b.email)
      if (sort === "name-desc") return -names
      if (sort === "name") return names
      if (sort === "status")
        return accessStatus(a, now).localeCompare(accessStatus(b, now)) || names
      return (
        code(a.projectId).localeCompare(code(b.projectId), undefined, {
          numeric: true,
        }) || names
      )
    })
}

// Spreadsheet-safe CSV. Credentials are deliberately excluded.
export function participantsCsv(
  people: Assignment[],
  projects: ProjectOption[],
  now: number
) {
  const cell = (value: string) =>
    `"${(/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`
  return [
    "name,email,project_code,school,access",
    ...people.map((person) =>
      [
        person.name,
        person.email,
        projects.find((p) => p.id === person.projectId)?.code || "",
        person.displayProfile?.school || "",
        accessStatus(person, now),
      ]
        .map(cell)
        .join(",")
    ),
  ].join("\r\n")
}

export function downloadCsv(contents: string, name: string) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + contents], { type: "text/csv;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
