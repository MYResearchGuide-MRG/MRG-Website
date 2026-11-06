import { Accordion } from "radix-ui"
import { ArrowUpRight } from "lucide-react"

import { Reveal } from "@/components/motion/reveal"
import { faqs } from "@/data/competition-data"
import { contactMailto } from "@/lib/site"
import styles from "./faq.module.css"

/**
 * Frequently asked questions, in MYResearchGuide's layout: the heading and a
 * "get in touch" link on the left, and the questions in a single black
 * outlined accordion on the right, each opened by a dashed plus.
 */
export function Faq() {
  return (
    <section
      id="faq"
      className="section-y scroll-mt-24"
      aria-labelledby="faq-heading"
    >
      <div className="content-container">
        <div className={styles.inner}>
          <Reveal className={styles.intro}>
            <h2 id="faq-heading">Frequently asked questions</h2>
            <a href={contactMailto} className={styles.contact}>
              <span className={styles.contactLabel}>
                Still have a question? Get in touch
              </span>
              <ArrowUpRight size={15} aria-hidden />
            </a>
          </Reveal>

          <Reveal delay={0.06}>
            <Accordion.Root type="single" collapsible className={styles.list}>
              {faqs.map((faq, i) => (
                <Accordion.Item
                  key={faq.question}
                  value={`faq-${i}`}
                  className={styles.item}
                >
                  <Accordion.Header className={styles.itemHeading}>
                    <Accordion.Trigger className={styles.trigger}>
                      <span>{faq.question}</span>
                      <span className={styles.toggle} aria-hidden>
                        <span className={styles.horizontal} />
                        <span className={styles.vertical} />
                      </span>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className={styles.content}>
                    <div className={styles.answer}>
                      <p>{faq.answer}</p>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
