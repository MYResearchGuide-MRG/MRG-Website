import * as React from "react"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { DesignSwitch } from "@/components/layout/design-switch"
import { Hero } from "@/components/sections/hero"
import { Results } from "@/components/sections/results"
import { Partners } from "@/components/sections/partners"
import { Projects } from "@/components/sections/projects"
import { Eligibility } from "@/components/sections/eligibility"
import { Faq } from "@/components/sections/faq"
import { ClosingCta } from "@/components/sections/closing-cta"
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
        : defaultTitle.current
  }, [route])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {route === "results" ? (
          <Results />
        ) : (
          <>
            <Hero />
            <Partners />
            {/* Projects leads: it is the reason to apply, and the timeline used to
                spend a full screen before anyone saw one. */}
            <Projects />
            <Eligibility />
            {/* Faq renders the programme timeline alongside itself. */}
            <Faq />
            <ClosingCta />
          </>
        )}
      </main>

      <SiteFooter />
      <DesignSwitch />
    </div>
  )
}

export default App
