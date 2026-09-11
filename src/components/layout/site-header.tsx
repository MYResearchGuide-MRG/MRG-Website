import * as React from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react"
import { ArrowLeft, Menu, Moon, Sun, X } from "lucide-react"

import { CountdownPill } from "@/components/results-countdown"
import { Button } from "@/components/ui/button"
import { homeRouteHash, useRoute } from "@/lib/results"
import { useTheme } from "@/components/theme-provider"
import { navItems, siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const [scrolled, setScrolled] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const route = useRoute()
  const onResults = route === "results"
  const reduced = useReducedMotion()

  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 40,
    restDelta: 0.001,
  })

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Lock body scroll while the mobile panel is open.
  React.useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  // Close the panel on Escape.
  React.useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [menuOpen])

  return (
    <>
      <header
        className={cn(
          // backdrop-blur-xl stays permanently applied (never toggled) —
          // Safari rebuilds the compositing layer every time backdrop-filter
          // is added or removed from an element's class list, and doing that
          // on a fixed header during scroll is what caused page content
          // beneath it to lose its background paint mid-scroll on iOS. Only
          // the tint's own opacity animates now, a cheap, stable transition.
          "fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color] duration-500",
          scrolled
            ? "border-border bg-background/80"
            : "border-transparent bg-transparent"
        )}
      >
        <div className="container flex h-16 items-center gap-4 md:h-20">
          <div className="flex flex-1 shrink-0 items-center gap-3">
            <a
              href={onResults ? homeRouteHash : "#"}
              aria-label={onResults ? "Back to main page" : "Back to top"}
              className="flex items-center"
            >
              <img
                src={siteConfig.programmeLogoUrl}
                alt="Malaysia Science Scholar's Programme"
                className="h-8 invert md:h-9 dark:invert-0"
              />
            </a>
            <span
              aria-hidden
              className="hidden h-7 w-px bg-muted-foreground/50 sm:block"
            />
            <a
              href={siteConfig.mainSiteUrl}
              aria-label="MYResearchGuide home"
              className="hidden items-end gap-1.5 sm:flex"
            >
              <span className="label-micro normal-case text-muted-foreground">
                BY
              </span>
              <img
                src={siteConfig.organiserLogoUrl}
                alt="MYResearchGuide"
                className="h-4 invert md:h-[1.1rem] dark:invert-0"
              />
            </a>
          </div>

          <nav className="hidden shrink-0 items-center gap-8 md:flex">
            {onResults ? (
              <a
                href={homeRouteHash}
                className="link-wipe text-sm text-muted-foreground hover:text-foreground"
              >
                Back to main page
              </a>
            ) : (
              navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="link-wipe text-sm text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </a>
              ))
            )}
          </nav>

          <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Toggle theme"
            >
              <Sun className="size-4 scale-100 rotate-0 transition-transform duration-500 dark:scale-0 dark:-rotate-90" />
              <Moon className="absolute size-4 scale-0 rotate-90 transition-transform duration-500 dark:scale-100 dark:rotate-0" />
            </button>

            {onResults ? (
              <Button asChild size="sm" className="hidden rounded-full sm:inline-flex">
                <a href={homeRouteHash}>
                  <ArrowLeft aria-hidden />
                  Main page
                </a>
              </Button>
            ) : (
              <CountdownPill className="hidden sm:inline-flex" />
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex size-9 items-center justify-center rounded-full text-foreground md:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        {/* Scroll progress hairline */}
        <motion.div
          aria-hidden
          className="h-px origin-left bg-foreground"
          style={{ scaleX: progress, opacity: scrolled ? 1 : 0 }}
        />
      </header>

      {/* Mobile panel. Rendered as a sibling of <header>, not a descendant —
          the header carries a permanent backdrop-filter, and per spec any
          element with backdrop-filter becomes a new containing block for its
          position:fixed descendants. Nested here, this panel's `inset-0`
          would resolve against the header's own (tiny) box instead of the
          viewport, clipping it to a thin strip instead of covering the
          screen. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-background md:hidden"
            initial={reduced ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="container flex h-16 items-center justify-between">
              <img
                src={siteConfig.programmeLogoUrl}
                alt="Malaysia Science Scholar's Programme"
                className="h-8 invert dark:invert-0"
              />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex size-9 items-center justify-center rounded-full text-foreground"
                aria-label="Close menu"
                autoFocus
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="container mt-6 flex flex-col">
              {onResults ? (
                <motion.a
                  href={homeRouteHash}
                  onClick={() => setMenuOpen(false)}
                  className="font-display border-b border-border py-5 text-3xl"
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduced ? { duration: 0 } : { delay: 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  Main page
                </motion.a>
              ) : (
                navItems.map((item, i) => (
                  <motion.a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="font-display border-b border-border py-5 text-3xl"
                    initial={reduced ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : {
                            delay: 0.06 + i * 0.045,
                            duration: 0.45,
                            ease: [0.16, 1, 0.3, 1],
                          }
                    }
                  >
                    {item.label}
                  </motion.a>
                ))
              )}
            </nav>

            <div className="container mt-8" onClick={() => setMenuOpen(false)}>
              {onResults ? (
                <Button asChild size="lg" className="w-full">
                  <a href={homeRouteHash}>
                    <ArrowLeft aria-hidden />
                    Main page
                  </a>
                </Button>
              ) : (
                <CountdownPill className="w-full" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
