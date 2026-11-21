# MYSSP system audit, 21 November 2026

## Delivery state

This release combines Janelle's judging panel (PR #10, head `e1a748a`) with the current session, deadline, incremental-read, submission-review and Canva preview changes. The production branch is `moses`; the frontend and `/api/canva-link` must deploy together.

The live MYSSP database received `202611210004_material_link_providers.sql` and `202611210005_judging_save_versions.sql` together in one transaction. They must not be run again. Existing judging and submission-review migrations were already installed and were not rerun. Live verification after installation: 13 active projects, zero judge reviews, judging closed and feedback unreleased. No real invitations were sent during testing.

## Material submissions

The live checklist query after applying the confirmed provider policy found three projects needing changes: **A-4** needs its cover image and description, all three main-material links, and a bio/photo for each of its three students. **A-5** needs to replace its existing video link with a YouTube link. **I-1** needs its video link. The other 10 active projects passed automated completeness checks; their sharing permissions and content quality still require manual review.

| Field | Accepted providers |
| --- | --- |
| Video | YouTube |
| Slides | Canva, including short share links |
| Write-up | A Google Drive file intended to contain the final PDF |
| Additional materials | Named HTTP or HTTPS links; optional |

The user confirmed one provider for each main material. Migration `202611210006_material_provider_policy.sql` was applied live on 21 November 2026 and narrows the earlier broad rules without rewriting existing submissions. Live checks confirmed YouTube video, Canva short links and Drive files are accepted in their respective fields; Drive video and Google Slides are rejected. Additional materials still accept general links. This release includes the matching frontend validation.

- The editor previews valid links before saving and explains wrong-provider, folder and malformed-link errors.
- Canva short links resolve through a bounded same-origin endpoint. Every redirect is restricted to Canva's HTTPS domains. The resolver has timeouts, a maximum redirect count, a bounded cache and concurrent-request limits. It does not proxy media or download submissions through Supabase.
- A previously supplied Canva short link resolved and displayed the actual presentation in the browser.
- External lookup failure does not reject an otherwise supported short link. The original link stays available for opening on the provider's site.
- Canva slides now appear inline automatically in the editing form as well as the saved Project materials page. Typing is debounced before preview loading. Reload preview retries the lookup and iframe; unsuccessful lookups are no longer cached for five minutes. HEAD-unsupported redirect servers use GET response headers without consuming design/media content. Permission failures are not bypassed.
- Browser checks resolved the submitted A-3 and A-5 short links; A-3 rendered inside the local material card without a preview-button click and rendered again after Reload preview. Real submissions were not modified.
- The slides editor includes a three-step Canva publishing guide. Pasting Canva's HTML embed code extracts only a validated Canva design URL; the supplied HTML is never executed or saved. Browser verification confirmed the extracted URL and automatic iframe preview.
- A stale viewport on the local preview caused the entire painted page, including the fixed header, to be offset from its DOM coordinates. Resizing and resetting the affected tab cleared the issue. At the restored 691px viewport, scrolling kept the header at top 0 and document width matched viewport width. No compensating website spacing or header-position changes were introduced.
- Server validation applies to new or changed main-material URLs. Unchanged legacy URLs do not prevent unrelated project edits.
- URL checks cannot establish public sharing, PDF MIME type, video duration, slide count or whether the material belongs to the correct team. The student final-review acknowledgement and committee review cover these checks. They must not be described as automated verification.

## Judging and access fixes

