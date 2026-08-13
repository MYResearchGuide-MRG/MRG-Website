import type { ElementType } from "react"
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react"

import { riseVariants, staggerVariants, viewportOnce } from "./variants"

/**
 * Motion components for every tag these wrappers support, resolved once at
 * module scope. Looking them up per render would recreate the component
 * identity on each pass; a static map keeps it stable.
 *
 * Values are widened to ElementType because polymorphic `as` means props
 * typed for one tag get spread onto the motion component for another.
 */
const MOTION_TAGS = {
  article: motion.article,
  div: motion.div,
  footer: motion.footer,
  header: motion.header,
  li: motion.li,
  ol: motion.ol,
  section: motion.section,
  ul: motion.ul,
} satisfies Record<string, unknown> as Record<string, ElementType>

type RevealProps = HTMLMotionProps<"div"> & {
  /** Delay the entrance, in seconds. */
  delay?: number
  as?: "div" | "section" | "li" | "article" | "header" | "footer"
}

/**
 * Scroll-triggered entrance. Fires once when the element enters the viewport.
 *
 * When the user prefers reduced motion this renders the element with no
 * variants at all, so content is never left stranded at opacity 0.
 */
export function Reveal({
  children,
  delay = 0,
  as = "div",
  ...props
}: RevealProps) {
  const reduced = useReducedMotion()
  const Comp = MOTION_TAGS[as]

  if (reduced) {
    return <Comp {...props}>{children}</Comp>
  }

  return (
    <Comp
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={riseVariants}
      transition={delay ? { delay } : undefined}
      {...props}
    >
      {children}
    </Comp>
  )
}

type RevealGroupProps = HTMLMotionProps<"div"> & {
  as?: "div" | "ul" | "ol" | "section"
}

/**
 * Staggers the entrance of its children. Pair with `RevealItem`, or with any
 * child motion element that declares `variants={riseVariants}`.
 */
export function RevealGroup({
  children,
  as = "div",
  ...props
}: RevealGroupProps) {
  const reduced = useReducedMotion()
  const Comp = MOTION_TAGS[as]

  if (reduced) {
    return <Comp {...props}>{children}</Comp>
  }

  return (
    <Comp
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={staggerVariants}
      {...props}
    >
      {children}
    </Comp>
  )
}

type RevealItemProps = HTMLMotionProps<"div"> & {
  as?: "div" | "li" | "article"
}

/** A single staggered child inside a `RevealGroup`. */
export function RevealItem({
  children,
  as = "div",
  ...props
}: RevealItemProps) {
  const reduced = useReducedMotion()
  const Comp = MOTION_TAGS[as]

  if (reduced) {
    return <Comp {...props}>{children}</Comp>
  }

  return (
    <Comp variants={riseVariants} {...props}>
      {children}
    </Comp>
  )
}

/**
 * Splits a headline into lines, each masked and slid up independently.
 * Pass lines as an array of strings.
 */
export function MaskedLines({
  lines,
  className,
  lineClassName,
}: {
  lines: string[]
  className?: string
  lineClassName?: string
}) {
  const reduced = useReducedMotion()

  if (reduced) {
    return (
      <span className={className}>
        {lines.map((line, i) => (
          <span key={i} className={lineClassName} style={{ display: "block" }}>
            {line}
          </span>
        ))}
      </span>
    )
  }

  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.075 } },
      }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          className={lineClassName}
          style={{ display: "block", overflow: "hidden", paddingBottom: "0.04em" }}
        >
          <motion.span
            style={{ display: "block" }}
            variants={{
              hidden: { y: "110%" },
              visible: {
                y: "0%",
                transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
              },
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}

/** Hairline that draws out from the left when scrolled into view. */
export function DrawRule({
  className,
  delay = 0,
}: {
  className?: string
  delay?: number
}) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <span className={className} />
  }

  return (
    <motion.span
      className={className}
      style={{ originX: 0 }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={viewportOnce}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
    />
  )
}

export type { RevealProps }
