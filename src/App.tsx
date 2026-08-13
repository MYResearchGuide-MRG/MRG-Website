import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { DesignSwitch } from "@/components/layout/design-switch"
import { Hero } from "@/components/sections/hero"
import { Partners } from "@/components/sections/partners"
import { Timeline } from "@/components/sections/timeline"
import { Projects } from "@/components/sections/projects"
import { Prizes } from "@/components/sections/prizes"
import { Eligibility } from "@/components/sections/eligibility"
import { Apply } from "@/components/sections/apply"
import { Mentors } from "@/components/sections/mentors"
import { Faq } from "@/components/sections/faq"
import { ClosingCta } from "@/components/sections/closing-cta"

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <Hero />
        <Partners />
        <Timeline />
        <Projects />
        <Prizes />
        <Eligibility />
        <Apply />
        <Mentors />
        <Faq />
        <ClosingCta />
      </main>

      <SiteFooter />
      <DesignSwitch />
    </div>
  )
}

export default App
