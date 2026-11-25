# Judging workflow

Updated 23 November 2026.

1. In **Committee → Judging → Lineup**, choose the cohort and add its projects.
2. **Save lineup and start marking** saves the order and opens marking together.
   Judges with active accounts in that cohort can immediately score the lineup,
   including projects that are hidden from the public archive.
3. Scores and remarks stay private. **Feedback to teams** remains off until the
   committee explicitly releases the results.
4. The committee can still close marking. Complete drafts from active judges
   are submitted automatically; incomplete drafts stay saved. Reopening allows
   unfinished reviews to continue, but already-submitted reviews remain final.
5. Release feedback after review. Each team sees only its own anonymised reviews,
   separated into main and special award judges, with randomised ordering.
   Release closes marking; changing a released lineup requires hiding feedback
   first. Closing marking unlocks an unreleased lineup for changes.

## Judges who cannot attend Demo Day

In **Judging → Project lineup**, choose **Save lineup only** to prepare projects without opening general marking. Under **Research-only marking**, the committee can set the closing time in Malaysia time, start marking immediately, or pause it. This applies to both main and special award judges marked as unable to attend Demo Day. Attending judges use the general judging switch.

For 2026 the cutoff is **28 November at 4:00 pm MYT (08:00 UTC)**. The database checks the cutoff on draft saves, individual submissions and bulk submissions. Saved answers remain available to review. Feedback is shared only when the committee releases it. To reopen an expired window, save a future deadline and select **Start research marking**.

In the **Judges** table, untick **Demo Day** for a judge who will
review from the project pages only. They see only Research Execution & Quality
(3 scores and one review, out of 15) and no presentation section. Attendance
locks once the judge submits a review; changing it earlier clears any
presentation answers from their drafts. The CSV import accepts an optional
`attends_demo_day` column (`yes` or `no`, blank means yes).

Scoring stays out of 40. Each criterion is averaged over the judges who scored
it, so a project's total is the research average from every judge plus the
presentation average from judges who attended. When every judge attends, this
equals the mean of the judges' totals, as before. Results show a remote
judge's review as, for example, 9/15. Teams see that review labelled as
research only, and their main award average uses the same rule. Rankings
compare each total as a share of its maximum, which only matters while a
project has research-only reviews alone.

In **Progress & results**, expanding a project shows a card for each judge:
their total, ratings and comments for each section, then **Return to draft**
and **Discard**. **Return to draft**
turns a submitted review back into a draft, keeping its answers, so the judge
can change and resubmit it. It is unavailable once feedback is released.

Backend migration: `202611240001_judge_demo_day_attendance.sql`. Applied to the live MYSSP
database on 24 November 2026; do not rerun it.

There is no Demo Day date gate. Empty lineups do not open marking, and saving an
invalid lineup changes neither the order nor the marking state. Archive
publication and student editing are independent controls.

Backend migration: `202611230001_lineup_starts_judging.sql`. Apply before deploying
the matching UI. It updates the existing admin-only lineup RPC atomically and
starts the already-prepared, unreleased 2026 lineup. It leaves other cohorts and
released feedback unchanged. Do not rerun its one-time 2026 state update after a
committee member deliberately closes marking.

Applied to the live MYSSP database on 23 November 2026. The existing cohort
remained at marking enabled, feedback hidden, one lineup project and one public
project. Local browser checks confirmed that saving a paused lineup restarts
marking without releasing feedback and that draft scores survive a reload.

Regression checks: `supabase/tests/judging.test.mjs` covers judge-only saves,
hidden projects, invalid/empty lineups, upgrade state, explicit close/reopen,
submitted-review locking and anonymous feedback release. The preview workflow
is checked in `src/components/judging/judging-admin.test.mjs`.
