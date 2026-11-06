import { useDemoDayYear, type DemoDaySection } from "@/lib/demo-day"
import { Awards } from "./awards"
import { Judges } from "./judges"
import styles from "./demo-day-page.module.css"

// Replay the transition for a different page or edition, not routine re-renders.
export function DemoDayPage({ section }: { section: DemoDaySection }) {
  const year = useDemoDayYear()
  return (
    <div key={`${section}-${year}`} className={styles.intro}>
      {section === "judges" ? <Judges /> : <Awards />}
    </div>
  )
}
