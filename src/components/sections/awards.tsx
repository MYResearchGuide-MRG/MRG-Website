import { DemoDayTabs } from "./demo-day-tabs"
import { getDemoDayEdition } from "@/data/demo-day"
import { useDemoDayYear } from "@/lib/demo-day"
import styles from "./awards.module.css"

export function Awards() {
  const year = useDemoDayYear()
  const edition = getDemoDayEdition(year)
  return (
    <section className={styles.page} aria-labelledby="awards-heading">
      <div className={styles.container}>
        <DemoDayTabs current="awards" year={year} />
        <h1 id="awards-heading">{year} Awards</h1>
        <p>
          {edition?.awardsNotice ??
            `Awards for MYSSP ${year} have not been published.`}
        </p>
      </div>
    </section>
  )
}
