import * as React from "react"

/**
 * The COBE globe is heavy — a WebGL context plus its own map data — and is not
 * on screen until that hero variant is picked, so it loads on demand rather
 * than sitting in the initial bundle.
 */
export const LazyGlobeFigure = React.lazy(() =>
  import("./globe-figure").then((m) => ({ default: m.GlobeFigure }))
)