- Main-award scores and each special-award judge's scores use separate result pools and exports. Ranking uses unrounded averages; the table rounds only for display.
- A versioned save endpoint rejects stale edits from another tab/device. Authenticated clients cannot bypass it through the old save endpoint.
- Judges can open the full pages for projects in their lineup, including hidden projects. That does not grant editing, committee-note access or access to other judges' reviews.
- Judge pages load the current saved project content through the lazy content loader rather than using only the static brief.
- Committee refresh requests are shared; unchanged review text is not downloaded again. Hidden tabs do not poll. Signing out or changing accounts clears private judging state and rejects late responses.
- Closing judging explains that complete drafts will be submitted; incomplete drafts stay saved and do not count. Release shows coverage and requires the committee to acknowledge reviewing comments.
- Feedback appears privately on the assigned team's project page, with each submitted review's eight scores and two comments, in random order and without judge names. Assigned mentors can read the same released feedback. There is no automatic feedback-release email in this implementation.
- Judging tabs support arrow keys, Home and End. The mentor workspace opens the mentor sign-in tab directly.

## Verification

Run `npm run test:system` for the full suite. The final automated run passed 125 tests, with no failures, skipped tests or cancellations. `npm run build` passed. ESLint passed for changed TypeScript/TSX files. The build still reports a non-blocking large-chunk warning for the main JavaScript bundle.

| Area | Evidence |
| --- | --- |
| Authentication and account lifecycle | Session expiry, role guards, revoked access, participant changes and recovery, mentor permissions, cohort isolation, invitation authorisation and code cleanup tests |
| Deadlines and corrections | Database tests for closing project/profile writes and reopening corrections without publishing projects; local UI reopening tested |
| Submissions and review queue | Checklists, stale review revisions, approval prerequisites, private notes, legacy material compatibility, URL validation and SSR rendering tests |
| Judging | Database tests for lineup-only reads, own-score writes, closed-judging enforcement, all-or-nothing submission, feedback release and anonymity |
| Concurrent writes | 50 saves with the same expected review version: one accepted and 49 rejected as stale |
| Repeated reads | 100 simultaneous committee refreshes shared one metadata read and one changed-content read; unchanged content did not trigger another detail download |
| Resolver safety | Redirect, timeout and provider tests; 1,000 lookalike-host inputs rejected without outbound fetching |
| Browser workflow | Local judge sign-in, scoring, autosave, next-project navigation, committee draft visibility, close, release and anonymous feedback rendering |
| Browser editor | Individual participant creation/invitation preview, same-tab participant sign-in, wrong-link rejection, actual Canva short-link embed, save while staying signed in |
| Public navigation | Homepage, project search, research-field collapse, resources, judges, awards and empty public archive while projects are hidden |
| Layout and errors | Stable header width/position when sign-in opens; material page at a narrow viewport had no horizontal overflow; no application console warnings/errors on the checked public and judge routes |

Screenshots and raw test/build output are in `.private/system-audit-2026-11-21/` and `.private/`. Local demo: `http://127.0.0.1:5193/#/admin`.

## Limits of this audit

Database stress tests run in isolated PostgreSQL through PGlite; they are not measurements of live Supabase capacity. Invitation tests use mocks and do not prove inbox delivery. The browser workflow used fictional local accounts, not real judge credentials. The local participant preview keeps invitation codes in the issuing tab; production sign-in uses Supabase.

The feedback preview was exercised through the committee view of the team's component; database tests independently cover participant and mentor access. Every external submission has not been manually opened. A current URL or embed does not certify its academic content or accessibility to every browser. These checks cover the listed workflows and failures, not a guarantee that every possible site interaction is bug-free.

Deploy the frontend and `/api/canva-link` together before inviting real judges. Keep real judging and feedback release off until the committee is ready. Confirm inbox delivery using a committee-owned test address before bulk invitations; no such email was sent in this pass.

## Reference checks

- [Canva embedding guidance](https://www.canva.com/help/embed-designs/): Share, See all, Embed; embedding depends on Canva's sharing settings.
- [Canva short-link guidance](https://www.canva.com/help/create-and-manage-short-links/): short links retain the original sharing permissions.
- [Google Drive sharing](https://support.google.com/drive/answer/7166529): use Anyone with the link and Viewer for submitted files.
- [Vercel Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js): the Canva resolver deploys as an API function alongside the frontend.
