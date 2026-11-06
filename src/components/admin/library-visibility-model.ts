export type LibraryVisibility = Readonly<Record<string, boolean>>

// New and unknown projects stay hidden until explicitly released.
export function readVisibility(
  raw: string | null,
  projectIds: readonly string[]
): LibraryVisibility {
  try {
    const value: unknown = JSON.parse(raw ?? "null")
    if (
      !value ||
      typeof value !== "object" ||
      !("version" in value) ||
      value.version !== 1 ||
      !("visibleIds" in value) ||
      !Array.isArray(value.visibleIds)
    )
      return {}
    const visibleIds = value.visibleIds
    return Object.fromEntries(
      projectIds
        .filter((id) => visibleIds.includes(id))
        .map((id) => [id, true])
    )
  } catch {
    return {}
  }
}

export function canViewProject(
  visibility: LibraryVisibility,
  projectId: string,
  assignedProjectId: string | null,
  isAdmin = false
): boolean {
  return isAdmin || visibility[projectId] === true || projectId === assignedProjectId
}

export function visibleProjects<T extends { id: string }>(
  projects: T[],
  visibility: LibraryVisibility
): T[] {
  return projects.filter((project) => visibility[project.id] === true)
}
