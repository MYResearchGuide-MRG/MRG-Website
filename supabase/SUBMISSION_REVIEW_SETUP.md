# Submission review

The committee queue checks required content without downloading project images or full submissions. It is separate from Demo Day judging and feedback release.

## Deployment

Migration `202611210003_submission_review_queue.sql` was applied to MYSSP project `szyafrbnzfxbephkwubg` on 21 November 2026. Do not rerun it there. The UI remains local until the frontend is deployed.

For a different database, apply the existing access, roster, cohort, mentor and deadline migrations first, then this migration. Installing it does not create decisions or change editing access, visibility or deadlines.

## Workflow

- **Missing content:** required text, images, profile information or links are missing or invalid. Additional materials are optional.
- **Ready for review:** all automatic checks pass; link accessibility and quality still need human review.
- **Changes requested:** the committee's note is visible privately to the team and assigned mentors.
- **Needs recheck:** the project changed since its latest committee decision.
- **Approved:** a committee member confirmed all four review checks against the current project content. Approval never publishes a project.

If corrections are needed after the deadline, use **Manage deadline** and enable the relevant project editing switches. Saving a review does not reopen editing or send email.

The database rejects stale decisions using both a content digest and a review revision. It records every successful decision in `myssp_submission_review_history`. Direct browser reads/writes to review tables are disabled. Queue and mutation RPCs require committee access; the student-facing RPC permits only the assigned team, assigned mentors and committee. No reviewer account identifiers are returned to teams.

## Testing and preview

`node --test supabase/tests/submission-review.test.mjs src/components/admin/review-model.test.mjs src/components/projectboard/submission-checklist.test.mjs`

The normal live build uses the configured Supabase connection. A local-only demo can be built with `VITE_ACCESS_MODE=preview` and `VITE_REVIEW_DEMO=true`. It contains sample completeness and review states; it is not the live roster. Never set these preview values in Vercel.

The review queue is loaded on entry, after saved-submission version changes, and on explicit refresh. It does not start a new polling loop or request full images. Team notes load only for authorised project viewers.
