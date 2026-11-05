import * as React from "react"
import { ArrowUpRight, Menu, X } from "lucide-react"

import { homeRouteHash, projectsRouteHash, useRoute } from "@/lib/results"
import { MysspLogo } from "@/components/layout/myssp-logo"
import { navItems } from "@/lib/site"
import { cn } from "@/lib/utils"
import action from "@/components/ui/nav-action.module.css"
import styles from "./site-header.module.css"

export function SiteHeader({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  const [scrolled, setScrolled] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const route = useRoute()
  const shellRef = React.useRef<HTMLDivElement>(null)
  const toggleRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLElement>(null)

  const items = navItems
  const isActive = (href: string) =>
    route === "projects" ? href === projectsRouteHash : href === `#/${route}`
  const closeMenu = () => setMenuOpen(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  React.useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    panelRef.current?.querySelector("a")?.focus({ preventScroll: true })

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
        toggleRef.current?.focus()
      }
      if (event.key !== "Tab" || !shellRef.current) return
      // Keep keyboard focus in the header while background scrolling is locked.
      const focusable = Array.from(
        shellRef.current.querySelectorAll<HTMLElement>("a[href], button")
      ).filter((element) => element.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    const desktop = window.matchMedia("(min-width: 1024px)")
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false)
    }
    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", onKey)
    desktop.addEventListener("change", closeOnDesktop)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", onKey)
      desktop.removeEventListener("change", closeOnDesktop)
    }
  }, [menuOpen])

  const floating = scrolled || menuOpen

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 sm:px-6">
      <div
        ref={shellRef}
        className={cn(
          // Opaque at all times: only width, offset and border animate, so
          // nothing on the fixed header changes compositing path mid-scroll.
          styles.shell,
          "pointer-events-auto relative w-full rounded-xl border bg-[#121212] text-foreground",
          scrolled ? "border-white/[0.12]" : "border-transparent",
          floating
            ? "mt-3 max-w-[75rem] shadow-[0_12px_36px_rgb(0_0_0/0.24)]"
            : "mt-0 max-w-[90rem]"
        )}
      >
        <div className="flex h-[62px] items-center justify-between gap-3 px-3 sm:h-[70px] sm:gap-6 sm:px-6">
          <a
            href={homeRouteHash}
            onClick={closeMenu}
            aria-label="MYSSP home"
            className="flex shrink-0 items-center"
          >
            <span className="max-[380px]:hidden">
              <MysspLogo className="h-9 w-auto sm:h-10" />
            </span>
            <img
              src="/myssp-icon.png"
              alt="MYSSP"
              className="hidden size-9 object-contain max-[380px]:block"
            />
          </a>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className="text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            {signedIn ? (
              <a href="#/projectboard/workspace" className={action.button} onClick={closeMenu}>
                My project <ArrowUpRight size={15} aria-hidden />
              </a>
            ) : (
              <button
                type="button"
                className={action.button}
                onClick={() => {
                  closeMenu()
                  onSignIn()
                }}
                aria-haspopup="dialog"
              >
                Sign in <ArrowUpRight size={15} aria-hidden />
              </button>
            )}

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex size-11 items-center justify-center rounded-[7px] hover:bg-foreground/[0.06] lg:hidden"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation-menu"
            >
              {menuOpen ? (
                <X className="size-[22px]" aria-hidden />
              ) : (
                <Menu className="size-[22px]" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            ref={panelRef}
            id="mobile-navigation-menu"
            aria-label="Mobile navigation"
            className="animate-in fade-in slide-in-from-top-1.5 absolute inset-x-0 top-[calc(100%+8px)] max-h-[calc(100dvh-114px)] overflow-y-auto overscroll-contain rounded-xl border border-white/[0.12] bg-[#121212] p-3 shadow-[0_16px_40px_rgb(0_0_0/0.35)] duration-200 lg:hidden"
          >
            <div className="grid">
              {items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="rounded-md px-4 py-3.5 text-[15px] text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground aria-[current=page]:bg-foreground/[0.06] aria-[current=page]:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
