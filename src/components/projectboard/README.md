# MYSSP Research Library prototype

Open `/#/projectboard` while running the MYSSP app. This is a local UI prototype,
not a live submission or authentication service. Nothing has been deployed.

## Preview flows

- Browse the research library; filter by year, research field or award, search,
  or sort by title. Numbered pages show at most 12 projects. Changing a search,
  filter or sort starts from page 1. Award filters distinguish main and special awards. All award
  arrays are empty until confirmed results are supplied; no winners are simulated.
- Open a board to view the overview, project materials and team.
- Choose **Sign in** in the shared header, enter an example email and open the demo
  project page. **Preview an invitation** shows the private-invite entry point.
- The demo participant owns A-1 only. Choose **Edit project** to edit the title,
  project image, overview and materials directly on the page. The **Team** tab also
  edits each student's display name, school/institution, short bio and portrait.
  Save or cancel there. The title and image sit side by side, with a placeholder
  when no image exists. The circular member photos open the Team tab.
  PNG/JPG/WebP images up to 5 MB are resized and re-encoded as JPEG locally.
  Portraits are centre-cropped to a square, resized to at most 512 px and displayed
  as circles. Initials appear until a photo is added. The saved image, title and
  member names also appear in this participant's library preview. Older drafts
  without member profiles use the existing team list.
  Another project's URL never grants editing controls in the demo.
  Public sample boards remain unchanged. No email is sent, account created,
  or submission published.
- Overview fields use **Markdown only**, with formatting tools, a maths-symbol
  picker, inline LaTeX (`$x^2$`), display equations (`$$...$$`) and a rendered preview.
  Limits include Markdown syntax: Abstract 1,500 characters, Research question
  300, Research approach 2,000 and Findings 2,000. Counters show current usage;
  typing, toolbar insertion and saving enforce limits. Existing draft source is
  preserved, including over-limit text, and must be shortened before saving.
  Raw HTML and embedded images are disabled; links use safe protocols.
  Project codes always come from committee data and are never editable draft fields.
- The project sidebar contains a real QR code and copy-link button for the public
  project route. The current host is used, so localhost QR codes only work on the
  machine serving the preview. No invitation or draft tokens are shared.
- Drafts are versioned in localStorage under
  `myssp-projectboard-preview:draft:v1`. Private data must not be entered here.
  Remove that key to reset the demo. Sign-in email/name inputs are not stored;
  edited team display names and photos are stored with the local project draft.

## Externally hosted project materials

The Materials tab displays video, slides, then the PDF write-up. The editor stores
links only; these files are served by their providers rather than uploaded to Vercel.

- **Video:** a YouTube watch/share link. Use Public or Unlisted and allow embedding.
  Videos do not autoplay and use the YouTube privacy-enhanced player.
- **Slides:** the full Canva public view link (`canva.com/design/.../view`).
  Edit links and `canva.link` shortcuts are rejected. Enable embedding in Canva
  if required. The original share path is retained and tracking parameters removed.
- **Write-up:** a PDF uploaded to Google Drive. Use the file's sharing link with
  General access set to Anyone with the link, Viewer. Folders and Google Docs
  editing links are not accepted. Drive resource keys are preserved.
- **Additional materials:** up to ten editable named web links, with service icons
  for GitHub, Google Drive, YouTube and Canva, or a generic website icon.

Iframes are lazy-loaded only on the Materials viewing tab. Each has an external
Open link as a fallback. Embedding URLs are constructed from an exact provider
allowlist; submitted HTML is never rendered. URL validation cannot confirm sharing
permissions, a file's MIME type or whether its owner permits embedding. Check those
before publication. Older drafts without additional links remain compatible.

Editing shows the final submission rules beside each component: a 2–3 minute,
1080p minimum video with clear audio, no software logos, restrained effects and
equal on-camera/voice participation; at most 12 slide pages (10 content plus title
and thank-you); and the final compiled PDF via Google Drive. A shared note
covers one submission per team, official templates, final checks and possible
publication. Link validation does not verify duration, resolution, slide count,
file contents or permissions. Drafts may remain incomplete; the prototype still
saves locally and does not implement final submission or enforcement on a server.

Project images use a consistent 16:9 frame in the library and project detail.
The upload field recommends 1600 × 900 px, JPG/PNG/WebP, up to 5 MB. Other ratios
are cropped to fill the frame, rather than letterboxed. Portraits remain circular.

Provider documentation: [Canva embedding](https://www.canva.com/help/embed-designs/),
[YouTube players](https://developers.google.com/youtube/player_parameters),
[Drive sharing](https://support.google.com/drive/answer/7166529).

## Integration boundary

`Projectboard.tsx` exports the page content with scoped `pb-` styles. `App.tsx`
wraps it in the committee's shared header and footer. The Research Library links
in both now open Projectboard. The original home-page project section is retained.
Awards, Resources and the results routes are preserved from the committee merge.

Demo sign-in state lives in `App.tsx`, so navigating away and returning via
**My project** keeps the current demo session. `AccessDialog.tsx` is loaded on
demand from the shared header. Sign out is on the owned project; saved local drafts
remain available. The header CTA reuses the main site's shared button motion CSS.
The component's internal routes use `#/projectboard`, `/project/<id>`, and
`/workspace` (a compatibility redirect to the participant's project).
Generated cover artwork has been removed. Cards show their project code until an image is added.
Project descriptions, team names and mentors come from existing public site
data; findings and submission files are not invented.

## Theme and motion

The component uses Inter and a fixed dark palette matching the main
MYResearchGuide site: `#121212` for the page and `#000` for content boxes.
The whole MYSSP site is dark-only. Stored light/system preferences and the old
keyboard theme shortcut no longer affect it. The shared header has no theme toggle.
Markdown and KaTeX load only when Markdown content is previewed or rendered.

Filter groups start collapsed and expand smoothly; cards enter and rearrange when filtering or
sorting. Project tabs and editor sections have short content transitions.
Reduced-motion preferences disable movement and transition delays.

## Hosted access

The committee imports email and project assignments into Supabase. It sends each
participant a six-character access code that stays valid until the committee
reissues it. Supabase Auth stores a password hash, and database RLS ties each
authenticated user to their assigned project. Participants cannot assign
themselves to a team.

Use server/database policies for both project writes and image storage. A write
requires membership in the project's team, or a committee admin role. Keep team,
mentor, award and project-code assignment fields committee-only. Editable display
profiles have stable IDs separate from user
IDs and team memberships; changing a name or portrait cannot grant project access.
Everyone can read published snapshots; only members/admins can read drafts. Judges receive separate
assigned-project access. Save a revision number and reject stale concurrent edits
instead of silently overwriting a teammate's changes. Validate upload MIME types,
size and file signatures on the server; use team/project-scoped storage paths.

Supabase Auth and Postgres RLS are used for project access:
https://supabase.com/docs/guides/database/postgres/row-level-security
The frontend demo checks are not a substitute for these backend policies. No
open registration is allowed. Reissuing a code replaces the old one; revoking
an assignment blocks project access even if a prior session remains active.
Judges need a separate assigned-project role if that workflow is added later.
