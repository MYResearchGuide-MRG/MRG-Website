import * as React from "react"
import { Menu, Moon, Sun, X } from "lucide-react"

import { homeRouteHash, resultsRouteHash, useAnnounced, useRoute } from "@/lib/results"
import { useTheme } from "@/components/theme-provider"
import { navItems, siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const [scrolled, setScrolled] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const route = useRoute()
  const announced = useAnnounced()
  const shellRef = React.useRef<HTMLDivElement>(null)
  const toggleRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLElement>(null)

  const items = navItems.filter((item) => announced || item.href !== resultsRouteHash)
  const isActive = (href: string) => href === `#/${route}`
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
          "pointer-events-auto relative w-full rounded-xl border bg-background text-foreground transition-[max-width,margin-top,border-color,box-shadow] duration-500 ease-out motion-reduce:transition-none",
          floating
            ? "mt-3 max-w-[75rem] border-border shadow-[0_12px_36px_rgb(0_0_0/0.24)]"
            : "mt-0 max-w-[90rem] border-transparent"
        )}
      >
        <div className="flex h-[62px] items-center justify-between gap-3 px-3 sm:h-[70px] sm:gap-6 sm:px-6">
          <a
            href={homeRouteHash}
            onClick={closeMenu}
            aria-label="MYSSP home"
            className="flex shrink-0 items-center"
          >
            <img
              src={siteConfig.headerLogoLightUrl}
              alt="Malaysia Science Scholar's Programme"
              width={1200}
              height={299}
              className="h-9 w-auto sm:h-10 dark:hidden"
            />
            <img
              src={siteConfig.headerLogoUrl}
              alt="Malaysia Science Scholar's Programme"
              width={1200}
              height={298}
              className="hidden h-9 w-auto sm:h-10 dark:block"
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
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="relative flex size-10 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Toggle theme"
            >
              <Sun className="size-4 scale-100 rotate-0 transition-transform duration-500 dark:scale-0 dark:-rotate-90" />
              <Moon className="absolute size-4 scale-0 rotate-90 transition-transform duration-500 dark:scale-100 dark:rotate-0" />
            </button>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex size-11 items-center justify-center rounded-[7px] hover:bg-foreground/[0.06] lg:hidden"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation-menu"
            >
              {menuOpen ? <X className="size-[22px]" aria-hidden /> : <Menu className="size-[22px]" aria-hidden />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            ref={panelRef}
            id="mobile-navigation-menu"
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-[calc(100%+8px)] max-h-[calc(100dvh-114px)] animate-in overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-3 shadow-[0_16px_40px_rgb(0_0_0/0.35)] duration-200 fade-in slide-in-from-top-1.5 lg:hidden"
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
