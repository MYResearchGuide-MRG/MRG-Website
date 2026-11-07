import { useMemo, useState } from "react"
import { DropdownMenu } from "radix-ui"
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  GitFork,
  LockKeyhole,
  Mail,
  Plus,
  Pencil,
  Settings2,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  UsersRound,
  Upload,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Board } from "../projectboard/data"
import {
  canSplitProject,
  useProjectBoards,
  useCohorts,
} from "./project-registry"
import { NewCohortDialog, ProjectEditor } from "./CohortDialogs"
import { SplitProjectDialog } from "./SplitProjectDialog"
import { type Assignment } from "./access-model"
import {
  prepareInvitations,
  useDemoAccess,
} from "./demo-access"
import "./admin.css"
import { AdminSignIn } from "./AdminSignIn"
import { setPreviewCommitteeSession, useCommitteeAccess } from "./committee-session"
import { SignOutDialog } from "@/components/layout/sign-out-dialog"
import { useProjectEditing, setProjectEditing } from "./project-editing"
import {
  useBackend,
  useLiveBackend,
  signOutLive,
  inviteLiveParticipants,
} from "./backend"
import { supabase } from "@/lib/supabase"
import { Trash, RecordActionDialog, type RecordAction } from "./Trash"
import {
  setLibraryVisibility,
  useLibraryVisibility,
} from "./library-visibility"

import { ParticipantTable } from "./ParticipantTable"
import { ParticipantEditor } from "./ParticipantEditor"
import { ParticipantImport } from "./ParticipantImport"
import { AdminSelect } from "./AdminSelect"
import { MentorManagement } from "./MentorManagement"
import { useMentorAccess } from "./mentor-access"
import "./workspace.css"
import { useSubmissionDeadline } from "../projectboard/use-submission-deadline"

