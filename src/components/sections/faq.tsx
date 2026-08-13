import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "./section-heading"
import { Timeline } from "./timeline"
import { faqs } from "@/data/competition-data"
import { contactMailto } from "@/lib/site"

/**
 * FAQ and the programme timeline share a section. Neither has enough content
 * to justify a full screen of its own, and read side by side the timeline
 * answers half the questions before they get asked.
 *
 * The timeline leads. It is the narrower column of the two, and placed second
 * the much wider FAQ swallowed it — both on desktop, where the eye starts
 * left, and when stacked, where it fell below eight accordion rows.
 */
export function Faq() {
  return (
    <section
      id="faq"
      className="scroll-mt-24 border-t border-border bg-muted/40 py-24 md:py-32"
    >
      <div className="container">
        <div className="grid gap-14 lg:grid-cols-[22rem_1fr] lg:gap-20">
          <Timeline />

          <div>
            <SectionHeading
              kicker="Questions"
              index="03"
              title="Frequently asked"
              lede="Can't find it here? Email us and a coordinator will reply."
            />

            <Reveal delay={0.06}>
              <Accordion
                type="single"
                collapsible
                className="mt-12 border-t border-border"
              >
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>

            <Reveal delay={0.18}>
              <a
                href={contactMailto}
                className="link-wipe mt-10 inline-block text-sm font-medium"
              >
                Contact the team
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
