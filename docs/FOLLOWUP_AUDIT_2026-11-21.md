# MYSSP follow-up audit, 21 November 2026

## Changes

- Released feedback now opens with main-award averages and separate special-award totals. Individual reviews retain all eight scores and both comments, grouped by award type. Server-provided anonymous ordering is preserved.
- Profile forms warn before discarding unsaved edits, report dirty state to the sign-out dialog, and prevent saving or navigation while a photo is processing. Project forms use the same link, hash-history and reload guard.
- Mobile judging scales fit the page instead of widening it. Submitted reviews remain disabled.
- The homepage submission milestone now says 20 November, matching the original programme deadline. This static milestone does not change the committee's configurable correction deadline.
- A fictional feedback demo is gated by localhost, preview access mode and an explicit build flag. Its component and sample content are excluded from the normal production bundle.

## Verification

The final pre-push run passed **136 system tests**, zero failures, skips or cancellations. The production TypeScript/build check, repository-wide ESLint and Git whitespace check passed. Vite still reports a non-blocking main-bundle size warning (about 586 kB before gzip).

Browser actions used a separate local preview on port 5195 with fictional accounts. No live records, real invitations, judging settings or feedback-release settings were changed.

| Area | Observed checks |
| --- | --- |
| Public pages | Home, projects/search/filters/briefs, archive, resources, judges, awards, FAQ and mobile navigation; no page-width overflow or broken images in the inspected states |
| Authentication | Invalid participant login, participant/mentor/judge demo sign-in, persistent session after editing, sign-out confirmation and stable header position when opening sign-in |
| Participants | Individual add/edit, invalid CSV rejection, valid 25-row import, 26-person select-all across pagination and filtered selection |
| Committee setup | New 2027 cohort, shared research field and project; new project stayed hidden and editing-locked |
| Mentors | Add, email edit, delete/restore, local invitation preparation, assigned hidden-project reading and non-assigned hidden-project denial |
| Project split | I-2 split into I-2A/I-2B; mentor assignment automatically included both children |
| Deadlines | Reopening the local cohort enabled editing without publishing projects; database tests cover post-deadline project/profile writes and committee overrides |
| Submission review | Saved project changes appeared in the queue; a committee change request appeared on the assigned student's page |
| Materials | Wrong-provider validation blocked saving; valid YouTube link saved. Provider formats, Canva resolver boundaries, legacy-link handling and malicious inputs are covered by automated tests |
| Profile | Cancelled leave-page warning retained the name; sign-out reported unsaved changes; saved name persisted; 1600px synthetic avatar became a 320px image and persisted after refresh |
| Judging | Lineup configuration/locking, judge draft save, complete-review submission and locking, committee 32/40 result, pre-release privacy, explicit release and anonymous student review with all scores/comments |
| Responsive layouts | Public routes, committee sections, judging and both feedback views checked at 390px; the judging overflow was fixed and rechecked |

Automated stress cases include 50 competing writes from one revision (one accepted, 49 stale), 100 concurrent refreshes sharing reads, and 1,000 malicious resolver hosts rejected without outbound fetches. These are bounded local/integration tests, not a measurement of live Supabase capacity.

## Limits

- The user stopped browser control during the final Back-navigation check. Link cancellation and sign-out warnings were observed in the browser; Back/Forward rejection is covered by the new navigation unit tests.
- External sharing permissions, PDF contents, Canva publishing permissions, video duration and slide count still need human review. URL validation cannot establish those facts.
- Production email delivery and real-device Safari/Firefox were not retested. The audit does not claim exhaustive coverage of every browser, network failure or production load.
- Local demo roster rendering uses static team fixtures in some project views; production roster synchronisation is checked by database tests.

See `FEEDBACK_PREVIEW.md` for the isolated demo, and `SYSTEM_AUDIT_2026-11-21.md` for the earlier backend/deployment audit.
