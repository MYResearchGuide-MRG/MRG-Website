import { trackOrder, type Board, type Track } from "../projectboard/data"

export type Cohort = { year: number; name: string }
export type ProjectInput = {
  year: number
  code: string
  title: string
  track: Track
  mentor: string
  affiliation: string
  description: string
}

export function cohortError(year: number, name: string, cohorts: Cohort[]) {
  if (!Number.isInteger(year) || year < 2026 || year > 2100)
    return "Use a year between 2026 and 2100."
  if (cohorts.some((c) => c.year === year))
    return "This cohort already exists. Select it in the sidebar."
  if (!name.trim() || name.trim().length > 80)
    return "Use a cohort name of 1 to 80 characters."
  return null
}

export function projectInputError(
  input: ProjectInput,
  boards: Pick<Board, "id" | "year" | "code">[],
  editingId?: string
) {
  if (!Number.isInteger(input.year) || input.year < 2026 || input.year > 2100)
    return "Choose a valid cohort."
  if (!/^[A-Z]{1,5}-\d{1,4}[A-Z]{0,2}$/.test(input.code))
    return "Use a project code such as A-1 or I-2A."
  if (
    boards.some(
      (b) =>
        b.year === input.year && b.code === input.code && b.id !== editingId
    )
  )
    return `${input.code} already exists in ${input.year}. Choose another code.`
  if (!input.title.trim() || input.title.trim().length > 240)
    return "Add a project title of 240 characters or fewer."
  if (!trackOrder.includes(input.track)) return "Choose a research field."
  if (input.mentor.length > 200 || input.affiliation.length > 300)
    return "Shorten the mentor name or institution."
  if (input.description.length > 4000)
    return "Keep the description under 4,000 characters."
  return null
}

export function suggestedCode(
  track: Track,
  year: number,
  boards: Pick<Board, "year" | "code">[]
) {
  const prefix = {
    "AI & Computer Sciences": "A",
    Biology: "B",
    Chemistry: "C",
    Mathematics: "M",
    "Interdisciplinary & Social Sciences": "I",
    Physics: "P",
  }[track]
  let number = 1
  const taken = new Set(
    boards.filter((b) => b.year === year).map((b) => b.code)
  )
  while (taken.has(`${prefix}-${number}`)) number++
  return `${prefix}-${number}`
}

export function projectFromInput(input: ProjectInput, id: string): Board {
  return {
    ...input,
    id,
    title: input.title.trim(),
    mentor: input.mentor.trim(),
    affiliation: input.affiliation.trim(),
    description: input.description.trim(),
    type: input.track,
    mentorBio: "",
    photo: "",
    institution: "External",
    participants: "",
    timeInvestment: "",
    skillsDescription: "",
    skills: [],
    prepWork: [],
    tasks: [],
    deliverables: [],
    status: "confirmed",
    awards: [],
    team: [],
  }
}
