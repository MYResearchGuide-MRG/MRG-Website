import * as React from "react"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { DesignSwitch } from "@/components/layout/design-switch"
import { LiquidCursor } from "@/components/layout/liquid-cursor"
import { Hero } from "@/components/sections/hero"
import { Results } from "@/components/sections/results"
import { Partners } from "@/components/sections/partners"
import { ProjectsCatalogue } from "@/components/sections/projects"
import { ResearchAreas } from "@/components/sections/research-areas"
import { HowItWorks } from "@/components/sections/how-it-works"
import { Cohort } from "@/components/sections/cohort"
import { Eligibility } from "@/components/sections/eligibility"
import { Faq } from "@/components/sections/faq"
import { TimelineSection } from "@/components/sections/timeline"
import { Resources } from "@/components/sections/resources"
import { DemoDayPage } from "@/components/sections/demo-day-page"
import { useRoute } from "@/lib/results"
import { useDemoDayYear } from "@/lib/demo-day"
import {
  currentProject,
  signOutParticipant,
  useDemoAccess,
} from "@/components/admin/demo-access"

const AdminPanel = React.lazy(() => import("@/components/admin/AdminPanel"))

const Projectboard = React.lazy(
  () => import("@/components/projectboard/Projectboard")
)
const AccessDialog = React.lazy(
  () => import("@/components/projectboard/AccessDialog")
)

function App() {
  const route = useRoute()
  const demoDayYear = useDemoDayYear()
  // Demo access is shared with the site header; production auth will replace it.
  const access = useDemoAccess()
  const [, refreshSession] = React.useReducer((n) => n + 1, 0)
  React.useEffect(() => {
    const id = window.setInterval(refreshSession, 30_000)
    return () => window.clearInterval(id)
  }, [])
  const assignedProjectId = currentProject()
  const signedIn = Boolean(assignedProjectId)
  const [accessOpen, setAccessOpen] = React.useState(false)
  const [accessMounted, setAccessMounted] = React.useState(false)
  const signIn = () => {
    setAccessMounted(true)
    setAccessOpen(true)
  }
  const signOut = () => {
    signOutParticipant()
    window.location.hash = "#/projectboard"
  }

  // The results reveal lives on its own hash route so the front page stays
  // a pre-announcement surface with only the countdown pill pointing at it.
  const defaultTitle = React.useRef(document.title)
  React.useEffect(() => {
    document.title =
      route === "admin"
        ? `Committee | ${defaultTitle.current}`
        : route === "projects"
          ? `2026 Projects | ${defaultTitle.current}`
          : route === "projectboard"
            ? `Project Archive | ${defaultTitle.current}`
            : route === "results"
              ? `Selection announcement | ${defaultTitle.current}`
              : route === "resources"
                ? `Resources | ${defaultTitle.current}`
                : route === "awards"
                  ? `${demoDayYear} Awards | ${defaultTitle.current}`
                  : route === "judges"
                    ? `${demoDayYear} Judges | ${defaultTitle.current}`
                    : defaultTitle.current
  }, [route, demoDayYear])

  if (route === "admin")
    return (
      <React.Suspense
        fallback={
          <main className="min-h-screen bg-background p-12" role="status">
            Loading committee workspace…
          </main>
        }
      >
        <AdminPanel />
      </React.Suspense>
    )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader signedIn={signedIn} onSignIn={signIn} />

      {route === "projectboard" ? (
        <React.Suspense
          fallback={
            <main className="container min-h-[70svh] pt-32" role="status">
              Loading Project Archive…
            </main>
          }
        >
          <Projectboard
            key={`${access.session?.participantId || "public"}-${assignedProjectId}`}
            assignedProjectId={assignedProjectId}
            onSignIn={signIn}
            onSignOut={signOut}
          />
        </React.Suspense>
      ) : (
        <main>
          {route === "projects" ? (
            <ProjectsCatalogue />
          ) : route === "results" ? (
            <Results />
          ) : route === "resources" ? (
            <Resources />
          ) : route === "awards" || route === "judges" ? (
            <DemoDayPage section={route} />
          ) : (
            <>
              <Hero />
              <Partners />
              {/* The timeline sits straight after the hero: where the
                  programme is right now is what most visitors come to check. */}
              <TimelineSection />
              <HowItWorks />
              <ResearchAreas />
              <Cohort />
              <Eligibility />
              <Faq />
            </>
          )}
        </main>
      )}

      <SiteFooter />
      <DesignSwitch />
      <LiquidCursor />
      {accessMounted && (
        <React.Suspense
          fallback={
            <p
              role="status"
              className="fixed right-4 bottom-4 z-50 rounded border border-border bg-background px-4 py-3 text-sm"
            >
              Opening sign in…
            </p>
          }
        >
          <AccessDialog
            open={accessOpen}
            onClose={() => setAccessOpen(false)}
            onEnter={() => {
              window.location.hash = "#/projectboard/workspace"
            }}
          />
        </React.Suspense>
      )}
    </div>
  )
}

export default App
