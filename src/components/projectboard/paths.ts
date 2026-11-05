export const libraryHash = "#/projectboard"
export const boardUrl = (id: string) => `${libraryHash}/project/${encodeURIComponent(id)}`

// Share the public project address, never an editor query or invitation token.
export const projectShareUrl = (id: string, origin: string, pathname: string) =>
  `${origin}${pathname}${boardUrl(id)}`
