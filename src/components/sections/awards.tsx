import { Reveal } from "@/components/motion/reveal"
import styles from "./awards.module.css"

export function Awards() {
  return (
    <section className={styles.page} aria-labelledby="awards-heading">
      <Reveal className={styles.container}>
        <h1 id="awards-heading">Awards</h1>
        <p>
          Award winners will be announced after Demo Day. Check back soon.
        </p>
      </Reveal>
    </section>
  )
}
