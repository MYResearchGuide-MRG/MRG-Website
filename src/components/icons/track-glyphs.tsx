import * as React from "react"

import type { Track } from "@/data/competition-data"

/**
 * Two-tone research-area icons, redrawn from the supplied artwork. The bright
 * parts take currentColor and the muted parts the same colour at reduced
 * opacity, so the pair follows the theme (white and grey on dark, black and
 * grey on light). Holes, like the robot's eyes and the calculator keys, are cut
 * with a mask so whatever sits behind the icon shows through.
 */
type GlyphProps = { className?: string }

const MUTED = { opacity: 0.45 }

function Svg({
  className,
  children,
}: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

function AiGlyph({ className }: GlyphProps) {
  const id = React.useId()
  return (
    <Svg className={className}>
      <path
        fill="currentColor"
        style={MUTED}
        d="M9 3h6a3.5 3.5 0 0 1 3.5 3.5v5A3.5 3.5 0 0 1 15 15h-1.6l-4.3 3.2a.6.6 0 0 1-.96-.48V15A3.5 3.5 0 0 1 5.5 11.5v-5A3.5 3.5 0 0 1 9 3Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        d="M2.7 8.5h2.8M18.5 8.5h2.8"
      />
      <mask id={id}>
        <rect x="7.4" y="5.7" width="9.2" height="5.6" rx="2.8" fill="#fff" />
        <circle cx="10.3" cy="8.5" r="0.95" fill="#000" />
        <circle cx="13.7" cy="8.5" r="0.95" fill="#000" />
      </mask>
      <rect
        x="7.4"
        y="5.7"
        width="9.2"
        height="5.6"
        fill="currentColor"
        mask={`url(#${id})`}
      />
    </Svg>
  )
}

function BiologyGlyph({ className }: GlyphProps) {
  return (
    <Svg className={className}>
      <g
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        style={MUTED}
      >
        <path d="M6.8 3.5c0 7 10.4 9 10.4 17" />
        <path d="M7 5h9.6M9.7 15.6h5" />
      </g>
      <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
        <path d="M17.2 3.5c0 8-10.4 9.5-10.4 17" />
        <path d="M9.3 8.4h5.4M7.2 19h9.8" />
      </g>
    </Svg>
  )
}

function ChemistryGlyph({ className }: GlyphProps) {
  return (
    <Svg className={className}>
      <path
        fill="currentColor"
        style={MUTED}
        d="M7.7 14.5h8.6l2.2 4.1a.5.5 0 0 1-.44.73H5.94a.5.5 0 0 1-.44-.73l2.2-4.1Z"
      />
      <g
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 3.3h10" />
        <path d="M9.6 3.3v5.4L4.4 18.1A1.8 1.8 0 0 0 6 20.8h12a1.8 1.8 0 0 0 1.6-2.7l-5.2-9.4V3.3" />
        <path d="M7.9 13.5h8.2" />
      </g>
    </Svg>
  )
}

function MathematicsGlyph({ className }: GlyphProps) {
  const id = React.useId()
  return (
    <Svg className={className}>
      <mask id={id}>
        <rect x="4.8" y="2.5" width="14.4" height="19" rx="3.6" fill="#fff" />
        {[8.6, 12, 15.4].flatMap((x) =>
          [12.2, 15.6].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill="#000" />
          ))
        )}
        <rect x="7.5" y="18" width="5" height="2.1" rx="1.05" fill="#000" />
        <circle cx="15.4" cy="19.05" r="1.1" fill="#000" />
      </mask>
      <rect
        x="4.8"
        y="2.5"
        width="14.4"
        height="19"
        fill="currentColor"
        style={MUTED}
        mask={`url(#${id})`}
      />
      <rect
        x="7.4"
        y="5"
        width="9.2"
        height="3.6"
        rx="1.2"
        fill="currentColor"
      />
    </Svg>
  )
}

function SocialScienceGlyph({ className }: GlyphProps) {
  // The bands are cut out of the bright books and then filled muted; a muted
  // band laid over a bright book would just read as more bright book.
  const id = React.useId()
  const bands = "M4.2 6.3h4.6v1.5H4.2zM4.2 16.5h4.6V18H4.2z"
  const tiltedBands = "M15.4 6.5h4.4V8h-4.4zM15.4 16h4.4v1.5h-4.4z"
  return (
    <Svg className={className}>
      <rect
        x="10.4"
        y="7.2"
        width="3.7"
        height="13.3"
        rx="1.1"
        fill="currentColor"
        style={MUTED}
      />
      <mask id={id}>
        <rect width="24" height="24" fill="#fff" />
        <path d={bands} fill="#000" />
        <path d={tiltedBands} fill="#000" transform="rotate(-15 17.6 12)" />
      </mask>
      <g mask={`url(#${id})`} fill="currentColor">
        <rect x="4.2" y="3.8" width="4.6" height="16.7" rx="1.2" />
        <rect
          x="15.4"
          y="4"
          width="4.4"
          height="16"
          rx="1.2"
          transform="rotate(-15 17.6 12)"
        />
      </g>
      <g fill="currentColor" style={MUTED}>
        <path d={bands} />
        <path d={tiltedBands} transform="rotate(-15 17.6 12)" />
      </g>
    </Svg>
  )
}

function PhysicsGlyph({ className }: GlyphProps) {
  return (
    <Svg className={className}>
      <path
        fill="currentColor"
        style={MUTED}
        d="M12 9c-1.4-.7-3.4-1.2-4.9-.6C4.6 9.4 4.2 12.6 4.8 15.2c.7 3 2.6 5.5 4.6 5.3.9-.1 1.6-.6 2.6-.6s1.7.5 2.6.6c2 .2 3.9-2.3 4.6-5.3.6-2.6.2-5.8-2.3-6.8-1.5-.6-3.5-.1-4.9.6Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="none"
        d="M12 9c-1.4-.7-3.4-1.2-4.9-.6C4.6 9.4 4.2 12.6 4.8 15.2c.7 3 2.6 5.5 4.6 5.3.9-.1 1.6-.6 2.6-.6s1.7.5 2.6.6c2 .2 3.9-2.3 4.6-5.3.6-2.6.2-5.8-2.3-6.8-1.5-.6-3.5-.1-4.9.6Z"
      />
      <path
        fill="currentColor"
        d="M12.2 7.4V5.9c0-1.8 1.4-3.1 3.2-3.1v1.4c0 1.8-1.4 3.2-3.2 3.2Z"
      />
    </Svg>
  )
}

const GLYPHS: Record<Track, React.ComponentType<GlyphProps>> = {
  "AI & Computer Sciences": AiGlyph,
  Biology: BiologyGlyph,
  Chemistry: ChemistryGlyph,
  Mathematics: MathematicsGlyph,
  "Interdisciplinary & Social Sciences": SocialScienceGlyph,
  Physics: PhysicsGlyph,
}

/** The icon for one research area; renders nothing for an unknown track. */
export function TrackGlyph({
  track,
  className,
}: {
  track: string
  className?: string
}) {
  const Glyph = GLYPHS[track as Track]
  return Glyph ? <Glyph className={className} /> : null
}
