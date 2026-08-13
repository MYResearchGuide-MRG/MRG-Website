import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { DesignSwitch } from "@/components/layout/design-switch"
import { Hero } from "@/components/sections/hero"
import { Partners } from "@/components/sections/partners"
import { Projects } from "@/components/sections/projects"
import { Eligibility } from "@/components/sections/eligibility"
import { Faq } from "@/components/sections/faq"
import { ClosingCta } from "@/components/sections/closing-cta"

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <Hero />
        <Partners />
        {/* Projects leads: it is the reason to apply, and the timeline used to
            spend a full screen before anyone saw one. */}
        <Projects />
        <Eligibility />
        {/* Faq renders the programme timeline alongside itself. */}
        <Faq />
        <ClosingCta />
      </main>

      <SiteFooter />
      <DesignSwitch />
    </div>
  )
}

export default App
