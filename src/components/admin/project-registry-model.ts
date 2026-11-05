// Public team profiles are separate from email-based access assignments.
export type SplitTeam = {
  id: string
  code: string
  title: string
  memberIndices: number[]
}
export type ProjectSplit = { parentId: string; teams: SplitTeam[] }
type ProjectShape = {
  year?: number
  id: string
  code: string
  title: string
  team: { code: string; name: string; school: string; programme: string }[]
}

export function splitError(
  split: ProjectSplit,
  projects: ProjectShape[],
  existing: ProjectSplit[]
): string | null {
  const parent = projects.find((project) => project.id === split.parentId)
  if (!parent) return "Choose an existing project."
  if (existing.some((item) => item.parentId === parent.id))
    return "This project has already been split."
  if (split.teams.length < 2 || split.teams.length > 6)
    return "Create between two and six teams."
  const takenIds = new Set([
    ...projects.map((p) => p.id),
    ...existing.flatMap((item) => item.teams.map((team) => team.id)),
  ])
  const takenCodes = new Set([
    ...projects.filter((p) => p.year === parent.year).map((p) => p.code),
    ...existing
      .filter(
        (item) =>
          projects.find((p) => p.id === item.parentId)?.year === parent.year
      )
      .flatMap((item) => item.teams.map((team) => team.code)),
  ])
  const indices: number[] = []
  for (const team of split.teams) {
    if (!/^[a-z0-9-]{1,100}$/.test(team.id) || takenIds.has(team.id))
      return "Each team needs its own unique page address."
    if (
      !/^[A-Z]-\d+[A-Z]{1,2}$/.test(team.code) ||
      !team.code.startsWith(parent.code) ||
      takenCodes.has(team.code)
    )
      return "Use a different team code for each new page."
    if (!team.title.trim() || team.title.length > 240)
      return "Add a project title of 240 characters or fewer for each team."
    if (
      !team.memberIndices.length ||
      team.memberIndices.some(
        (index) =>
          !Number.isInteger(index) || index < 0 || index >= parent.team.length
      )
    )
      return "Assign at least one student to each team."
    indices.push(...team.memberIndices)
    takenIds.add(team.id)
    takenCodes.add(team.code)
  }
  if (
    indices.length !== parent.team.length ||
    new Set(indices).size !== parent.team.length
  )
    return "Assign every student to exactly one team."
  return null
}

export function applyProjectSplits<T extends ProjectShape>(
  projects: T[],
  splits: ProjectSplit[]
): T[] {
  return projects.flatMap((parent) => {
    const split = splits.find((item) => item.parentId === parent.id)
    return split
      ? split.teams.map((team) => ({
          ...parent,
          id: team.id,
          code: team.code,
          title: team.title,
          team: team.memberIndices.map((index) => ({
            ...parent.team[index],
            code: team.code,
          })),
        }))
      : [parent]
  })
}

export function readProjectSplits(
  raw: string | null,
  projects: ProjectShape[]
): ProjectSplit[] {
  try {
    const value = JSON.parse(raw ?? "null")
    if (value?.version !== 1 || !Array.isArray(value.splits)) return []
    const valid: ProjectSplit[] = []
    for (const split of value.splits) {
      // Runtime validation is deliberate: a bad local record must not break the library.
      try {
        if (!splitError(split, projects, valid)) valid.push(split)
      } catch {
        /* skip malformed records */
      }
    }
    return valid
  } catch {
    return []
  }
}
