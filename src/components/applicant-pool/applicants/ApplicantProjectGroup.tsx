import type { SelectedRow } from "@/data/selected"

import { ApplicantRow } from "./ApplicantRow"

/**
 * One assigned project's finalists.
 *
 * The group gets its own `<table>` — caption and column headers included —
 * rather than a synthetic heading row spliced into one long table, so each set
 * of rows keeps the headers that describe it. `title` is null for a code with
 * no project behind it; the code renders alone instead of an invented title.
 */
export function ApplicantProjectGroup({
  code,
  title,
  rows,
}: {
  code: string
  title: string | null
  rows: SelectedRow[]
}) {
  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="text-left">
        {/* Reserve the height of the tallest caption the two columns can meet at
            — the code's line plus two wrapped title lines in the narrower `lg`
            column, and plus one in the wider `xl` one. Without it a one-line
            title beside a three-line one left the header rows and everybody
            under them out of step, which reads as a misprint rather than as two
            registers. Single column below `lg`, so nothing to align there. */}
        <span className="block lg:min-h-[3.5lh] xl:min-h-[2.5lh]">
          {/* The code gets a fixed slot, so every project's title starts at the
              same x and a wrapped title line hangs under the title instead of
              running back under the code. Laid inline, the twelve headings each
              began where their own code happened to end (113px in one, 133px in
              the next) and read as twelve unrelated blocks. 2.3em is the widest
              code in the register at the display size, and it scales with it.

              `items-start`, not `items-baseline`: a 30px label and a 16px title
              sharing a baseline put the title's caps 9.4px below the label's,
              which reads as a dropped line rather than one heading. Starting
              both line boxes together lands their cap tops within half a pixel. */}
          <span className="flex items-start gap-3">
            <span className="display-md w-[2.3em] shrink-0 tabular-nums">
              {code}
            </span>
            {title && <span className="text-muted-foreground">{title}</span>}
          </span>
        </span>
      </caption>
      <thead>
        <tr className="border-b border-border">
          {/* A fixed track for NAME, not an auto one: auto sizing gave every
              group its own split (257px in one, 486px in the next), so the
              school column started at a different x in all twelve tables and
              the register read as scattered columns rather than one grid. Each
              width is the narrowest that still holds the longest name in the
              register on a single line at that table width. Below `lg` the
              register is one column, so there is no neighbour to line up with
              and the split only has to stay the same in every table — 45%. */}
          <th
            scope="col"
            className="label-micro w-[45%] pt-6 pb-3 text-left text-muted-foreground lg:w-[13rem] xl:w-[18rem] 2xl:w-[22.5rem]"
          >
            NAME
          </th>
          <th
            scope="col"
            className="label-micro pt-6 pb-3 text-left text-muted-foreground"
          >
            SCHOOL
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <ApplicantRow key={`${row.name}-${row.school}`} row={row} />
        ))}
      </tbody>
    </table>
  )
}
