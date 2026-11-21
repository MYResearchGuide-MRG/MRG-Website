/** Protect a dirty form from links, hash-history navigation and page reloads. */
export function protectUnsavedNavigation(message: string, busy: boolean) {
  let currentUrl = window.location.href
  let allowedUrl: string | null = null
  const canLeave = () => !busy && window.confirm(message)
  const warn = (event: BeforeUnloadEvent) => {
    if (allowedUrl) return
    event.preventDefault()
    event.returnValue = ""
  }
  const click = (event: MouseEvent) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
    if (!(anchor instanceof HTMLAnchorElement) || event.defaultPrevented ||
      anchor.target === "_blank" || anchor.hasAttribute("download") ||
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
      event.button !== 0 || anchor.href === window.location.href) return
    if (canLeave()) allowedUrl = anchor.href
    else { event.preventDefault(); event.stopPropagation() }
  }
  const navigate = (event: HashChangeEvent) => {
    const next = window.location.href
    if (next === currentUrl) return
    if (allowedUrl === next || canLeave()) {
      currentUrl = next
      allowedUrl = null
      return
    }
    // Run before the router's hash listener so rejected Back/Forward actions
    // cannot unmount the form. Keep its URL and unsaved text together.
    window.history.replaceState(window.history.state, "", currentUrl)
    event.stopImmediatePropagation()
  }
  window.addEventListener("beforeunload", warn)
  window.addEventListener("hashchange", navigate, true)
  document.addEventListener("click", click, true)
  return () => {
    window.removeEventListener("beforeunload", warn)
    window.removeEventListener("hashchange", navigate, true)
    document.removeEventListener("click", click, true)
  }
}
