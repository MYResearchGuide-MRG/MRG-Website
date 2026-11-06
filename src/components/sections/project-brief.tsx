import { DialogTitle } from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { projectCodes, projects, type Project } from "@/data/competition-data"

const CODES = projectCodes(projects)
function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border py-4">
      <dt className="label-micro text-muted-foreground">{label}</dt>
      <dd className="mt-2 leading-snug font-medium">{value}</dd>
    </div>
  )
}

/** The bulleted sections the committee's reference format uses verbatim. */
function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        // AccordionContent greys its children; these are content, not chrome.
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground">
          <span aria-hidden className="mt-[0.65rem] h-0.5 w-3 shrink-0 bg-muted-foreground" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** True when the skill chips already carry everything the prose answer says. */
function tagsCoverProse(project: Project) {
  const prose = project.skillsDescription.toLowerCase()
  return prose.length < 80 && project.skills.every((s) => prose.includes(s.toLowerCase()))
}

export function ProjectBrief({ project }: { project: Project }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pr-12">
        <span className="label-micro text-muted-foreground">
          {project.track} / {project.type}
        </span>
        <span aria-hidden className="h-px w-8 bg-border" />
        <span className="label-micro text-muted-foreground">{project.code || CODES.get(project.id)}</span>
        {project.status === "pending" && (
          <span className="label-micro border border-border px-2 py-1 text-muted-foreground">
            Awaiting mentor confirmation
          </span>
        )}
      </div>

      <DialogTitle className="mt-6 text-2xl leading-snug font-medium text-balance sm:text-3xl">
        {project.title}
      </DialogTitle>

      {/* Mentor gets its own band with the headshot: it is the single fact an
          applicant weighs hardest, and it was previously one grey cell among
          three. */}
      <div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
        {project.photo && <img
          src={project.photo}
          alt=""
          width={560}
          height={700}
          loading="lazy"
          decoding="async"
          className="h-auto w-14 shrink-0 border border-border object-cover"
          style={{ aspectRatio: "4 / 5" }}
        />}
        <div className="min-w-0">
          <p className="label-micro text-muted-foreground">Mentor</p>
          <p className="mt-1.5 leading-snug font-medium">{project.mentor}</p>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{project.affiliation}</p>
        </div>
      </div>

      <dl className="mt-2 grid gap-x-10 sm:grid-cols-2">
        <MetaCell label="Participants" value={project.participants} />
        <MetaCell label="Time commitment" value={project.timeInvestment} />
      </dl>

      {/* The brief is the thing people came to read: full foreground, not the
          secondary grey the rest of the metadata sits in. */}
      <p className="mt-8 max-w-2xl leading-relaxed text-pretty">{project.description}</p>

      <div className="mt-9">
        <span className="label-micro text-muted-foreground">Skills</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {project.skills.map((skill) => (
            <span
              key={skill}
              className="border border-border px-2.5 py-1 text-sm text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
        {/* Some mentors answered with a bare list that the tags already say.
            Repeating it under the chips reads as a rendering bug. */}
        {!tagsCoverProse(project) && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {project.skillsDescription}
          </p>
        )}
      </div>

      <Accordion type="multiple" className="mt-10 border-t border-border">
        <AccordionItem value="mentor">
          <AccordionTrigger className="text-base md:text-lg">About the mentor</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm leading-relaxed">{project.mentorBio}</p>
          </AccordionContent>
        </AccordionItem>
        {/* Some mentors gave no prep work; an empty disclosure is worse than
            none at all. */}
        {project.prepWork.length > 0 && (
          <AccordionItem value="prep">
            <AccordionTrigger className="text-base md:text-lg">Prep Work</AccordionTrigger>
            <AccordionContent>
              <BulletList items={project.prepWork} />
            </AccordionContent>
          </AccordionItem>
        )}
        <AccordionItem value="tasks">
          <AccordionTrigger className="text-base md:text-lg">
            Example Project Tasks
          </AccordionTrigger>
          <AccordionContent>
            <BulletList items={project.tasks} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="deliverables">
          <AccordionTrigger className="text-base md:text-lg">
            Expected Deliverables
          </AccordionTrigger>
          <AccordionContent>
            <BulletList items={project.deliverables} />
          </AccordionContent>
        </AccordionItem>
        {project.preferences && (
          <AccordionItem value="preferences">
            <AccordionTrigger className="text-base md:text-lg">Who this suits</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed">{project.preferences}</p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
