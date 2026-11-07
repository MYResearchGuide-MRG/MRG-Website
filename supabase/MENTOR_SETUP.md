# Mentor access rollout

The mentor UI is available in the local preview. The live database is unchanged until the committee applies this rollout.

1. Run [`202611070001_mentor_access.sql`](migrations/202611070001_mentor_access.sql) in the MYSSP Supabase SQL editor after the earlier migrations.
2. Deploy the `invite-mentors` Edge Function. It uses the same project URL, service role secret and email setup as `invite-participants`.
3. Replace the Supabase **Reset Password** email template with [`project-access.html`](templates/project-access.html). Its mentor branch says to choose **Mentor** at sign-in; the participant branch stays as before. Keep the existing subject and SMTP sender if they are already configured.
4. In the committee workspace, open **Mentors**. Add one person or import a CSV with `name,email,affiliation,project_codes`. Separate multiple project codes with semicolons, for example `A-1;A-2`. The import validates the whole batch before saving. Mentor records do not send email until the committee chooses **Invite** or **Send access codes**.
5. Send a code to a committee-owned test mentor address first. Sign in from a private window. Confirm that assigned hidden pages open, unrelated hidden pages do not, and the project editor never appears.

Mentors can read only their assigned project briefs and submissions. They cannot change submissions, awards, project visibility or team membership. Pausing a mentor removes private access through database policies even if their sign-in session remains open. When a project is split, its mentor assignments copy to the child pages; review those assignments afterward.

The six-character mentor code stays valid until reissued. Each new invitation replaces the old code. The Edge Function never returns the code to the browser or logs it. In the local preview, invitations generate test codes on the device and send no email.

## Submission deadline and archive URL

Apply [`202611070002_submission_deadline.sql`](migrations/202611070002_submission_deadline.sql) before releasing the student checklist. It closes participant project and profile writes for the 2026 cohort at **21 November 2026, 00:00 MYT**, allowing saves throughout 20 November. Supabase checks its own clock on every write, so no scheduled job is required. Committee corrections and reading assigned projects remain available. New cohorts start without a deadline; their deadline is stored separately in `myssp_cohorts.submission_closes_at`.

The canonical archive URL is now `/#/project-archive`. Old `projectboard`, `researchlibrary` and `research-library` links redirect while preserving the project path. Use the updated email template when deploying.

The student checklist is a completion aid, not a claim that external files have been inspected. Required links, photos and page content are checked locally, and the team must confirm a final manual review. Draft saves remain possible while items are incomplete. Additional materials are optional. The saved page at the deadline is the submission.
