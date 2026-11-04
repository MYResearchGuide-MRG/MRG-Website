import * as React from "react"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { DesignSwitch } from "@/components/layout/design-switch"
import { LiquidCursor } from "@/components/layout/liquid-cursor"
import { Hero } from "@/components/sections/hero"
import { Results } from "@/components/sections/results"
import { Partners } from "@/components/sections/partners"
import { Projects } from "@/components/sections/projects"
import { ResearchAreas } from "@/components/sections/research-areas"
import { HowItWorks } from "@/components/sections/how-it-works"
import { Cohort } from "@/components/sections/cohort"
import { Eligibility } from "@/components/sections/eligibility"
import { Faq } from "@/components/sections/faq"
import { TimelineSection } from "@/components/sections/timeline"
import { Resources } from "@/components/sections/resources"
import { Awards } from "@/components/sections/awards"
import { useRoute } from "@/lib/results"

function App() {
  const route = useRoute()

  // The results reveal lives on its own hash route so the front page stays
  // a pre-announcement surface with only the countdown pill pointing at it.
  const defaultTitle = React.useRef(document.title)
  React.useEffect(() => {
    document.title =
      route === "results"
        ? `Selection announcement | ${defaultTitle.current}`
        : route === "resources"
          ? `Resources | ${defaultTitle.current}`
          : route === "awards"
            ? `Awards | ${defaultTitle.current}`
            : route === "projects"
              ? `Project library | ${defaultTitle.current}`
              : defaultTitle.current
  }, [route])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {route === "results" ? (
          <Results />
        ) : route === "resources" ? (
          <Resources />
        ) : route === "awards" ? (
          <Awards />
        ) : route === "projects" ? (
          <Projects />
        ) : (
          <>
            <Hero />
            <Partners />
            {/* The timeline sits straight after the hero: where the programme
                is right now is what most visitors come to check. */}
            <TimelineSection />
            <HowItWorks />
            <ResearchAreas />
            <Cohort />
            <Eligibility />
            <Faq />
          </>
        )}
      </main>

      <SiteFooter />
      <DesignSwitch />
      <LiquidCursor />
    </div>
  )
}

export default App
