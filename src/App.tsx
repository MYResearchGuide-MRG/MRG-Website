import * as React from "react"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { DesignSwitch } from "@/components/layout/design-switch"
import { SignOutDialog } from "@/components/layout/sign-out-dialog"
import { Hero } from "@/components/sections/hero"
import { Results } from "@/components/sections/results"
import { Partners } from "@/components/sections/partners"
import { Projects, ProjectsCatalogue } from "@/components/sections/projects"
import { About } from "@/components/sections/about"
import { ColumnBand } from "@/components/sections/column-band"
import { Eligibility } from "@/components/sections/eligibility"
import { Faq } from "@/components/sections/faq"
import { StayConnected } from "@/components/sections/stay-connected"
import { TimelineSection } from "@/components/sections/timeline"
import { Resources } from "@/components/sections/resources"
import { DemoDayPage } from "@/components/sections/demo-day-page"
import { useRoute } from "@/lib/results"
import { useDemoDayYear } from "@/lib/demo-day"
import { setPreviewCommitteeSession, useCommitteeAccess } from "@/components/admin/committee-session"
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
  // The same session drives navigation and project permissions on every route.
  const access = useDemoAccess()
  const isAdmin = useCommitteeAccess()
  const [, refreshSession] = React.useReducer((n) => n + 1, 0)
  React.useEffect(() => {
    const id = window.setInterval(refreshSession, 30_000)
    return () => window.clearInterval(id)
  }, [])
  const assignedProjectId = currentProject()
  const signedIn = Boolean(access.session) || isAdmin
  const [editState, setEditState] = React.useState({ dirty: false, busy: false })
  const [signOutOpen, setSignOutOpen] = React.useState(false)
  const [signingOut, setSigningOut] = React.useState(false)
  const [signOutError, setSignOutError] = React.useState("")
  const [accessOpen, setAccessOpen] = React.useState(false)
  const [accessMounted, setAccessMounted] = React.useState(false)
  const signIn = () => {
    setAccessMounted(true)
    setAccessOpen(true)
  }
  const signOut = async () => {
    if (signingOut || editState.busy) return
    setSigningOut(true)
    setSignOutError("")
    try {
      await signOutParticipant()
      setPreviewCommitteeSession(false)
      setSignOutOpen(false)
      // Stay on the current page. Hidden projects become unavailable without
      // membership; public projects remain readable after signing out.
    } catch {
      setSignOutError("Could not sign out. Please try again.")
    } finally {
      setSigningOut(false)
    }
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
      <SiteHeader signedIn={signedIn} isAdmin={isAdmin} onSignIn={signIn} onSignOut={() => {
        setSignOutError("")
        setSignOutOpen(true)
      }} />

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
            onEditStateChange={setEditState}
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
              {/* What the programme is, then where it stands right now: the
                  two things most visitors come to find out. */}
              <About />
              <TimelineSection />
              <Projects />
              <Eligibility />
              <ColumnBand />
              <Faq />
              <StayConnected />
            </>
          )}
        </main>
      )}

      <SiteFooter />
      <DesignSwitch />
      <SignOutDialog
        open={signOutOpen}
        onOpenChange={(open) => { if (!signingOut) setSignOutOpen(open) }}
        onConfirm={() => void signOut()}
        busy={signingOut || editState.busy}
        unsaved={editState.dirty}
        error={editState.busy ? "Please wait for your changes to finish saving or your image to finish loading." : signOutError}
      />
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
