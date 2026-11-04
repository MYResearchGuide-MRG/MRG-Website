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
        <div className="mx-auto max-w-4xl">
          <SectionHeading
            kicker="Questions"
            index="03"
            title="Frequently Asked Questions"
            lede={
              <>
                Can&rsquo;t find it here? Email us at{" "}
                <a href={contactMailto} className="link-wipe text-foreground">
                  myresearchguide.org@gmail.com
                </a>
              </>
            }
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
        </div>
      </div>
    </section>
  )
}
