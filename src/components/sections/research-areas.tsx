import { ArrowUpRight } from "lucide-react"

import { RevealGroup, RevealItem, Reveal } from "@/components/motion/reveal"
import { TrackGlyph } from "@/components/icons/track-glyphs"
import { SlantLink } from "@/components/ui/slant-link"
import { SectionHeading } from "./section-heading"
import { projects, trackOrder, type Track } from "@/data/competition-data"
import { projectsRouteHash, projectsTrackHash } from "@/lib/results"

/**
 * One line per area, written from the projects actually running in it so a
 * visitor gets a feel for the work without opening the library.
 */
const blurbs: Record<Track, string> = {
  "AI & Computer Sciences":
    "Language models, computer vision and AI agents, from robustness to reproducibility.",
  Biology: "Cancer immunology and genomics.",
  Chemistry: "Chemical engineering and sustainable processes.",
  Mathematics: "Pure mathematics, exploring the geometry of trees.",
  "Interdisciplinary & Social Sciences":
    "Youth well-being, psychometrics and engineering systems.",
  Physics: "Particle physics, using cosmic-ray muons to see inside solid rock.",
}

/**
 * Each area's colour, as "r g b". On hover a card washes into it, so the six
 * read as distinct fields at a glance. Mid-saturation tones, used at low
 * alpha, so they tint the card without fighting the text in either theme.
 */
const hues: Record<Track, string> = {
  "AI & Computer Sciences": "99 102 241", // indigo
  Biology: "16 185 129", // emerald
  Chemistry: "245 158 11", // amber
  Mathematics: "14 165 233", // sky
  "Interdisciplinary & Social Sciences": "244 63 94", // rose
  Physics: "168 85 247", // violet
}

const confirmed = projects.filter((p) => p.status === "confirmed")

/**
 * The home page's short answer to "what can scholars work on?": the six
 * research areas with a line and a project count each. The full briefs live in
 * the project library (#/projects); each card opens it filtered to its area.
 */
export function ResearchAreas() {
  return (
    <section id="research-areas" className="scroll-mt-24 py-20 md:py-28">
      <div className="container">
        <SectionHeading
          kicker="Research"
          title="Research areas"
          lede={`${confirmed.length} mentor-led projects across ${trackOrder.length} fields of science. Each project is a real research question owned by a mentor, worked on by a small team of scholars over eight weeks.`}
        />

        <RevealGroup className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trackOrder.map((track) => (
            <RevealItem key={track}>
              <AreaCard
                track={track}
                count={confirmed.filter((p) => p.track === track).length}
              />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.1} className="mt-12 flex justify-center">
          <SlantLink href={projectsRouteHash}>
            Open the project library
          </SlantLink>
        </Reveal>
      </div>
    </section>
  )
}

function AreaCard({ track, count }: { track: Track; count: number }) {
  const hue = hues[track]
  return (
    <a
      href={projectsTrackHash(track)}
      className="group relative isolate flex h-full flex-col overflow-hidden rounded-xl bg-card p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {/* Hover wash in the area's colour, brightest behind the icon. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{
          background: `radial-gradient(120% 90% at 0% 0%, rgb(${hue} / 0.32), rgb(${hue} / 0.08) 55%, transparent 80%)`,
        }}
      />
      {/* The area's icon, large and faint in the corner, rising into view. */}
      <TrackGlyph
        track={track}
        className="pointer-events-none absolute -right-6 -bottom-8 -z-10 size-44 translate-y-4 opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-y-0 group-hover:opacity-[0.09] group-focus-visible:opacity-[0.09]"
      />

      <div className="flex items-start justify-between">
        <span className="flex size-11 items-center justify-center rounded-lg bg-background text-foreground">
          <TrackGlyph
            track={track}
            className="size-6 transition-transform duration-300 group-hover:scale-110"
          />
        </span>
        <ArrowUpRight
          aria-hidden
          className="size-4 text-muted-foreground transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
        />
      </div>

      <h3 className="mt-6 font-display text-lg leading-snug">{track}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground transition-colors duration-300 group-hover:text-foreground/80">
        {blurbs[track]}
      </p>
      <p className="mt-5 text-xs text-muted-foreground">
        {count} {count === 1 ? "project" : "projects"}
      </p>
    </a>
  )
}
