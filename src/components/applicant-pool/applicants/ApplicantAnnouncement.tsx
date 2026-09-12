import { ApplicantProjectGroup } from "./ApplicantProjectGroup"
import { projectCodes, projects } from "@/data/competition-data"
import { SELECTED, type SelectedRow } from "@/data/selected"

/** Code -> published title, from the same catalogue the results page reads. */
const TITLE_BY_CODE: Map<string, string> = (() => {
  const codes = projectCodes(projects)
  const byCode = new Map<string, string>()
  for (const project of projects) {
    const code = codes.get(project.id)
    if (code) byCode.set(code, project.title)
  }
  return byCode
})()

/**
 * Selected rows grouped by assigned project, ordered ascending and natural
 * (A-1, A-2 … B-1 … P-1). Deliberately not demand-ordered: this is a register
 * of outcomes, and ranking it by popularity would read as a competition order.
 */
const GROUPS: Array<{ code: string; rows: SelectedRow[] }> = (() => {
  const byCode = new Map<string, SelectedRow[]>()
  for (const row of SELECTED) {
    const rows = byCode.get(row.code)
    if (rows) rows.push(row)
    else byCode.set(row.code, [row])
  }
  return [...byCode.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([code, rows]) => ({ code, rows }))
})()

/**
 * The selected roster, in ordinary page layout — this is the whole of the
 * register. Grouping and order are static, and there is no filter: a name is
 * found by reading the project it belongs to, or with the browser's own find.
 */
export function ApplicantAnnouncement() {
  return (
    <section
      id="applicants"
      className="scroll-mt-24 border-t border-border py-24 md:py-32"
    >
      <div className="container">
        <h2 className="display-lg max-w-3xl">The finalists</h2>

        {/* Two columns of project groups, so the register scans as a grid of
            names rather than one long scroll. `items-start` keeps a short group
            from stretching to the height of the tall one beside it. */}
        <div className="mt-16 grid items-start gap-x-12 gap-y-16 lg:grid-cols-2">
          {GROUPS.map((group) => (
            <ApplicantProjectGroup
              key={group.code}
              code={group.code}
              title={TITLE_BY_CODE.get(group.code) ?? null}
              rows={group.rows}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
