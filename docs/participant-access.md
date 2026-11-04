# MYSSP accounts and project access

## Current status

The hosted Supabase database was configured on 2026-11-04. It contains 12 projects, all hidden and locked, 35 finalist assignments, and one committee-controlled test assignment on A-1. The committee account is myresearchguide.org@gmail.com. Public sign-up is disabled. The participant sign-in flow now uses a persistent, six-character access code (a Supabase Auth password) that remains valid until an admin replaces it. The code is never stored in the project tables or returned to the admin browser.

The persistent-code Edge Function has been redeployed, and the credential email is saved as the conditional **Reset password** template. Anonymous API checks confirm that hidden projects and submissions are not returned and participant emails cannot be read. Custom Gmail SMTP is enabled. Receipt of a test code and sign-in to hidden project A-1 were confirmed. The 35 finalist accounts have not been invited.

The ignored .env.local now uses VITE_ACCESS_MODE=supabase. Localhost connects to the hosted database. Production always uses Supabase and never exposes the local workspace entry button.

## Local admin access

Open http://myssp.localhost:5173/#/admin and sign in with the committee account and its newly created password. This manages real hosted records. Keep publication and editing switches off until the committee is ready.

The roster is stored in the ignored .private/finalists-2026.csv, containing only name, email and project code, and has already been imported into Supabase. I-2 remains unsplit until the committee assigns the teams. Importing does not send invitations.

## Setup reference

The schema, seed, roster, admin role, Auth settings, and Edge Function are already applied to the current project. The steps below also document setup for a fresh environment. Do not rerun table-creation SQL against the configured project.

1. Open project szyafrbnzfxbephkwubg. Run these files in SQL Editor, once, in order:
   - supabase/migrations/202611040001_myssp_access.sql
   - supabase/migrations/202611040002_project_seed.sql
   The 12 project pages start hidden and locked. The seed contains no participant emails.
2. Authentication settings: disable **Allow new users to sign up**, keep email/password authentication enabled, and retain Auth rate limits. The six-character permanent access code is a password, not an email OTP.
3. Create the committee account under Authentication → Users. Enter a new strong password yourself. Do not reuse the password previously posted in chat. Copy its UUID and run in SQL Editor:
   ```sql
   insert into public.myssp_admins(user_id)
   values ('REPLACE-WITH-ADMIN-USER-UUID') on conflict do nothing;
   ```
   Only the project owner should grant this role. It gives access to all participant assignments and publication controls.
4. Configure custom SMTP under Authentication → Email. Supabase's default sender only sends to project-team addresses. This project currently uses myresearchguide.org@gmail.com as sender/username with smtp.gmail.com on port 465 and a Google app password. The committee login also uses myresearchguide.org@gmail.com. Enter credentials directly in Supabase, never in Git or frontend variables. Google sending limits still apply. A transactional provider with a verified organisational domain is an alternative.
5. Replace the **Reset password** email template with `supabase/templates/project-access.html`, subject **Your MYSSP login credentials**. The conditional template sends the participant's email and permanent access code. It retains a normal reset link for unrelated recovery requests. Remove the former MYSSP-specific text from the **Magic link or OTP** template so it does not imply the permanent code expires.
6. Deploy supabase/functions/invite-participants/index.ts (already deployed through the dashboard):
   ```sh
   npx supabase login
   npx supabase link --project-ref szyafrbnzfxbephkwubg
   npx supabase functions deploy invite-participants --no-verify-jwt
   ```
   The function validates the caller with Auth and checks the database admin role. The flag disables only the legacy gateway check. Standard Supabase function environment variables must be present; service-role credentials stay server-side.
7. Set VITE_ACCESS_MODE=supabase in .env.local, rebuild, sign in as admin, and import .private/finalists-2026.csv. This step is complete for the current project. Local data does not migrate automatically.
8. Test with a committee-controlled address before bulk sending. Verify hidden-but-editable access, editing locks, another team's project, revocation and replacement codes. Keep real projects hidden and locked until deliberately enabled.
9. Set Vercel environment variables and rebuild:
   ```text
   VITE_SUPABASE_URL=https://szyafrbnzfxbephkwubg.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<public publishable key>
   VITE_ACCESS_MODE=supabase
   ```
   Never put service-role or SMTP credentials in VITE_ variables.

## Panel workflow

- **Add participants:** CSV/TSV upload or pasted rows; review before import. Download the template in the dialog. Format: name,email,project_code. The original Selected Project,Name,Email spreadsheet format also works; extra columns are ignored. Up to 200 rows, duplicate emails rejected.
- **Invitations:** select up to 50 people. The server verifies admin access, creates accounts and emails a random six-character access code. The code stays valid until an admin sends a replacement, which invalidates the previous one. Email requests have a resend cooldown, and codes are not returned to the admin UI. The code is put in Auth metadata only while the email is rendered, then removed; Supabase Auth stores the password hash.
- **Library visibility:** show/hide public listing and direct public access.
- **Team editing:** independently allow/lock team changes. Both switches start off.
- **Participant access:** reassign or revoke. Permissions take effect on the next request, even for existing sessions. Content remains.
- **Split project:** create I-2A/I-2B, assign students and accounts, then create pages transactionally. Children start hidden/locked. Parent content is retained and the parent submission page retired. The mentor catalogue remains unchanged. Previous submissions are not copied into child pages.

## Implementation and limits

Database RLS restricts public reads to published projects and participants to their active assignment. Account emails are visible only to that account and committee admins. Participants cannot change codes, assignments, visibility, editing controls or admin roles. Saves recheck permissions server-side and reject stale revisions to prevent teammate overwrites.

Publishing exposes project/team presentation, not account email records. External YouTube, Canva and Drive URLs remain external: hiding a page does not make externally hosted materials private. Existing public mentor briefs and finalist names remain site content.

Images currently use size-limited JPEG data in submission JSON. Videos, slides and PDF files remain external links.

Tests in supabase/tests/access.test.mjs execute the migration in isolated PGlite PostgreSQL. They test permissions and validation, not hosted Auth/SMTP delivery. Run TypeScript, Vite build and the admin/projectboard tests before deployment.

References: [password auth](https://supabase.com/docs/guides/auth/passwords), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
