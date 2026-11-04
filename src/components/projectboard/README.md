# MYSSP Projectboard prototype

Open `/#/projectboard` while running the MYSSP app. This is a local UI prototype,
not a live submission or authentication service. Nothing has been deployed.

## Preview flows

- Browse the project library; filter by year, research field or award, search,
  or sort by title. Award filters distinguish main and special awards. All award
  arrays are empty until confirmed results are supplied; no winners are simulated.
- Open a board to view the overview, project materials and team.
- Choose **Participant sign in**, enter an example email and open the demo
  workspace. **Preview an invitation** shows the private-invite entry point.
- The demo participant owns A-1 only. Edit a draft, save it, then preview it.
  Public sample boards remain unchanged. No email is sent, account created,
  or submission published.
- Overview fields support **Text** or **Markdown**. Text mode preserves line
  breaks and offers a maths-symbol picker. Markdown mode has formatting tools,
  inline LaTeX (`$x^2$`), display equations (`$$...$$`) and a rendered preview.
  The format applies to summary, research question, method and findings. Switching
  modes preserves the source text; it does not convert it. Older drafts default
  to Text. Raw HTML and embedded images are disabled; links use safe protocols.
- Drafts are versioned in localStorage under
  `myssp-projectboard-preview:draft:v1`. Private data must not be entered here.
  Remove that key to reset the demo. The email/name inputs are not stored.

## Integration boundary

`Projectboard.tsx` exports a self-contained component with scoped `pb-` styles.
The module bar and preview strips are temporary component-preview controls,
not replacements for the committee's header/footer. The host can wrap this
component in its own site layout and move the sign-in action into its header.

Only `App.tsx` (lazy entry) and `lib/results.ts` (hash route) are modified outside
this directory. Existing header/footer, project list and results remain intact.
The component's internal routes use `#/projectboard`, `/project/<id>`, and
`/workspace`. New artwork is an illustrative SVG cover, not a student's poster.
Project descriptions, team names and mentors come from existing public site
data; findings and submission files are not invented.

## Theme and motion

The component uses Inter and a fixed dark palette matching the main
MYResearchGuide site: `#121212` for the page and `#000` for content boxes.
The library, editor and sign-in dialog stay dark regardless of the host preference.
Markdown and KaTeX load only when Markdown content is previewed or rendered.

Filter groups start collapsed and expand smoothly; cards enter and rearrange when filtering or
sorting. Project tabs and editor sections have short content transitions.
Reduced-motion preferences disable movement and transition delays. All changes
remain inside the component directory for later header/footer integration.

## Production phase

Replace the local demo state/storage with an authenticated API. Invitations must
be single-use, expiring tokens issued by the committee and sent to assigned
participants. No open registration. Enforce project membership and roles on the
server for every read/write; hiding buttons is not access control. Drafts and
judge feedback must stay private; publish a separate approved snapshot. Validate
and securely store uploads, with signed access to private files. Define judge
permissions and the review/publishing workflow with the committee before adding
those views. Demo access and sample boards must be removed before public release.
