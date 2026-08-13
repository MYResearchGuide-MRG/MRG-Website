import * as React from "react"

/**
 * Reads the active theme's ink as sRGB channels for canvas painting, and
 * re-reads it when the theme class on <html> changes.
 *
 * This reads the `--ink-rgb` token rather than the computed `color`: the
 * palette is authored in oklch, so `getComputedStyle(el).color` returns an
 * `oklch(...)` string whose three components are lightness/chroma/hue, not
 * r/g/b. Parsing those as RGB yields a near-black ink in every theme.
 */
export function useInk(ref: React.RefObject<HTMLElement | null>) {
  const [ink, setInk] = React.useState<[number, number, number]>([17, 17, 17])

  React.useEffect(() => {
    const read = () => {
      const el = ref.current
      if (!el) return
      const raw = getComputedStyle(el).getPropertyValue("--ink-rgb").trim()
      const parts = raw.split(/[\s,]+/).map(Number)
      if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
        setInk([parts[0], parts[1], parts[2]])
      }
    }

    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => obs.disconnect()
  }, [ref])

  return ink
}

/** Same as `useInk`, for the page's background colour. */
export function usePaper(ref: React.RefObject<HTMLElement | null>) {
  const [paper, setPaper] = React.useState<[number, number, number]>([
    255, 255, 255,
  ])

  React.useEffect(() => {
    const read = () => {
      const el = ref.current
      if (!el) return
      const raw = getComputedStyle(el).getPropertyValue("--paper-rgb").trim()
      const parts = raw.split(/[\s,]+/).map(Number)
      if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
        setPaper([parts[0], parts[1], parts[2]])
      }
    }

    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => obs.disconnect()
  }, [ref])

  return paper
}

/**
 * Sizes a canvas to its container in CSS pixels while backing it with the
 * device pixel ratio, and re-runs on resize. Returns the CSS-pixel size.
 */
export function useCanvasSize(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [size, setSize] = React.useState({ w: 0, h: 0 })

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const fit = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const { width, height } = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      setSize({ w: width, h: height })
    }

    fit()
    const ro = new ResizeObserver(fit)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [canvasRef])

  return size
}
