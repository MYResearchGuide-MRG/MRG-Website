import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal"
import { SELECTED, selectedCount } from "@/data/selected"
import { projectCodes, projects } from "@/data/competition-data"
import { isSelectionAnnounced, useCountdown } from "@/lib/results"
import { SectionHeading } from "./section-heading"
import { WrappedStats } from "./wrapped-stats"

/**
 * Code -> project for group headings. Codes with no project behind them
 * render as the bare code, never an invented title.
 */
const CODE_TO_PROJECT: Record<string, (typeof projects)[number]> = (() => {
  const codes = projectCodes(projects)
  const byCode: Record<string, (typeof projects)[number]> = {}
  for (const p of projects) {
    const code = codes.get(p.id)
    if (code) byCode[code] = p
  }
  return byCode
})()

/** Selected rows grouped by project code, in first-seen order. */
const GROUPED: { code: string; rows: typeof SELECTED }[] = (() => {
  const order: string[] = []
  const byCode = new Map<string, typeof SELECTED>()
  for (const row of SELECTED) {
    const group = byCode.get(row.code)
    if (group) {
      group.push(row)
    } else {
      byCode.set(row.code, [row])
      order.push(row.code)
    }
  }
  return order.map((code) => ({ code, rows: byCode.get(code)! }))
})()

function PreAnnouncement({ remaining }: { remaining: string }) {
  return (
    <div className="mt-16">
      <Reveal>
        <p aria-live="off" className="display-lg tabular-nums">
          {remaining}
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Selected applicants are revealed here on 15 September 2026.
        </p>
      </Reveal>
    </div>
  )
}

function AnnouncedList() {
  return (
    <div className="mt-16 space-y-12">
      <Reveal>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Congratulations to the {selectedCount} selected applicants.
        </p>
      </Reveal>
      {GROUPED.map((group) => {
        const project = CODE_TO_PROJECT[group.code]
        return (
          <section key={group.code} aria-label={group.code}>
            <Reveal>
              <h3 className="display-md">
                <span className="tabular-nums">{group.code}</span>
                {project && (
                  <span className="ml-3 text-muted-foreground">
                    {project.title}
                  </span>
                )}
              </h3>
            </Reveal>
            <RevealGroup as="ul" className="mt-6 space-y-4">
              {group.rows.map((row) => (
                <RevealItem
                  as="li"
                  key={`${row.code}-${row.name}`}
                  className="border-b border-border pb-4"
                >
                  <p className="font-semibold">{row.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.school} · {row.programme}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        )
      })}
    </div>
  )
}

/**
 * Results page: the announcement countdown (or the selected-applicants
 * list once announced) followed by the Applications Wrapped band.
 * Keeps its own `results` anchor; WrappedStats keeps its `wrapped` id.
 * The tick lives here so the section flips to the list live if the
 * announcement moment passes while the page is open.
 */
export function Results() {
  const remaining = useCountdown()
  const announced = isSelectionAnnounced()
  return (
    <section
      id="results"
      className="scroll-mt-24 border-t border-border py-24 md:py-32"
    >
      <div className="container">
        <SectionHeading
          kicker="Selection announcement"
          title="Results"
          lede={
            announced
              ? "The 15 September 2026 selection is announced — the selected applicants are listed below."
              : "Applications are closed and under review. The countdown is live — check back at the announcement."
          }
        />
        {announced ? (
          <AnnouncedList />
        ) : (
          <PreAnnouncement remaining={remaining} />
        )}
      </div>
      <WrappedStats />
    </section>
  )
}
