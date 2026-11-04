import { Reveal } from "@/components/motion/reveal"
import { SlantLink } from "@/components/ui/slant-link"
import { SectionHeading } from "./section-heading"
import { SELECTED } from "@/data/selected"
import { projects } from "@/data/competition-data"
import { resultsRouteHash } from "@/lib/results"

/**
 * School names arrive as typed into the application form, so one school shows
 * up under several spellings. Keyed by the lower-cased raw name.
 */
const SCHOOL_ALIASES: Record<string, string> = {
  "sunway college kl": "Sunway College",
  "sunway college kuala lumpur": "Sunway College",
  "garden international school kl": "Garden International School",
  "sm kuen cheng": "Kuen Cheng High School",
  "kolej yayasan uem": "Kolej Yayasan UEM",
  "kolej matrikulasi pulau pinang": "Kolej Matrikulasi Pulau Pinang",
  "smk seri garing": "SMK Seri Garing",
  "garden international school": "Garden International School",
}

/** Not an institution, so counted as a scholar but not listed as a school. */
const NOT_A_SCHOOL = new Set(["homeschooled"])

function canonicalSchool(raw: string) {
  const key = raw.trim().replace(/’/g, "'").toLowerCase()
  if (NOT_A_SCHOOL.has(key)) return null
  return SCHOOL_ALIASES[key] ?? raw.trim().replace(/’/g, "'")
}

const schools = [
  ...new Set(
    SELECTED.map((s) => canonicalSchool(s.school)).filter(
      (s): s is string => !!s
    )
  ),
].sort((a, b) => a.localeCompare(b))

const stats = [
  { value: SELECTED.length, label: "Scholars" },
  { value: schools.length, label: "Schools" },
  {
    value: projects.filter((p) => p.status === "confirmed").length,
    label: "Projects",
  },
]

/**
 * A short introduction to this year's scholars: headline numbers, a link to
 * the full list on the results page, and the schools they come from running
 * past underneath. Names stay on the results page; the home page only shows
 * where the cohort is from.
 */
export function Cohort() {
  return (
    <section
      id="cohort"
      className="scroll-mt-24 overflow-hidden py-20 md:py-28"
    >
      <div className="container">
        <SectionHeading
          kicker="The 2026 cohort"
          title="Meet the cohort"
          lede="Pre-university students from schools across Malaysia, now researching alongside their mentors."
        />

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <dl className="grid grid-cols-3 gap-8 md:gap-14">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dd className="font-display text-4xl leading-none md:text-5xl">
                    {stat.value}
                  </dd>
                  <dt className="label-micro mt-3 text-muted-foreground">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
            <SlantLink href={resultsRouteHash}>See the full cohort</SlantLink>
          </div>
        </Reveal>
      </div>

      {/* Schools ticker. Two copies end to end, scrolled by exactly one copy's
          width, so the loop has no seam. Still for reduced-motion users, who
          get the list wrapped instead. */}
      <Reveal delay={0.2} className="mt-16">
        <div className="marquee-mask group relative flex overflow-hidden border-y border-border py-5 motion-reduce:flex-wrap motion-reduce:justify-center">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1 || undefined}
              className="flex shrink-0 items-center gap-10 pr-10 group-hover:[animation-play-state:paused] motion-safe:animate-[marquee_45s_linear_infinite] motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-3 motion-reduce:pr-0 motion-reduce:[&:nth-child(2)]:hidden"
            >
              {schools.map((school) => (
                <li
                  key={school}
                  className="flex items-center gap-10 text-sm whitespace-nowrap text-muted-foreground"
                >
                  {school}
                  <span aria-hidden className="size-1 rounded-full bg-border" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
