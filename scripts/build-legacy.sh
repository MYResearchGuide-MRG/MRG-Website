#!/usr/bin/env bash
#
# Builds the pre-redesign site from git and drops it into public/old/, so the
# running app can serve it at /old/ for side-by-side comparison.
#
# It builds the real commit in a throwaway worktree rather than trying to keep
# the old components alive inside the current source tree. The old design
# depended on global stylesheets (.project-card, .hero-section, animations.css)
# and on the broken colour tokens; re-hosting that inside the new app would
# both leak styles and change how the old design actually looked.
#
# Usage:  bun run build:legacy [commit-ish]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${1:-${LEGACY_REF:-6f58252}}"
WORKTREE="$ROOT/.legacy-src"
OUT="$ROOT/public/old"

cd "$ROOT"

if ! git rev-parse --verify "$REF^{commit}" >/dev/null 2>&1; then
  echo "error: '$REF' is not a commit in this repository" >&2
  exit 1
fi

echo "→ building legacy design from $(git rev-parse --short "$REF") ($(git log -1 --format=%s "$REF"))"

cleanup() {
  git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
git worktree add --detach --quiet "$WORKTREE" "$REF"

# Reuse the installed dependencies; the old tree needs a subset of them.
ln -snf "$ROOT/node_modules" "$WORKTREE/node_modules"

rm -rf "$OUT"
(
  cd "$WORKTREE"
  npx vite build \
    --base=/old/ \
    --outDir "$OUT" \
    --emptyOutDir \
    --logLevel warn
)

# Drop a small banner into the legacy page linking back to the current design,
# so the two are navigable from either side.
node - "$OUT/index.html" <<'NODE'
const fs = require("fs")
const file = process.argv[2]
let html = fs.readFileSync(file, "utf8")

const banner = `
<style>
  #legacy-banner{position:fixed;right:1.25rem;bottom:1.25rem;z-index:2147483647;
    display:flex;align-items:center;gap:.75rem;padding:.5rem .5rem .5rem 1rem;
    background:#111;color:#fff;border-radius:999px;font:500 12px/1 ui-sans-serif,system-ui,sans-serif;
    letter-spacing:.06em;text-transform:uppercase;box-shadow:0 12px 32px -12px rgb(0 0 0/.5)}
  #legacy-banner a{background:#fff;color:#111;text-decoration:none;padding:.55rem .9rem;border-radius:999px}
  #legacy-banner a:hover{opacity:.85}
</style>
<div id="legacy-banner">Previous design <a href="/">View current</a></div>
`

html = html.replace("</body>", banner + "</body>")
fs.writeFileSync(file, html)
NODE

echo "✓ legacy build ready at public/old/ — serve the app and open /old/"
