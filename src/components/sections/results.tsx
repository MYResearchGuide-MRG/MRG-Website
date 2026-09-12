import { ApplicantAnnouncement } from "@/components/applicant-pool/applicants/ApplicantAnnouncement"
import { PoolOverview } from "@/components/applicant-pool/overview/PoolOverview"
import { Reveal } from "@/components/motion/reveal"
import { useAnnounced, useCountdown } from "@/lib/results"

/**
 * Shown until the announcement moment.
 *
 * The register below is a selection outcome, so it stays behind the date. This
 * is the whole of the pre-announcement page: a countdown and the date it
 * counts to, under the same `applicants` anchor the register will use.
 */
function PreAnnouncement() {
  const remaining = useCountdown()

  return (
    <section
      id="applicants"
      className="scroll-mt-24 border-t border-border py-24 md:py-32"
    >
      <div className="container">
        <Reveal>
          <p className="label-micro text-muted-foreground">The finalists</p>
          {/* aria-live is off: a per-second announcement would monopolise a
              screen reader for the duration of the page. */}
          <p aria-live="off" className="display-lg mt-6 tabular-nums">
            {remaining}
          </p>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Finalists are revealed here on 12 September 2026 at 10:00 PM.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/**
 * Results page: the selected roster, then the pool it was drawn from.
 *
 * The register is a selection outcome and stays gated by `useAnnounced`: the
 * page shows the countdown until the announcement moment and the names after
 * it. The pool statistics describe applications rather than outcomes, so they
 * are published unconditionally, underneath the list they explain.
 */
export function Results() {
  const announced = useAnnounced()

  return (
    <div id="results">
      {announced ? <ApplicantAnnouncement /> : <PreAnnouncement />}
      <PoolOverview />
    </div>
  )
}
