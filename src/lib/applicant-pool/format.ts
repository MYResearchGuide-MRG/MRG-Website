/**
 * Rendering-time formatting. The dataset stores counts only, so every
 * percentage on the page passes through here.
 */

/** "26.8%" — one decimal by default, matching the published figures. */
export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`
}

/**
 * "6×" — a ratio of counts rounded to the nearest whole multiple. The glyph and
 * the rounding are the reason this is a name and not an inline template.
 */
export function formatRatio(ratio: number): string {
  return `${Math.round(ratio)}×`
}
