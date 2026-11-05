import { useId } from "react"
import type { Track } from "./data"

// Original schematic covers, not participant results or submitted posters.
export function ProjectArtwork({ track, variant = 0 }: { track: Track; variant?: number }) {
  const id = useId().replace(/:/g, "")
  const dots = `${id}-dots`
  return (
    <svg viewBox="0 0 600 340" fill="none" aria-hidden="true" className="pb-art">
      <defs>
        <pattern id={dots} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".22" />
        </pattern>
      </defs>
      <rect width="600" height="340" fill={`url(#${dots})`} />
      <g stroke="currentColor" strokeWidth="1.3">
        {track === "AI & Computer Sciences" ? (
          variant % 2 === 0 ? (
            <>
              <path
                d="M171 240V109l99-37 120 47v124l-98 35z"
                fill="currentColor"
                fillOpacity=".03"
              />
              <path
                d="m171 109 121 45 98-35M292 154v124M171 240l99-37 120 40M270 72v131"
                opacity=".45"
              />
              <rect x="145" y="49" width="278" height="245" strokeDasharray="4 6" opacity=".5" />
              <path d="M145 80V49h31m216 0h31v31m0 183v31h-31m-216 0h-31v-31" strokeWidth="3" />
              <rect
                x="293"
                y="177"
                width="150"
                height="102"
                fill="var(--pb-surface)"
                stroke="currentColor"
                strokeDasharray="2 4"
              />
              {Array.from({ length: 8 }, (_, i) => (
                <path key={i} d={`M${302 + i * 17} 184v88`} opacity=".18" />
              ))}
              <path d="M53 172h64m342 0h83M300 14v21m0 272v22" opacity=".5" />
            </>
          ) : (
            <>
              {[0, 1, 2].map((col) =>
                [0, 1, 2, 3].map((row) => (
                  <g key={`${col}-${row}`}>
                    {col < 2
                      ? [0, 1, 2, 3].map((r) => (
                          <path
                            key={r}
                            d={`M${160 + col * 140} ${70 + row * 67}L${300 + col * 140} ${70 + r * 67}`}
                            opacity=".17"
                          />
                        ))
                      : null}
                    <circle
                      cx={160 + col * 140}
                      cy={70 + row * 67}
                      r={9 + ((row + col) % 3) * 3}
                      fill="var(--pb-surface)"
                    />
                    <circle cx={160 + col * 140} cy={70 + row * 67} r="3" fill="currentColor" />
                  </g>
                ))
              )}
              <path
                d="M65 90h42M65 112h26M65 134h35M492 199h43M492 221h27M492 243h36"
                opacity=".6"
              />
            </>
          )
        ) : track === "Biology" ? (
          <>
            {Array.from({ length: 15 }, (_, i) => {
              const y = 37 + i * 19,
                x = 300 + Math.sin(i * 0.47) * 95
              return (
                <g key={i}>
                  <path d={`M${x} ${y}H${600 - x}`} opacity=".5" />
                  <circle cx={x} cy={y} r="4" fill="currentColor" />
                  <circle cx={600 - x} cy={y} r="4" fill="currentColor" />
                </g>
              )
            })}
            <circle cx="135" cy="175" r="58" strokeDasharray="2 5" opacity=".4" />
            <circle cx="468" cy="158" r="58" strokeDasharray="2 5" opacity=".4" />
          </>
        ) : track === "Chemistry" ? (
          <>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <g
                key={i}
                transform={`translate(${140 + (i % 3) * 150} ${70 + Math.floor(i / 3) * 100})`}
              >
                <ellipse
                  rx={23 + (i % 3) * 7}
                  ry={19 + (i % 2) * 8}
                  transform={`rotate(${i * 29})`}
                  fill="currentColor"
                  fillOpacity=".06"
                />
                <circle r="5" opacity=".6" />
                <path d="M-12-4 4-11l10 15-9 10-17-9z" opacity=".25" />
              </g>
            ))}
            <path d="M74 275h63m-63 0v-63M528 65h-63m63 0v63" opacity=".6" />
          </>
        ) : track === "Mathematics" ? (
          <>
            <path d="M300 42 180 130l-65 120m65-120 68 118M300 42l119 88-61 118m61-118 68 118M115 250l-44 50m44-50 46 50m87-52-37 52m37-52 38 52m72-52-37 52m37-52 38 52m91-52-38 52m38-52 38 52" />
            {[
              [300, 42],
              [180, 130],
              [419, 130],
              [115, 250],
              [248, 248],
              [358, 248],
              [487, 248],
            ].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="9" fill="var(--pb-surface)" strokeWidth="2" />
            ))}
          </>
        ) : track === "Physics" ? (
          <>
            <path
              d="m190 114 111-49 113 49-113 49zM190 114v131l111 50 113-50V114M301 163v132"
              fill="currentColor"
              fillOpacity=".03"
            />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path
                key={i}
                d={`M${138 + i * 45} 24l85 292`}
                opacity={i === 3 ? 0.9 : 0.3}
                strokeDasharray={i === 3 ? undefined : "3 5"}
              />
            ))}
            <path d="M126 295h362M135 304h344M144 313h326" opacity=".6" />
          </>
        ) : (
          <>
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <g
                  key={`${row}-${col}`}
                  transform={`translate(${140 + col * 107} ${70 + row * 100})`}
                >
                  <circle r="15" fill="currentColor" fillOpacity=".05" />
                  <circle r="4" fill="currentColor" />
                  {col < 3 ? <path d="M15 0h77" opacity=".35" /> : null}
                  {row < 2 ? <path d="M0 15v70" opacity=".35" /> : null}
                </g>
              ))
            )}
            <path d="m140 70 107 100 107-100 107 200" strokeDasharray="4 5" opacity=".6" />
          </>
        )}
      </g>
      <path
        d="M25 25h15m-15 0v15m550-15h-15m15 0v15M25 315h15m-15 0v-15m550 15h-15m15 0v-15"
        stroke="currentColor"
        opacity=".25"
      />
    </svg>
  )
}
