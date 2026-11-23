// Mutations bypass this policy. Public pages need far fewer background reads
// than signed-in workspaces; navigation and returning to a tab refresh sooner.
export function backendRefreshDue(lastRead: number, now: number, signedIn: boolean, foreground = false) {
  const interval = foreground ? 15_000 : signedIn ? 60_000 : 300_000
  return now - lastRead >= interval
}
