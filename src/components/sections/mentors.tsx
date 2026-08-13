import * as React from "react"
import { ArrowUpRight } from "lucide-react"

import { RevealGroup, RevealItem } from "@/components/motion/reveal"
import { SectionHeading } from "./section-heading"
import { mentors } from "@/data/competition-data"
import { cn } from "@/lib/utils"

/**
 * Bio clamped to four lines with an expand toggle.
 *
 * The toggle only appears when the text actually overflows — several bios are
 * two sentences, and a "Read more" that reveals nothing is worse than none.
 * Overflow is measured rather than guessed from character count, because the
 * column width changes with the breakpoint.
 */
function ExpandableBio({ text }: { text: string }) {
  const ref = React.useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = React.useState(false)
  const [overflows, setOverflows] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    // ResizeObserver fires asynchronously, so this never sets state during the
    // effect itself. Skip while expanded, when scrollHeight always equals
    // clientHeight and the toggle would erase itself.
    const measure = () => {
      if (el.dataset.expanded === "true") return
      setOverflows(el.scrollHeight > el.clientHeight + 1)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="mt-4">
      <p
        ref={ref}
        data-expanded={expanded}
        className={cn(
          "text-sm leading-relaxed text-muted-foreground",
          !expanded && "line-clamp-4"
        )}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="link-wipe mt-2 text-sm font-medium"
        >
          {expanded ? "Show less" : "Read full bio"}
        </button>
      )}
    </div>
  )
}

/**
 * Mentor roster.
 *
 * Was a 3-up card grid with a hard-clamped bio and every line in the same grey
 * at the same size, so nothing led the eye and the cut-off sentence was usually
 * the one saying what the mentor actually works on.
 *
 * Now an editorial row list — portrait, then name / affiliation / bio / project
 * in four distinct typographic registers, with the bio clamped but expandable.
 */
export function Mentors() {
  return (
    <section
      id="mentors"
      className="scroll-mt-24 border-t border-border py-24 md:py-32"
    >
      <div className="container">
        <SectionHeading
          kicker="Expert Guidance"
          index="06"
          title="Your mentors"
          lede="Confirmed researchers from UTAR, regional universities, and labs in Singapore, Japan, Hong Kong, the UK and the US. Each one owns the project they are mentoring."
        />

        <RevealGroup
          as="ul"
          className="mt-16 grid gap-x-16 border-t border-border md:mt-24 lg:grid-cols-2"
        >
          {mentors.map((mentor) => (
            <RevealItem
              as="li"
              key={mentor.name}
              className="flex gap-5 border-b border-border py-8 sm:gap-7 md:py-10"
            >
              <img
                src={mentor.photo}
                alt=""
                width={560}
                height={700}
                loading="lazy"
                decoding="async"
                className="h-auto w-24 shrink-0 self-start border border-border object-cover sm:w-32"
                style={{ aspectRatio: "4 / 5" }}
              />

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl leading-tight">
                  {mentor.name}
                </h3>
                {/* Affiliation is content, not a label — sentence case at body
                    size, and dark enough to actually read. */}
                <p className="mt-1.5 text-sm leading-snug font-medium text-foreground">
                  {mentor.affiliation}
                </p>
                {mentor.url && (
                  <a
                    href={mentor.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-wipe mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {new URL(mentor.url).hostname.replace(/^www\./, "")}
                    <ArrowUpRight aria-hidden className="size-3.5" />
                  </a>
                )}

                <ExpandableBio text={mentor.bio} />

                <div className="mt-5 border-t border-border pt-4">
                  <p className="label-micro text-muted-foreground">
                    {mentor.projects.length > 1 ? "Projects" : "Project"}
                  </p>
                  <ul className="mt-2.5 space-y-1.5">
                    {mentor.projects.map((title) => (
                      <li
                        key={title}
                        className="text-sm leading-snug font-medium text-balance"
                      >
                        {title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
