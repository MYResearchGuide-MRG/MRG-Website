export const libraryHash = "#/project-archive"
const legacyRoots = ["#/projectboard", "#/researchlibrary", "#/research-library", "#/project-library", "#/projectarchive"]

export function canonicalArchiveHash(hash: string): string {
  const legacy = legacyRoots.find(root => hash === root || hash.startsWith(`${root}/`) || hash.startsWith(`${root}?`))
  return legacy ? libraryHash + hash.slice(legacy.length) : hash
}

export function isArchiveHash(hash: string): boolean {
  const canonical = canonicalArchiveHash(hash)
  return canonical === libraryHash || canonical.startsWith(`${libraryHash}/`) || canonical.startsWith(`${libraryHash}?`)
}

export function decodeProjectId(value: string): string | null {
  try { return decodeURIComponent(value) } catch { return null }
}
export const boardUrl = (id: string) => `${libraryHash}/project/${encodeURIComponent(id)}`

// Share the public project address, never an editor query or invitation token.
export const projectShareUrl = (id: string, origin: string, pathname: string) =>
  `${origin}${pathname}${boardUrl(id)}`