type View = "participants" | "mentors" | "projects" | "trash" | "setup"
export default function AdminPanel() {
  const allBoards = useProjectBoards()
  const cohorts = useCohorts()
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const year = selectedYear ?? cohorts[0]?.year ?? 2026
  const submissionDeadline = useSubmissionDeadline(year)
  const cohort = cohorts.find((c) => c.year === year)
  const boards = useMemo(
    () => allBoards.filter((b) => b.year === year),
    [allBoards, year]
  )
  const [newCohort, setNewCohort] = useState(false)
  const [projectEditor, setProjectEditor] = useState<Board | "new" | null>(null)
  const [splitting, setSplitting] = useState<Board | null>(null)
  const { people } = useDemoAccess()
  const cohortPeople = people.filter((p) =>
    boards.some((b) => b.id === p.projectId)
  )
  const visibility = useLibraryVisibility()
  const editingPermissions = useProjectEditing()
  const backend = useBackend()
  const { mentors } = useMentorAccess()
  const [busy, setBusy] = useState(false)
  const visibleCount = boards.filter((b) => visibility[b.id] === true).length
  const committeeAccess = useCommitteeAccess()
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState("")
  const requestSignOut = () => { setSignOutError(""); setSignOutOpen(true) }
  async function signOut() {
    if (busy || signingOut) return
    setSigningOut(true)
    setSignOutError("")
    try {
      if (useLiveBackend) await signOutLive()
      setSignOutOpen(false)
      setPreviewCommitteeSession(false)
    } catch {
      setSignOutError("Could not sign out. Please try again.")
    } finally {
      setSigningOut(false)
    }
  }
  const [view, setView] = useState<View>("participants")
  const [project, setProject] = useState("")
  const [projectQuery, setProjectQuery] = useState("")
  const [projectStatus, setProjectStatus] = useState("")
  const filteredBoards = boards.filter(
    (board) =>
      `${board.code} ${board.title} ${board.mentor}`
        .toLowerCase()
        .includes(projectQuery.trim().toLowerCase()) &&
      (!projectStatus ||
        (projectStatus === "visible"
          ? visibility[board.id] === true
          : projectStatus === "hidden"
            ? visibility[board.id] !== true
            : submissionDeadline.closed || editingPermissions[board.id] !== true))
  )
  const [adding, setAdding] = useState(false)
  const [addingSingle, setAddingSingle] = useState(false)
  const [confirmInvites, setConfirmInvites] = useState<string[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [recordAction, setRecordAction] = useState<RecordAction | null>(null)
  const invitedPerson = people.find((p) => p.id === invitation)
  const editedPerson = people.find((p) => p.id === editing)
  function selectCohort(value: number) {
    setSelectedYear(value)
    setProject("")
    setProjectQuery("")
    setProjectStatus("")
    setNotice("")
  }
  async function prepare(ids: string[]) {
    if (useLiveBackend) {
      setBusy(true)
      try {
        const result = await inviteLiveParticipants(ids)
        setNotice(
          `${result.sent} access code${result.sent === 1 ? "" : "s"} sent.${result.failed ? ` ${result.failed} could not be sent. Check Setup before retrying.` : ""}`
        )
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not send access codes."
        )
      } finally {
        setBusy(false)
      }
      return
    }
    prepareInvitations(ids)
    setNotice(
      `${ids.length} invitation draft${ids.length === 1 ? "" : "s"} prepared.`
    )
    if (ids[0]) setInvitation(ids[0])
  }
  function openProject(id: string) {
    setProject(id)
    setView("participants")
  }
  async function changeVisibility(ids: string[], visible: boolean) {
    if (busy) return
    setBusy(true)
    try {
      const saved = await setLibraryVisibility(ids, visible)
      setNotice(
        saved
          ? `${ids.length === boards.length ? "All projects are" : "Project is"} now ${visible ? "visible in" : "hidden from"} the project archive.`
          : "Could not save visibility. Refresh and try again."
      )
    } catch {
      setNotice("Could not save visibility. Please try again.")
    } finally {
      setBusy(false)
    }
  }
  async function changeEditing(ids: string[], allowed: boolean) {
    if (busy) return
    setBusy(true)
    try {
      const saved = await setProjectEditing(ids, allowed)
      setNotice(
        saved
          ? `Editing ${allowed ? "enabled" : "locked"} for ${ids.length} project${ids.length === 1 ? "" : "s"}.`
          : "Could not update editing access."
      )
    } catch {
      setNotice("Could not update editing access. Please try again.")
    } finally {
      setBusy(false)
    }
  }
  if (!committeeAccess)
    return (
      <main className="ad-root ad-gate">
        <a href="#/" className="ad-back">
          <ArrowLeft size={16} /> Back to MYSSP
        </a>
        <div className="ad-gate-card">
          <img src="/myssp-icon.png" alt="" width="42" />
          <h1>Committee workspace</h1>
          <p>Manage participant access and project assignments.</p>
          <AdminSignIn
            onSuccess={() => setPreviewCommitteeSession(true)}
            onDevice={() => setPreviewCommitteeSession(true)}
          />
        </div>
      </main>
    )
  return (
    <div className="ad-root">
      <header className="ad-header">
        <a href="#/" className="ad-brand">
          <img src="/myssp-icon.png" alt="" />
          <span>
            MYSSP <small>Committee</small>
          </span>
        </a>
        <div className="ad-header-actions">
          <a className="ad-back ad-review-link" href="#/profile/projects">
            Review project pages <ArrowUpRight size={15} />
          </a>
          <a className="ad-back" href="#/project-archive">
            <span className="ad-library-full">View project archive</span>
            <span className="ad-library-short">Archive</span>
            <ArrowUpRight size={15} />
          </a>
          <button
            className="ad-mobile-exit"
            onClick={requestSignOut}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="ad-shell">
        <aside className="ad-sidebar">
          <div className="ad-cohort">
            <span>Cohort</span>
            <AdminSelect
              label="Select cohort"
              value={String(year)}
              onChange={(value) => selectCohort(Number(value))}
              options={
                cohorts.length
                  ? cohorts.map((c) => ({
                      value: String(c.year),
                      label: c.name,
                    }))
                  : [{ value: String(year), label: `MYSSP ${year}` }]
              }
            />
            <button
              className="ad-new-cohort"
              onClick={() => setNewCohort(true)}
            >
              <Plus size={14} /> New cohort
            </button>
          </div>
          <nav aria-label="Admin navigation">
            {(
              [
                { id: "participants", label: "Participants", Icon: Users },
                { id: "mentors", label: "Mentors", Icon: UsersRound },
                { id: "projects", label: "Projects", Icon: FolderOpen },
                ...(useLiveBackend
                  ? [{ id: "trash", label: "Trash", Icon: Trash2 } as const]
                  : []),
                { id: "setup", label: "Setup", Icon: Settings2 },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                aria-current={view === id ? "page" : undefined}
                onClick={() => setView(id)}
              >
                <Icon size={17} />
                {label}
                {id === "participants" && <span>{cohortPeople.length}</span>}
                {id === "mentors" && <span>{mentors.filter(mentor => !mentor.deletedAt && mentor.projectIds.some(id => boards.some(board => board.id === id))).length}</span>}
              </button>
            ))}
          </nav>
          <button
            className="ad-exit"
            onClick={requestSignOut}
          >
            <ArrowLeft size={15} /> Sign out
          </button>
        </aside>
        <main className="ad-main" key={`${view}-${year}`}>
          <div className="ad-page-head">
            <div>
              <p className="ad-breadcrumb">
                {view === "trash" || view === "setup"
                  ? "All cohorts"
                  : cohort?.name || `MYSSP ${year}`}{" "}
                / {view === "setup" ? "Configuration" : "Access management"}
              </p>
              <h1>
                {view === "participants"
                  ? "Participants"
                  : view === "mentors"
                    ? "Mentors"
                  : view === "projects"
                    ? "Projects"
                    : view === "trash"
                      ? "Trash"
                      : "Setup"}
              </h1>
              <p>
                {view === "participants"
                  ? `Manage accounts, assignments and invitations for ${year}.`
                  : view === "mentors"
                    ? `Assign mentors to projects and manage their access for ${year}.`
                  : view === "projects"
                    ? "Add projects, assign teams and control what goes live."
                    : view === "trash"
                      ? "Restore deleted participants and projects."
                      : "Database, sign-in and email delivery."}
              </p>
            </div>
            {view === "participants" && (
              <div className="ad-heading-actions">
                <button
                  className="ad-button"
                  disabled={!boards.length}
                  onClick={() => setAdding(true)}
                >
                  <Upload size={15} /> Import CSV
                </button>
                <button
                  className="ad-button ad-primary"
                  disabled={!boards.length}
                  onClick={() => setAddingSingle(true)}
                >
                  <Plus size={16} /> Add participant
                </button>
              </div>
            )}
            {view === "projects" && (
              <button
                className="ad-button ad-primary"
                onClick={() => setProjectEditor("new")}
              >
                <Plus size={16} /> Add project
              </button>
            )}
          </div>
          {backend.cohortError && (
            <p className="ad-notice" role="status">
              {backend.cohortError}
            </p>
          )}
          {notice && (
            <p className="ad-feedback" role="status">
              <Check size={16} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </p>
          )}
          {view === "participants" && !boards.length ? (
            <div className="ad-empty ad-cohort-empty">
              <FolderOpen size={28} />
              <h2>Add the first project for {year}</h2>
              <p>
                Participants need a project to join. Create one, then add people
                or import a CSV.
              </p>
              <button
                className="ad-button ad-primary"
                onClick={() => setProjectEditor("new")}
              >
                <Plus size={16} /> Add project
              </button>
            </div>
          ) : view === "participants" ? (
            <ParticipantTable
              key={year}
              boards={boards}
              people={cohortPeople}
              project={project}
              onProject={setProject}
              busy={busy}
              onEdit={setEditing}
              onDelete={(person) =>
                setRecordAction({
                  kind: "participant",
                  id: person.id,
                  label: person.name,
                  remove: true,
                })
              }
              onInvite={setConfirmInvites}
              onPreview={setInvitation}
              onAdd={() => setAddingSingle(true)}
            />
          ) : view === "mentors" ? (
            <MentorManagement boards={allBoards} year={year} />
          ) : view === "projects" ? (
            <section aria-label="Project visibility">
              {submissionDeadline.label && <p className="ad-notice">{submissionDeadline.closed ? "Student editing closed" : "Student editing closes"} · {submissionDeadline.label}. The deadline also locks student names and photos. Committee corrections remain available.</p>}
              <div className="ad-project-toolbar">
                <label className="ad-search">
                  <Search size={16} />
                  <input
                    aria-label="Search projects"
                    placeholder="Search project code, title or mentor"
                    value={projectQuery}
                    onChange={(event) => setProjectQuery(event.target.value)}
                  />
                </label>
                <AdminSelect
                  label="Filter projects"
                  value={projectStatus}
                  onChange={setProjectStatus}
                  options={[
                    { value: "", label: "All projects" },
                    { value: "visible", label: "Visible" },
                    { value: "hidden", label: "Hidden" },
                    { value: "locked", label: "Editing locked" },
                  ]}
                />
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className="ad-button ad-bulk-trigger"
                      disabled={busy || !boards.length}
                    >
                      Bulk actions <ChevronDown size={15} aria-hidden="true" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="ad-bulk-menu"
                      align="end"
                      sideOffset={8}
                      collisionPadding={16}
                    >
                      <DropdownMenu.Label className="ad-bulk-label">
                        {year} · All {boards.length} projects
                      </DropdownMenu.Label>
                      <DropdownMenu.Item
                        className="ad-bulk-item"
                        disabled={busy || visibleCount === boards.length}
                        onSelect={() =>
                          changeVisibility(
                            boards.map((b) => b.id),
                            true
                          )
                        }
                      >
                        <Eye size={16} aria-hidden="true" /> Show all in archive
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="ad-bulk-item"
                        disabled={busy || visibleCount === 0}
                        onSelect={() =>
                          changeVisibility(
                            boards.map((b) => b.id),
                            false
                          )
                        }
                      >
                        <EyeOff size={16} aria-hidden="true" /> Hide all from
                        archive
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className="ad-bulk-separator" />
                      <DropdownMenu.Item
                        className="ad-bulk-item"
                        disabled={
                          busy ||
                          boards.every((b) => editingPermissions[b.id] !== true)
                        }
                        onSelect={() =>
                          changeEditing(
                            boards.map((b) => b.id),
                            false
                          )
                        }
                      >
                        <LockKeyhole size={16} aria-hidden="true" /> Lock
                        editing for all
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
              <div className="ad-project-summary" aria-live="polite">
                <span>
                  {filteredBoards.length}{" "}
                  {filteredBoards.length === 1 ? "project" : "projects"}
                  {(projectQuery || projectStatus) && ` of ${boards.length}`}
                </span>
                <span>
                  {visibleCount} visible · {boards.length - visibleCount} hidden
                </span>
              </div>
              <div className="ad-project-list">
                {filteredBoards.map((b) => {
                  const assigned = people.filter(
                    (p) => p.projectId === b.id && !p.revoked
                  )
                  return (
                    <article className="ad-project-row" key={b.id}>
                      <span className="ad-project-code">{b.code}</span>
                      <div className="ad-project-info">
                        <strong>{b.title}</strong>
                        <small>{b.mentor}</small>
                        <div className="ad-project-actions">
                          <button
                            className="ad-assignment-link"
                            aria-label={`Edit ${b.code} details`}
                            onClick={() => setProjectEditor(b)}
                          >
                            <Pencil size={12} /> Edit details
                          </button>
                          <button
                            className="ad-assignment-link"
                            onClick={() => openProject(b.id)}
                            aria-label={`Manage ${b.code} participants`}
                          >
                            Team ({assigned.length}) <ArrowUpRight size={12} />
                          </button>
                          {canSplitProject(b.id) && (
                            <button
                              className="ad-assignment-link ad-split-trigger"
                              aria-label={`Split ${b.code} into teams`}
                              onClick={() => setSplitting(b)}
                            >
                              <GitFork size={12} /> Split project
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="ad-project-controls">
                        <span className="ad-control-label">
                          Archive visibility
                        </span>
                        <button
                          disabled={busy}
                          className="ad-visibility-switch"
                          role="switch"
                          aria-checked={visibility[b.id] === true}
                          aria-label={`Show ${b.code} in project archive`}
                          onClick={() =>
                            changeVisibility([b.id], visibility[b.id] !== true)
                          }
                        >
                          <span>
                            {visibility[b.id] === true ? "Visible" : "Hidden"}
                          </span>
                          <span className="ad-switch-track" aria-hidden="true">
                            <span />
                          </span>
                        </button>
                        <span className="ad-control-label">Team editing</span>
                        <button
                          disabled={busy || submissionDeadline.closed}
                          className="ad-visibility-switch"
                          role="switch"
                          aria-checked={!submissionDeadline.closed && editingPermissions[b.id] === true}
                          aria-label={`Allow editing for ${b.code}`}
                          title={submissionDeadline.closed ? "The cohort submission deadline has passed." : undefined}
                          onClick={() =>
                            changeEditing(
                              [b.id],
                              editingPermissions[b.id] !== true
                            )
                          }
                        >
                          <span>
                            {submissionDeadline.closed ? "Deadline passed" : editingPermissions[b.id] === true
                              ? "Allowed"
                              : "Locked"}
                          </span>
                          <span className="ad-switch-track" aria-hidden="true">
                            <span />
                          </span>
                        </button>
                        {useLiveBackend && (
                          <button
                            className="ad-delete-link ad-assignment-link"
                            onClick={() =>
                              setRecordAction({
                                kind: "project",
                                id: b.id,
                                label: b.code,
                                remove: true,
                              })
                            }
                          >
                            <Trash2 size={14} /> Delete project
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
                {!filteredBoards.length && (
                  <div className="ad-empty">
                    <p>
                      {boards.length
                        ? "No matching projects."
                        : `No projects in ${year} yet.`}
                    </p>
                    <button
                      className="ad-button"
                      onClick={() => {
                        if (!boards.length) {
                          setProjectEditor("new")
                          return
                        }
                        setProjectQuery("")
                        setProjectStatus("")
                      }}
                    >
                      {boards.length
                        ? "Reset filters"
                        : "Add the first project"}
                    </button>
                  </div>
                )}
              </div>
            </section>
          ) : view === "trash" ? (
            <Trash onAction={setRecordAction} />
          ) : (
            <div className="ad-setup">
              <p className="ad-notice">
                {useLiveBackend
                  ? backend.error ||
                    "Using Supabase. Access is checked by the database."
                  : "Workspace data is saved on this device. Live accounts and email delivery remain off until Supabase setup is complete."}
              </p>
              <article>
                <ShieldCheck size={23} />
                <div>
                  <h2>Accounts and project access</h2>
                  <p>
                    Supabase Auth handles sign-in. Database policies let each
                    participant update only their assigned project. Admin
                    permissions stay on the server. Mentors can read only their
                    assigned projects and cannot edit student submissions.
                  </p>
                  <a
                    href="https://supabase.com/docs/guides/auth/passwords"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Supabase password authentication <ArrowUpRight size={14} />
                  </a>
                </div>
                <span>
                  {supabase
                    ? useLiveBackend && backend.ready
                      ? "Connected"
                      : "Key configured"
                    : "Not configured"}
                </span>
              </article>
              <article>
                <Mail size={23} />
                <div>
                  <h2>Invitation delivery</h2>
                  <p>
                    Sender: myresearchguide.org@gmail.com. Configure custom SMTP
                    in Supabase with a Gmail app password, then test delivery to
                    a committee address before inviting teams.
                  </p>
                  <p>
                    Participants and mentors receive separate invitations with
                    a private six-character access code. A code stays valid
                    until the committee issues a replacement.
                  </p>
                </div>
                <span>Verify SMTP</span>
              </article>
              <article>
                <UsersRound size={23} />
                <div>
                  <h2>Mentor access</h2>
                  <p>
                    Add or import mentors in the Mentors tab and choose the
                    projects they supervise. Review the assignments, then send
                    access codes when ready. Mentors can review assigned hidden
                    projects without editing student work.
                  </p>
                </div>
                <span>{useLiveBackend && backend.ready && !backend.mentorError ? "Connected" : "Setup needed"}</span>
              </article>
              <article>
                <Users size={23} />
                <div>
                  <h2>Committee access</h2>
                  <p>
                    Set up the admin account in Supabase, then grant its
                    administrator role from a secure server process. Participant
                    invitations must never grant admin access.
                  </p>
                  <p>Admin passwords are handled by Supabase Auth.</p>
                </div>
                <span>
                  {useLiveBackend && backend.isAdmin
                    ? "Connected"
                    : "Not connected"}
                </span>
              </article>
            </div>
          )}
        </main>
      </div>
      <SignOutDialog
        open={signOutOpen}
        onOpenChange={(open) => { if (!signingOut) setSignOutOpen(open) }}
        onConfirm={() => void signOut()}
        busy={busy || signingOut}
        unsaved={false}
        error={busy ? "Please wait for the current update to finish." : signOutError}
      />
      {recordAction && (
        <RecordActionDialog
          key={`${recordAction.kind}-${recordAction.id}`}
          action={recordAction}
          onClose={() => setRecordAction(null)}
          onComplete={() => {
            // The table reconciles selected IDs against the current roster.
            setNotice(
              `${recordAction.label} ${recordAction.remove ? "moved to Trash" : "restored"}.`
            )
            setRecordAction(null)
          }}
        />
      )}
      <ParticipantImport
        key={`import-${year}`}
        boards={boards}
        year={year}
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(count) => {
          setAdding(false)
          setNotice(
            `${count} participants added. Select them to prepare invitations.`
          )
        }}
      />
      {splitting && (
        <SplitProjectDialog
          board={splitting}
          onClose={() => setSplitting(null)}
          onCreated={(codes) => {
            setSplitting(null)
            setNotice(
              `${codes.join(" and ")} created and hidden from the archive. Add or re-invite participants to their assigned page.`
            )
          }}
        />
      )}
      {(editedPerson || addingSingle) && (
        <ParticipantEditor
          key={editedPerson?.id || "new"}
          person={editedPerson}
          cohortYear={year}
          initialProjectId={project}
          onClose={() => {
            setEditing(null)
            setAddingSingle(false)
          }}
          onInvite={setConfirmInvites}
          onSaved={() => {
            setEditing(null)
            setAddingSingle(false)
            setNotice(
              editedPerson
                ? "Participant details saved."
                : "Participant added. Select them to send an access code."
            )
          }}
        />
      )}
      {newCohort && (
        <NewCohortDialog
          cohorts={cohorts}
          onClose={() => setNewCohort(false)}
          onCreated={(value) => {
            selectCohort(value)
            setNewCohort(false)
            setView("projects")
            setNotice(
              `Cohort ${value} created. Add its first project to get started.`
            )
          }}
        />
      )}
      {projectEditor && (
        <ProjectEditor
          year={year}
          board={projectEditor === "new" ? undefined : projectEditor}
          onClose={() => setProjectEditor(null)}
          onSaved={(id, code) => {
            setProjectEditor(null)
            setView("projects")
            setProjectQuery("")
            setProjectStatus("")
            setNotice(
              projectEditor === "new"
                ? `${code} created in ${year}. Hidden in the archive and editing locked. Open Team to add participants.`
                : `${code} details saved.`
            )
            setProject(id)
          }}
        />
      )}
      {confirmInvites.length > 0 && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirmInvites([])
          }}
        >
          <DialogContent className="ad-modal">
            <DialogTitle>Send access codes?</DialogTitle>
            <DialogDescription>
              Send a private code to {confirmInvites.length} participant
              {confirmInvites.length === 1 ? "" : "s"}. Any existing codes for
              these accounts will be replaced.
            </DialogDescription>
            <div className="ad-invite-list">
              {people
                .filter((person) => confirmInvites.includes(person.id))
                .map((person) => (
                  <div key={person.id}>
                    <strong>{person.name}</strong>
                    <span>{person.email}</span>
                  </div>
                ))}
            </div>
            <div className="ad-modal-actions">
              <button
                className="ad-button"
                onClick={() => setConfirmInvites([])}
              >
                Cancel
              </button>
              <button
                className="ad-button ad-primary"
                onClick={() => {
                  const ids = confirmInvites
                  setConfirmInvites([])
                  void prepare(ids)
                }}
              >
                <Mail size={15} /> Send codes
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {invitedPerson && (
        <Invitation
          person={invitedPerson}
          onClose={() => setInvitation(null)}
          onRegenerate={() => prepareInvitations([invitedPerson.id])}
        />
      )}
    </div>
  )
}

function Invitation({
  person,
  onClose,
  onRegenerate,
}: {
  person: Assignment
  onClose: () => void
  onRegenerate: () => void
}) {
  const boards = useProjectBoards()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const board = boards.find((b) => b.id === person.projectId)!
  const active = Boolean(person.code && !person.revoked)
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="ad-modal ad-email">
        <DialogTitle>Invitation preview</DialogTitle>
        <DialogDescription>
          Draft only. Email delivery is not configured for this workspace.
        </DialogDescription>
        <dl>
          <div>
            <dt>From</dt>
            <dd>MYSSP · myresearchguide.org@gmail.com</dd>
          </div>
          <div>
            <dt>To</dt>
            <dd>{person.email}</dd>
          </div>
          <div>
            <dt>Subject</dt>
            <dd>Your MYSSP project access · {board.code}</dd>
          </div>
        </dl>
        <div className="ad-email-body">
          <img src="/myssp-icon.png" width="32" alt="" />
          <h2>Your project is ready.</h2>
          <p>Hi {person.name || "there"}, you have been invited to edit:</p>
          <strong>
            {board.code} · {board.title}
          </strong>
          <p>Sign in with this email address and your access code.</p>
          <div className="ad-code">
            {active ? person.code : "No active code"}
          </div>
          <small>
            {active
              ? "This code stays valid until the committee replaces it. Do not share it."
              : "Generate an access code to sign in."}
          </small>
        </div>
        <div className="ad-modal-actions">
          <button
            className="ad-button"
            disabled={!active}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(person.code!)
                setCopied(true)
                setError("")
              } catch {
                setError("Could not copy. Select and copy the code above.")
              }
            }}
          >
            {copied ? <CheckCheck size={15} /> : <Copy size={15} />}{" "}
            {copied ? "Copied" : "Copy code"}
          </button>
          {active ? (
            <a
              className="ad-button ad-primary"
              href="#/project-archive/workspace"
              onClick={onClose}
            >
              Try participant sign-in <ArrowUpRight size={15} />
            </a>
          ) : (
            <button
              className="ad-button ad-primary"
              onClick={() => {
                setCopied(false)
                onRegenerate()
              }}
            >
              Generate new code
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="ad-error">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
