import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { useReducedMotion } from "motion/react"

import type { Project } from "@/data/competition-data"
import styles from "./project-wheel.module.css"

/**
 * The home page's projects as cards around the rim of a large, slowly turning
 * wheel: each card rides the arc and tilts with it, so the middle one sits
 * level and the rest lean away as they rise in and sink out at the edges.
 *
 * The wheel drifts on its own and stops while hovered. It can be dragged, the
 * arrows step it one card at a time, and a card that takes keyboard focus is
 * turned to the middle. Under reduced motion it never drifts, and steps
 * without easing.
 *
 * Positions are written straight to each card's transform every frame rather
 * than through React state, so a turn costs no renders.
 */

// Radians a second while drifting. About one card every eleven seconds.
const DRIFT = 0.026
// Gap between neighbouring cards along the rim, in px.
const GAP = 24

function geometry(width: number) {
  const card = width < 640 ? 248 : 288
  const radius = width < 640 ? 900 : 1500
  return { card, radius, step: (card + GAP) / radius }
}

/**
 * Orders the projects so neighbours on the wheel come from different fields
 * wherever the numbers allow: each next card is taken from the field with the
 * most left that differs from the card before it, the way you would deal a
 * hand so no two of a suit touch.
 */
function interleave(items: Project[]) {
  const piles = new Map<string, Project[]>()
  for (const item of items) {
    piles.set(item.track, [...(piles.get(item.track) ?? []), item])
  }
  const dealt: Project[] = []
  while (dealt.length < items.length) {
    const previous = dealt.at(-1)?.track
    const pile = [...piles.values()]
      .filter((p) => p.length > 0)
      .sort((a, b) => b.length - a.length)
      .find((p, _, all) => p[0].track !== previous || all.length === 1)!
    dealt.push(pile.shift()!)
  }
  return dealt
}

/** Wraps an angle into [-total/2, total/2), so every card has one place. */
function wrap(angle: number, total: number) {
  return ((((angle + total / 2) % total) + total) % total) - total / 2
}

