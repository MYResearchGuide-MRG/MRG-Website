export const PROJECTS_PER_PAGE = 12

export function paginate<T>(items: readonly T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PROJECTS_PER_PAGE))
  const page = Math.min(totalPages, Math.max(1, Math.trunc(requestedPage) || 1))
  const start = (page - 1) * PROJECTS_PER_PAGE
  return { page, totalPages, items: items.slice(start, start + PROJECTS_PER_PAGE) }
}
