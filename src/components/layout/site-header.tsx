import * as React from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react"
import { Menu, Moon, Sun, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { navItems, siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const { theme, setTheme } = useTheme()
  const [scrolled, setScrolled] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
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

  const logoSrc =
    theme === "dark" ? siteConfig.darkLogoUrl : siteConfig.lightLogoUrl

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 md:h-20">
        <a
          href={siteConfig.mainSiteUrl}
          className="flex shrink-0 items-center"
          aria-label="MYResearchGuide home"
        >
          <img src={logoSrc} alt="MYResearchGuide" className="h-6 md:h-7" />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="link-wipe text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle theme"
          >
            <Sun className="size-4 scale-100 rotate-0 transition-transform duration-500 dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute size-4 scale-0 rotate-90 transition-transform duration-500 dark:scale-100 dark:rotate-0" />
          </button>

          <Button asChild size="sm" className="hidden rounded-full sm:inline-flex">
            <a href={siteConfig.applicationFormUrl}>Apply</a>
          </Button>

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

      {/* Mobile panel */}
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
              <img src={logoSrc} alt="MYResearchGuide" className="h-6" />
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
              {navItems.map((item, i) => (
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
              ))}
            </nav>

            <div className="container mt-8">
              <Button asChild size="lg" className="w-full">
                <a href={siteConfig.applicationFormUrl}>Apply now</a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
