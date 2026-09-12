import type { SelectedRow } from "@/data/selected"

/**
 * One line of the published register: a name and the school behind it.
 *
 * `SelectedRow` also carries the project they chose and their programme. They
 * are deliberately not read here — the roster names applicants and where they
 * study, and nothing else about them. The separators are horizontal only, so
 * the rows read as a list rather than as cards.
 */
export function ApplicantRow({ row }: { row: SelectedRow }) {
  return (
    <tr className="border-b border-border">
      <th scope="row" className="py-4 pr-6 text-left font-medium">
        {row.name}
      </th>
      <td className="py-4 text-muted-foreground">{row.school}</td>
    </tr>
  )
}