export function ProjectWheel({
  items: projects,
  codes,
  iconFor,
  onOpen,
}: {
  items: Project[]
  codes: Map<string, string>
  iconFor: (track: string) => LucideIcon
  onOpen: (project: Project, card: HTMLButtonElement) => void
}) {
  const items = React.useMemo(() => interleave(projects), [projects])
  const stageRef = React.useRef<HTMLDivElement>(null)
  const cardRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const reduced = useReducedMotion()
  // Shared with the handlers below: the wheel's angle, where it is easing to,
  // and whether anything is holding it still.
  const state = React.useRef({
    offset: 0,
    target: 0,
    held: 0,
    dragged: false,
  })
  const stepBy = React.useRef<(cards: number) => void>(() => {})
  const centre = React.useRef<(index: number) => void>(() => {})

  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const s = state.current
    const count = items.length
    let frame = 0
    let last = 0
    let visible = false

    const angleOf = (index: number) => {
      const { step } = geometry(stage.clientWidth)
      return wrap(index * step + s.offset, step * count)
    }

    const paint = () => {
      const width = stage.clientWidth
      const { card, radius } = geometry(width)
      cardRefs.current.forEach((el, index) => {
        if (!el) return
        const angle = angleOf(index)
        const x = radius * Math.sin(angle)
        const y = radius * (1 - Math.cos(angle))
        // Cards far round the back are hidden, so the wrap from one end of
        // the wheel to the other never shows.
        const away = Math.abs(x) > width / 2 + card
        el.style.visibility = away ? "hidden" : ""
        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad)`
        el.style.zIndex = String(100 - Math.round(Math.abs(angle) * 40))
      })
    }

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (!s.held && !reduced) s.target -= DRIFT * dt
      const ease = reduced ? 1 : Math.min(1, dt * 6)
      s.offset += (s.target - s.offset) * ease
      paint()
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      frame = 0
      if (visible && !document.hidden) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }

    stepBy.current = (cards) => {
      const { step } = geometry(stage.clientWidth)
      s.target += cards * step
      if (!frame) {
        s.offset = s.target
        paint()
      }
    }
    centre.current = (index) => {
      s.target = s.offset - angleOf(index)
      if (!frame) {
        s.offset = s.target
        paint()
      }
    }

    // Dragging: listen on the window rather than capturing the pointer, so a
    // press that never moves still lands on the card as a click.
    let drag: { x: number; start: number } | null = null
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      drag = { x: event.clientX, start: s.target }
      s.dragged = false
      s.held++
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
      window.addEventListener("pointercancel", up)
    }
    const move = (event: PointerEvent) => {
      if (!drag) return
      const dx = event.clientX - drag.x
      if (Math.abs(dx) > 6) s.dragged = true
      const { radius } = geometry(stage.clientWidth)
      s.target = drag.start + dx / radius
      if (!frame) {
        s.offset = s.target
        paint()
      }
    }
    const up = () => {
      if (!drag) return
      drag = null
      s.held--
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    const sizing = new ResizeObserver(paint)
    stage.addEventListener("pointerdown", down)
    observer.observe(stage)
    sizing.observe(stage)
    document.addEventListener("visibilitychange", sync)
    paint()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      sizing.disconnect()
      stage.removeEventListener("pointerdown", down)
      document.removeEventListener("visibilitychange", sync)
      up()
    }
  }, [items.length, reduced])

  // Hover and focus each hold the wheel still while they last.
  const hold = (on: boolean) => {
    state.current.held = Math.max(0, state.current.held + (on ? 1 : -1))
  }

  return (
    <div className={styles.wheel}>
      <div
        ref={stageRef}
        className={styles.stage}
        onPointerEnter={(event) => event.pointerType === "mouse" && hold(true)}
        onPointerLeave={(event) => event.pointerType === "mouse" && hold(false)}
      >
        {items.map((project, index) => {
          const Icon = iconFor(project.track)
          return (
            <button
              key={project.id}
              ref={(el) => {
                cardRefs.current[index] = el
              }}
              type="button"
              className={styles.card}
              aria-haspopup="dialog"
              aria-label={`Read ${codes.get(project.id)}: ${project.title}`}
              onFocus={(event) => {
                hold(true)
                // Only for keyboard focus: a mouse press also focuses the
                // card, and turning it then would slide it out from under
                // the pointer before the click lands.
                if (event.currentTarget.matches(":focus-visible")) {
                  centre.current(index)
                }
              }}
              onBlur={() => hold(false)}
              onClick={(event) => {
                // The end of a drag is not a click.
                if (state.current.dragged) {
                  state.current.dragged = false
                  return
                }
                onOpen(project, event.currentTarget)
              }}
            >
              <span className={styles.visual}>
                <FieldGlyph Icon={Icon} seed={index} />
              </span>
              <span className={styles.body}>
                <span className={styles.meta}>
                  <span className={styles.code}>{codes.get(project.id)}</span>
                  <span className={styles.track}>{project.track}</span>
                </span>
                <span className={styles.title}>{project.title}</span>
                <span className={styles.description}>
                  {project.description}
                </span>
                <span className={styles.mentor}>
                  <img
                    src={project.photo}
                    alt=""
                    width={28}
                    height={28}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                  <span>
                    <span className={styles.name}>{project.mentor}</span>
                    <span className={styles.affiliation}>
                      {project.affiliation}
                    </span>
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => stepBy.current(1)}
          aria-label="Previous projects"
        >
          <WheelArrow direction="left" />
        </button>
        <button
          type="button"
          onClick={() => stepBy.current(-1)}
          aria-label="Next projects"
        >
          <WheelArrow direction="right" />
        </button>
      </div>
    </div>
  )
}

/**
 * A small hairline arrow for stepping the wheel. On hover the head nudges
 * forward. The left arrow is the right one mirrored.
 */
function WheelArrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 28 10"
      className={styles.arrow}
      data-direction={direction}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M 1 5 H 26" />
      <path className={styles.head} d="M 22 1.5 L 26 5 L 22 8.5" />
    </svg>
  )
}

/**
 * The card's picture, after the MYSSP network graphic: a field of dither dots
 * that thickens and thins in soft clouds, with the field's icon drawn in dots
 * inside a pair of turning dotted rings. `seed` moves the clouds about, so no
 * two neighbouring cards look the same.
 */
function FieldGlyph({ Icon, seed }: { Icon: LucideIcon; seed: number }) {
  const at = (a: number, b: number, c: number, d: number) =>
    `${a + ((seed * b) % c)}% ${d + ((seed * (b + 6)) % 50)}%`
  return (
    <>
      <span
        aria-hidden
        className={styles.dither}
        style={
          {
            "--bright-a": at(8, 37, 60, 10),
            "--bright-b": at(40, 23, 55, 40),
            "--void-a": at(20, 29, 60, 30),
            "--void-b": at(55, 17, 40, 5),
          } as React.CSSProperties
        }
      />
      <span aria-hidden className={styles.emblem}>
        <span className={styles.ringOuter} />
        <span className={styles.ringInner} />
        <Icon
          className={styles.icon}
          size={30}
          strokeWidth={2.2}
          strokeDasharray="0.01 3.2"
          strokeLinecap="round"
        />
      </span>
    </>
  )
}
