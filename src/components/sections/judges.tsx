import { ArrowUpRight } from "lucide-react"
import { LinkedinIcon } from "@/components/layout/social-icons"
import type { Judge } from "@/data/judges"
import { getDemoDayEdition } from "@/data/demo-day"
import { useDemoDayYear } from "@/lib/demo-day"
import { DemoDayTabs } from "./demo-day-tabs"
import styles from "./judges.module.css"

function JudgeCard({ judge, special }: { judge: Judge; special?: boolean }) {
  return (
    <article className={styles.card}>
      {special && <p className={styles.partner}>{judge.organisation}</p>}
      <div className={styles.identity}>
        <img
          className={styles.portrait}
          src={judge.portrait}
          alt={judge.name}
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
        />
        <div className={styles.details}>
          <h3>{judge.name}</h3>
          <p>{judge.role}</p>
          {!special && (
            <p className={styles.organisation}>{judge.organisation}</p>
          )}
        </div>
      </div>
      <p className={styles.bio}>{judge.bio}</p>
      <a
        className={styles.profile}
        href={judge.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${judge.name} on LinkedIn (opens in a new tab)`}
      >
        <LinkedinIcon className={styles.linkedin} aria-hidden />
        <span>LinkedIn</span>
        <ArrowUpRight size={15} aria-hidden />
      </a>
    </article>
  )
}

export function Judges() {
  const year = useDemoDayYear()
  const edition = getDemoDayEdition(year)
  return (
    <section className={styles.page} aria-labelledby="judges-heading">
      <div className={styles.container}>
        <DemoDayTabs current="judges" year={year} />
        <header className={styles.heading}>
          <h1 id="judges-heading">Demo Day judges</h1>
          <p>
            {edition
              ? `Meet the panel for MYSSP ${year}.`
              : `Judges for MYSSP ${year} have not been published.`}
          </p>
        </header>
        {edition && (
          <>
            <section
              className={styles.group}
              aria-labelledby="main-award-judges"
            >
              <h2 id="main-award-judges">Main award judges</h2>
              <div className={styles.grid}>
                {edition.mainAwardJudges.map((judge) => (
                  <JudgeCard key={judge.name} judge={judge} />
                ))}
              </div>
            </section>
            <section
              className={styles.group}
              aria-labelledby="special-award-judges"
            >
              <h2 id="special-award-judges">Special award judges</h2>
              <div className={styles.specialGrid}>
                {edition.specialAwardJudges.map((judge) => (
                  <JudgeCard key={judge.name} judge={judge} special />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  )
}
