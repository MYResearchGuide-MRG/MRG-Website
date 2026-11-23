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
