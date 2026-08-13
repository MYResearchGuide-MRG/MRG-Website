/**
 * Floating link to the pre-redesign build served at /old/.
 *
 * Dev-only: this is review chrome, not part of the site, so it never ships in
 * a production bundle. The footer keeps a plain text link for built previews.
 * Generate the target with `bun run build:legacy`.
 */
export function DesignSwitch() {
  if (!import.meta.env.DEV) return null

  return (
    <div className="fixed right-5 bottom-5 z-50">
      <div className="label-micro flex items-center gap-3 rounded-full bg-foreground py-2 pr-2 pl-4 text-background shadow-[0_12px_32px_-12px_rgb(0_0_0/0.5)]">
        <span>Current design</span>
        <a
          href="/old/"
          className="rounded-full bg-background px-3.5 py-2 text-foreground transition-opacity hover:opacity-85"
        >
          View previous
        </a>
      </div>
    </div>
  )
}
