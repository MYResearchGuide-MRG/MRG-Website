# Demo Day judging backend

## Live MYSSP status

Completed on 19 November 2026 for project `szyafrbnzfxbephkwubg`:

- Applied `202611140001_judging.sql`, including the cohort row-lock correction. Do not rerun it on this project.
- Deployed `invite-judges` with the shared invitation handler bundled into its dashboard entry point. Legacy gateway JWT verification is off; verified Auth and committee-role checks remain inside the handler.
- Saved the conditional Reset password template with judge instructions, retaining the existing subject and SMTP setup.
- Confirmed RLS on all three judging tables. Anonymous table requests return permission errors; invitation requests without a session or with an invalid token return HTTP 401.
- A rolled-back live transaction verified lineup-only private access, closed-state denial, committee-only controls, score submission, final-review locking and anonymous released feedback. No test account, lineup or score was retained.
- The 2026 cohort remains closed for judging, with feedback unreleased. No judges have been added or invited by this deployment, and no emails were sent.

The release combines PR #10 with the newer production changes for 30-day sign-ins, deadline controls, submission review and supported material links. Real invitation delivery and a judge's browser sign-in have not been exercised in this rollout.

## Deploy

Update, 21 November 2026: the frontend release includes the current production branch changes. `202611210004_material_link_providers.sql`, `202611210005_judging_save_versions.sql` and `202611210006_material_provider_policy.sql` were applied live in this audit. Do not rerun them. The browser must use `myssp_save_judge_review_v2` with `expected_updated_at`; the old direct save RPC is no longer executable by authenticated clients. No live judges or scores existed at installation, and judging and feedback release remain off. Deploy the new frontend before real judge invitations. See `docs/SYSTEM_AUDIT_2026-11-21.md` for verification and limits.

1. Confirm the existing MYSSP account, cohort, project and mentor migrations are applied. Check whether `public.myssp_judges` already exists before running the judging migration; it creates tables and must run only once.
2. Apply `migrations/202611140001_judging.sql` in the project SQL editor. The transaction creates judges, ordered cohort lineups and private score/feedback records, plus restricted administration and submission functions. All cohorts start with judging closed and feedback unreleased.
3. Deploy `functions/invite-judges/index.ts` with its `_shared/account-invitations.ts` dependency. With an authenticated Supabase CLI, run:

   ```sh
   npx supabase functions deploy invite-judges --project-ref szyafrbnzfxbephkwubg --no-verify-jwt
   ```

   The handler verifies the bearer token with Supabase Auth and checks `myssp_is_admin()` before using the server-side service role. Disabling the legacy JWT gateway does not permit anonymous invitations. For dashboard deployment, include the shared helper or combine it with the entry point in one file.
4. Use `templates/project-access.html` for Authentication > Email > Reset password. Preserve the existing SMTP configuration and subject. The template keeps participant and mentor credentials and adds judge instructions. It still renders a normal recovery link when no invitation code is present.
5. Connect the judging frontend with the existing public Supabase URL/key and `VITE_ACCESS_MODE=supabase`. Do not send judge invitations before that frontend is available at the production sign-in URL.

## Committee workflow

- Choose a cohort in **Judging**, add/import judges, and set the project lineup. Adding records does not send email.
- Send access codes only to selected judges. Reissuing a code replaces the previous code; codes never appear in the admin response or logs.
- Open judging when ready. Judges can view active projects in their cohort's lineup, save partial drafts and submit complete reviews. They cannot read other judges' scores or edit student submissions.
- Close judging to stop all judge writes. Complete drafts are submitted at closing; incomplete drafts remain private and are not released. The lineup stays locked while judging is open.
- Release feedback only after closing. Assigned participants and mentors receive submitted scores and remarks, labelled by main/special award type, without judge names or identifiers and in random order.

Judging closes through the committee control, not a scheduled date. The separate participant submission deadline remains unchanged. Paused or deleted judges lose private access immediately through database policies.

## Verification

```sh
node --test src/components/judging/form.test.mjs src/components/judging/judge-model.test.mjs supabase/tests/judging.test.mjs supabase/tests/invitation-functions.test.mjs
npm run build
npm run lint
```

The database tests use isolated PostgreSQL through PGlite and invitation tests use mocks. They do not send email. After live deployment, verify anonymous access is denied, the invitation endpoint rejects an unauthenticated request, and all release switches remain off. Use a committee-owned test address for a separately authorised email and sign-in test before bulk invitations.
