# Supabase usage optimisation, 23 November 2026

The live organization dashboard showed 8.316 GB of 5 GB uncached egress for the
4 November to 4 December billing cycle. Database usage was about 38 MB of 500 MB
(the database detail card showed 36.38 MiB), and Storage buckets used 0 GB of 1 GB.
The warning concerns data transfer, not lack of space for submissions.

## Changes

- `202611230003_compact_dashboard_reads.sql` adds a compact, RLS-protected snapshot
  for new clients. Project lists omit student portraits already available in a
  saved submission. Opening a project still fetches its full submission and photos.
  Projects without submissions retain their fallback portraits. The signed-in
  participant's own profile photo and committee profile stay available.
- Participant management no longer downloads a second copy of everyone else's
  portraits. Names, schools, account details and assignments are retained.
- Saving text with unchanged team profiles no longer rewrites profile copies.
  No-op updates keep their cache versions. Actual changes still invalidate caches.
- Shared backend background refreshes run once per minute when signed in, and once
  per five minutes for public visitors, instead of every 30 seconds. Hidden tabs
  do not poll. Navigation and returning to a tab refresh after 15 seconds of staleness;
  sign-in, sign-out and mutations still refresh immediately. Separate judging timers
  retain their existing behaviour.
- New JPEG cover uploads are bounded to 240,000 characters including base64 overhead
  (previously 400,000); portraits are bounded to 60,000 (previously 90,000). Detailed
  images are resized progressively while keeping their proportions. Existing images
  and submission content are not recompressed or deleted.

## Verification

Applied the migration to live MYSSP. A SQL-editor benchmark of the full project
snapshot, with no auth identity and no warm cache, returned 1,521,813 bytes through
the old API and 69,785 bytes through the new API: **95.41% smaller**. This measures
uncompressed JSON for that response, not a 95% reduction in total monthly egress.
Stored submission JSON remained exactly 4,111,856 bytes across 13 submissions.

The full automated suite passed 149 tests, including RLS, own-profile preservation,
photo loading, stale-write protection, cache invalidation and byte budgets. Build
and lint checks passed. The local production build loaded the live public archive
without publishing any private projects.

The free plan remains unchanged. Already-served egress cannot be removed from the
current cycle; these changes lower future usage. The dashboard showed a grace
period ending 21 December. Remaining on the free plan depends on future traffic.
Reference: https://supabase.com/docs/guides/platform/manage-your-usage/egress
