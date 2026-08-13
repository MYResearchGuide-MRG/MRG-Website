import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Reveal } from "@/components/motion/reveal"
import { SectionHeading } from "./section-heading"
import { faqs } from "@/data/competition-data"
import { contactMailto } from "@/lib/site"

export function Faq() {
  return (
    <section
      id="faq"
      className="scroll-mt-24 border-t border-border bg-muted/40 py-24 md:py-32"
    >
      <div className="container">
        <div className="grid gap-14 lg:grid-cols-[22rem_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeading
              kicker="Questions"
              index="07"
              title="Frequently asked"
              lede="Can't find it here? Email us and a coordinator will reply."
            />
            <Reveal delay={0.18}>
              <a
                href={contactMailto}
                className="link-wipe mt-7 inline-block text-sm font-medium"
              >
                {`Contact the team`}
              </a>
            </Reveal>
          </div>

          <Reveal delay={0.06}>
            <Accordion type="single" collapsible className="border-t border-border">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
