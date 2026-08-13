import * as React from "react"
import type { COBEOptions } from "cobe"

import { Globe } from "@/components/ui/globe"
import { useTheme } from "@/components/theme-provider"

/**
 * Markers are the cities the competition actually draws from — Kampar (UTAR's
 * main campus) weighted largest, then Malaysian centres, then the wider ASEAN
 * reach the eligibility rules describe. Decorative marker sets were the point
 * of the original demo; here the dots say something true.
 */
const CITIES: COBEOptions["markers"] = [
  { location: [4.3312, 101.1435], size: 0.11 }, // Kampar — UTAR
  { location: [3.139, 101.6869], size: 0.09 }, // Kuala Lumpur
  { location: [5.4141, 100.3288], size: 0.06 }, // George Town
  { location: [1.4927, 103.7414], size: 0.05 }, // Johor Bahru
  { location: [5.9804, 116.0735], size: 0.05 }, // Kota Kinabalu
  { location: [1.5533, 110.3592], size: 0.05 }, // Kuching
  { location: [1.3521, 103.8198], size: 0.06 }, // Singapore
  { location: [13.7563, 100.5018], size: 0.05 }, // Bangkok
  { location: [-6.2088, 106.8456], size: 0.06 }, // Jakarta
  { location: [14.5995, 120.9842], size: 0.05 }, // Manila
  { location: [21.0278, 105.8342], size: 0.045 }, // Hanoi
  { location: [11.5564, 104.9282], size: 0.04 }, // Phnom Penh
  { location: [4.9031, 114.9398], size: 0.04 }, // Bandar Seri Begawan
]

/**
 * Rotating globe centred on Southeast Asia. Themed to the monochrome palette:
 * a light landmass on white, inverted to a dark globe on black, with the warm
 * accent reserved for the markers so the cities are the only colour.
 */
export function GlobeFigure({ className }: { className?: string }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const config = React.useMemo<COBEOptions>(
    () => ({
      width: 800,
      height: 800,
      devicePixelRatio: 2,
      // Longitude ~107°E puts Malaysia and the ASEAN cluster facing the viewer.
      phi: -1.87,
      theta: 0.22,
      dark: isDark ? 1 : 0,
      diffuse: isDark ? 1.2 : 0.4,
      mapSamples: 16000,
      mapBrightness: isDark ? 6 : 1.15,
      baseColor: isDark ? [0.32, 0.32, 0.32] : [1, 1, 1],
      markerColor: isDark ? [0.86, 0.72, 0.36] : [0.62, 0.47, 0.13],
      glowColor: isDark ? [0.18, 0.18, 0.18] : [1, 1, 1],
      markers: CITIES,
    }),
    [isDark]
  )

  return (
    <div className={className} aria-hidden>
      <div className="relative aspect-square w-full">
        <Globe
          config={config}
          fallback={
            // Static stand-in where WebGL isn't available, so the hero never
            // shows an empty box.
            <svg viewBox="0 0 200 200" className="h-full w-full text-border">
              <circle
                cx="100"
                cy="100"
                r="76"
                fill="none"
                stroke="currentColor"
              />
              {[-52, -26, 0, 26, 52].map((y) => (
                <ellipse
                  key={y}
                  cx="100"
                  cy={100 + y}
                  rx={Math.sqrt(Math.max(0, 76 * 76 - y * y))}
                  ry="7"
                  fill="none"
                  stroke="currentColor"
                />
              ))}
              <ellipse
                cx="100"
                cy="100"
                rx="30"
                ry="76"
                fill="none"
                stroke="currentColor"
              />
            </svg>
          }
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
          <span className="label-micro text-muted-foreground">
            Malaysia &amp; ASEAN &middot; Drag to spin
          </span>
        </div>
      </div>
    </div>
  )
}
