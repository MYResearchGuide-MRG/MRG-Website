import { useEffect, useId, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowUpRight, ChevronDown } from "lucide-react"
import { demoDayItems } from "@/lib/site"
import type { Route } from "@/lib/results"
import { useDemoDayYear } from "@/lib/demo-day"
import styles from "./demo-day-menu.module.css"

export function DemoDayMenu({
  active,
  route,
  mobile = false,
  onNavigate,
}: {
  active: boolean
  route: Route
  mobile?: boolean
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const reduced = useReducedMotion()
  const year = useDemoDayYear()

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const navigate = () => setOpen(false)
    document.addEventListener("pointerdown", outside)
    window.addEventListener("hashchange", navigate)
    return () => {
      document.removeEventListener("pointerdown", outside)
      window.removeEventListener("hashchange", navigate)
    }
  }, [open])

  return (
    <div
      ref={root}
      className={mobile ? styles.mobile : styles.desktop}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation()
          setOpen(false)
          trigger.current?.focus()
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        data-active={active || undefined}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Demo Day <ChevronDown size={14} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            className={styles.panel}
            initial={{ opacity: 0, y: reduced || mobile ? 0 : -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced || mobile ? 0 : -3 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
          >
            {demoDayItems.map((item) => (
              <a
                key={item.href}
                href={`${item.href}/${year}`}
                aria-current={item.href === `#/${route}` ? "page" : undefined}
                onClick={() => {
                  setOpen(false)
                  onNavigate?.()
                }}
              >
                {item.label} <ArrowUpRight size={14} aria-hidden />
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
