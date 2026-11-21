# Cohort editing windows

Apply `migrations/202611210002_manage_submission_deadlines.sql` after the existing
cohort, mentor, and submission-deadline migrations, before releasing the new UI.
Installing it does not change any existing deadline or reopen a project.

## Committee workflow

1. Select a cohort in **Committee → Projects** and open **Manage deadline**.
2. Enter the last editable date and minute in Malaysia time (MYT, UTC+8).
3. For a full final-review round, select **Enable editing for all projects**.
   Otherwise, existing project editing switches are preserved. Individual teams
   can be enabled or locked after reopening the cohort window.
4. Save. Students can save through the chosen minute; the server rejects later
   submission, name, and photo edits. Committee corrections remain available.

**No automatic deadline** keeps the window open until the committee chooses a
date or uses **Close now**. Close now requires confirmation. A closed cohort can
be reopened repeatedly for later correction rounds.

Archive visibility is independent. Reopening never publishes projects, restores
revoked accounts, changes other cohorts, or reactivates retired/deleted projects.
No invitations are sent.

## Enforcement and concurrency

`myssp_set_submission_deadline` is authenticated and committee-only, with an
empty search path. The RPC locks the cohort row and checks the previously read
deadline before updating it. Stale dialogs must be reopened. Optional bulk
unlocking and the deadline change occur in one transaction. Browser roles do
not receive direct cohort-update privileges.

The existing server-side submission and profile guards read this same cutoff;
automatic closing does not depend on a browser timer or a scheduled job.
Client timers refresh the visible state, and the next server write always
checks the current deadline. The UI stores the exclusive cutoff one minute
after the requested last editable minute, independent of device timezone.

Regression coverage: `supabase/tests/manage-deadlines.test.mjs`, existing
`supabase/tests/submission-deadline.test.mjs`, date conversion tests, and the
backend adapter tests. Browser verification uses device-only preview data.
