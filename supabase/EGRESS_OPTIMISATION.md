# Incremental reads

Applied `202611210001_incremental_reads.sql` to MYSSP on 21 November 2026.
Apply this additive migration before deploying the matching frontend on another environment.
It does not change existing row-level policies, editing deadlines, publication flags or accounts.

## Behaviour

- One RLS-protected, security-invoker snapshot replaces the repeated full-table downloads.
- Opaque versions change on writes to projects, participants, submissions and admin profiles.
- The browser supplies versions it already has. The server returns the full visible ID list,
  but includes large project/participant/profile records only when changed.
- Full submissions load only when their project page opens. Archive covers load near the viewport.
  Profile and mentor lists use text summaries. Reopening an unchanged page reuses its data.
- Cached data stays in memory. Logout/account changes clear it, and refreshed access lists prune
  deleted or newly inaccessible records. No persistent private-content browser cache was added.
- Visible tabs still check access every 30 seconds and on return to the tab. Authentication refreshes
  no longer trigger extra content reads. Mutations request a fresh snapshot.
- New portraits are at most 320×320 with a 90,000-character encoded budget. Project images are
  bounded to 1280×800 with a 400,000-character budget. Existing original images are untouched.

## Live measurement

Read-only SQL measured the same committee user's accessible data, with no record changes:

| Read | Raw JSON bytes |
| --- | ---: |
| Previous project + participant + submission refresh | 6,728,707 |
| New initial snapshot | 2,931,786 |
| New unchanged snapshot | 18,938 |

That is 99.72% less JSON per unchanged refresh and about 56.43% less on initial load.
These are uncompressed payload sizes, not a prediction of billed egress. Existing cycle usage
does not reset after this fix. Existing inline portraits still contribute to the first snapshot;
moving them to authorised, cacheable media storage is a separate future improvement.

## Validation and rollout

`backend.test.mjs` covers 120 idle polls, request coalescing, page-scoped reads, cache invalidation,
revocation, offline behaviour, stale saves and sign-out races. `incremental-reads.test.mjs` exercises
the migration with real Postgres semantics through PGlite, including anonymous/student/mentor/admin
RLS, changed records, unchanged image omission and deadline enforcement.

The production hotfix is based on `moses`, independent of the pending judging PR. When integrating
the judging PR, update its list views to use `backend.summaries` and explicitly request
`loadLiveProjectContent(projectId)` before rendering a full submitted page. Do not assume that
`backend.drafts` contains every accessible submission after the initial snapshot.

Old frontend builds remain compatible with the added columns/triggers, but continue their old
bandwidth-heavy reads. A frontend rollback will therefore restore the old transfer behaviour.
