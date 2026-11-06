import { demoDayYears } from "@/data/demo-day"
import { demoDayHref, type DemoDaySection } from "@/lib/demo-day"
import styles from "./demo-day-tabs.module.css"

export function DemoDayTabs({
  current,
  year,
}: {
  current: DemoDaySection
  year: number
}) {
  return (
    <div className={styles.navigation}>
      <nav className={styles.years} aria-label="Demo Day year">
        {demoDayYears.map((editionYear) => (
          <a
            key={editionYear}
            href={demoDayHref(current, editionYear)}
            aria-current={editionYear === year ? "page" : undefined}
          >
            {editionYear}
          </a>
        ))}
      </nav>
    </div>
  )
}
