import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCheck,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  GitFork,
  Mail,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Board } from "../projectboard/data"
import { canSplitProject, useProjectBoards } from "./project-registry"
import { SplitProjectDialog } from "./SplitProjectDialog"
import {
  accessStatus,
  parseParticipants,
  participantCsvTemplate,
  type Assignment,
} from "./access-model"
import {
  addParticipants,
  isLocalPreview,
  prepareInvitations,
  updateAssignment,
  useDemoAccess,
} from "./demo-access"
import "./admin.css"
import { AdminSignIn } from "./AdminSignIn"
import { useProjectEditing, setProjectEditing } from "./project-editing"
import { useBackend, useLiveBackend, signOutLive, inviteLiveParticipants } from "./backend"
import { supabase } from "@/lib/supabase"
import {
  setLibraryVisibility,
  useLibraryVisibility,
} from "./library-visibility"

type View = "participants" | "projects" | "setup"
export default function AdminPanel() {
  const boards = useProjectBoards()
  const [splitting, setSplitting] = useState<Board | null>(null)
  const { people } = useDemoAccess()
  const visibility = useLibraryVisibility()
  const editingPermissions = useProjectEditing()
  const backend = useBackend()
  const [busy, setBusy] = useState(false)
  const visibleCount = boards.filter((b) => visibility[b.id] === true).length
  const [entered, setEntered] = useState(false)
  const [view, setView] = useState<View>("participants")
  const [query, setQuery] = useState("")
  const [project, setProject] = useState("")
  const [status, setStatus] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const filtered = people.filter(
    (p) =>
      (!query ||
        `${p.email} ${p.name}`.toLowerCase().includes(query.toLowerCase())) &&
      (!project || p.projectId === project) &&
      (!status || accessStatus(p, now) === status)
  )
  const chosen = people.filter((p) => selected.includes(p.id) && !p.revoked)
  const invitedPerson = people.find((p) => p.id === invitation)
  const editedPerson = people.find((p) => p.id === editing)
  async function prepare(ids: string[]) {
    if (useLiveBackend) {
      setBusy(true)
      try {
        const result = await inviteLiveParticipants(ids)
        setNotice(`${result.sent} access code${result.sent === 1 ? "" : "s"} sent.${result.failed ? ` ${result.failed} could not be sent. Check Setup before retrying.` : ""}`)
      } catch(error) { setNotice(error instanceof Error ? error.message : "Could not send access codes.") }
      finally { setBusy(false) }
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
    setQuery("")
    setStatus("")
    setSelected([])
  }
  async function changeVisibility(ids: string[], visible: boolean) {
    const saved = await setLibraryVisibility(ids, visible)
    setNotice(
      saved
        ? `${ids.length === boards.length ? "All projects are" : "Project is"} now ${visible ? "visible in" : "hidden from"} the research library.`
        : "Could not save visibility. Check that browser storage is available and try again."
    )
  }
  async function changeEditing(ids: string[], allowed: boolean) {
    const saved = await setProjectEditing(ids, allowed)
    setNotice(saved ? `Editing ${allowed ? "enabled" : "locked"} for ${ids.length} project${ids.length === 1 ? "" : "s"}.` : "Could not update editing access.")
  }
  if (useLiveBackend ? !backend.isAdmin : !isLocalPreview || !entered)
    return (
      <main className="ad-root ad-gate">
        <a href="#/" className="ad-back">
          <ArrowLeft size={16} /> Back to MYSSP
        </a>
        <div className="ad-gate-card">
          <img src="/myssp-icon.png" alt="" width="42" />
          <h1>Committee workspace</h1>
          <p>Manage participant access and project assignments.</p>
          <AdminSignIn onSuccess={() => setEntered(true)} onDevice={() => setEntered(true)} />
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
        <a className="ad-back" href="#/projectboard">
          View research library <ArrowUpRight size={15} />
        </a>
      </header>
      <div className="ad-shell">
        <aside className="ad-sidebar">
          <div className="ad-cohort">
            <span>MYSSP 2026</span>
            <small>Programme administration</small>
          </div>
          <nav aria-label="Admin navigation">
            {(
              [
                { id: "participants", label: "Participants", Icon: Users },
                { id: "projects", label: "Projects", Icon: FolderOpen },
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
                {id === "participants" && <span>{people.length}</span>}
              </button>
            ))}
          </nav>
          <button className="ad-exit" onClick={() => { setEntered(false); if (useLiveBackend) void signOutLive() }}>
            <ArrowLeft size={15} /> Sign out
          </button>
        </aside>
        <main className="ad-main" key={view}>
          <div className="ad-page-head">
            <div>
              <p className="ad-breadcrumb">
                MYSSP 2026 /{" "}
                {view === "setup" ? "Configuration" : "Access management"}
              </p>
              <h1>
                {view === "participants"
                  ? "Participants"
                  : view === "projects"
                    ? "Projects"
                    : "Setup"}
              </h1>
              <p>
                {view === "participants"
                  ? "Manage accounts, project assignments and invitations."
                  : view === "projects"
                    ? "Control library visibility and team editing separately."
                    : "Database, sign-in and email delivery."}
              </p>
            </div>
            {view === "participants" && (
              <button
                className="ad-button ad-primary"
                onClick={() => setAdding(true)}
              >
                <Plus size={17} /> Add participants
              </button>
            )}
          </div>
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
          {view === "participants" ? (
            <>
              <div className="ad-summary">
                <span>
                  <strong>{people.length}</strong> participants
                </span>
                <span>
                  <strong>
                    {
                      new Set(
                        people.filter((p) => !p.revoked).map((p) => p.projectId)
                      ).size
                    }
                  </strong>{" "}
                  assigned projects
                </span>
                <span>
                  <strong>
                    {
                      people.filter((p) => (useLiveBackend ? p.invitedAt : p.usedAt !== null) && !p.revoked)
                        .length
                    }
                  </strong>{" "}
                  {useLiveBackend ? "invited" : "signed in"}
                </span>
              </div>
              <section
                className="ad-table-panel"
                aria-label="Participant management"
              >
                <div className="ad-toolbar">
                  <label className="ad-search">
                    <Search size={17} />
                    <input
                      aria-label="Search participants"
                      placeholder="Search name or email"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Filter by project"
                    value={project}
                    onChange={(e) => {
                      setProject(e.target.value)
                      setSelected([])
                    }}
                  >
                    <option value="">All projects</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by access status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value)
                      setSelected([])
                    }}
                  >
                    <option value="">All statuses</option>
                    {[
                      "Not invited",
                      "Invited",
                      "Code ready",
                      "Signed in",
                      "Temporarily locked",
                      "Revoked",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {selected.length > 0 && (
                  <div className="ad-selection">
                    <span>{selected.length} selected</span>
                    <button
                      disabled={!chosen.length || busy}
                      onClick={() => prepare(chosen.map((p) => p.id))}
                    >
                      <Mail size={15} /> {busy ? "Sending…" : useLiveBackend ? "Send or replace access codes" : "Prepare invitations"}
                    </button>
                    <button onClick={() => setSelected([])}>Clear</button>
                  </div>
                )}
                <div className="ad-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th className="ad-check-cell">
                          <input
                            type="checkbox"
                            aria-label="Select all visible participants"
                            disabled={!filtered.length}
                            checked={
                              filtered.length > 0 &&
                              filtered.every((p) => selected.includes(p.id))
                            }
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? filtered.map((p) => p.id)
                                  : []
                              )
                            }
                          />
                        </th>
                        <th>Participant</th>
                        <th>Project</th>
                        <th>Access</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => {
                        const state = accessStatus(p, now)
                        return (
                          <tr key={p.id}>
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`Select ${p.email}`}
                                checked={selected.includes(p.id)}
                                onChange={(e) =>
                                  setSelected(
                                    e.target.checked
                                      ? [...selected, p.id]
                                      : selected.filter((id) => id !== p.id)
                                  )
                                }
                              />
                            </td>
                            <td>
                              <div className="ad-person">
                                <span className="ad-avatar">
                                  {(p.name || p.email)
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                                <div>
                                  <strong>
                                    {p.name || p.email.split("@")[0]}
                                  </strong>
                                  <small>{p.email}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="ad-project-code">
                                {boards.find((b) => b.id === p.projectId)?.code}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`ad-status ${state === "Signed in" ? "ad-status-active" : ""}`}
                              >
                                <i />
                                {state}
                              </span>
                            </td>
                            <td className="ad-row-actions">
                              <button onClick={() => setEditing(p.id)}>
                                Manage
                              </button>
                              {p.code && !p.revoked ? (
                                <button
                                  aria-label={`Preview invitation for ${p.email}`}
                                  onClick={() => setInvitation(p.id)}
                                >
                                  <Mail size={16} />
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {!filtered.length && (
                  <div className="ad-empty">
                    <Users size={29} />
                    <h2>
                      {people.length
                        ? "No participants match"
                        : "Your participant list starts here"}
                    </h2>
                    <p>
                      {people.length
                        ? "Try another search or clear your filters."
                        : "Paste a list of emails and choose which project each person can edit."}
                    </p>
                    {!people.length && (
                      <button
                        className="ad-button"
                        onClick={() => setAdding(true)}
                      >
                        Add your first participants <Plus size={16} />
                      </button>
                    )}
                  </div>
                )}
                <div className="ad-table-foot">
                  <span>
                    {filtered.length} of {people.length} participants
                  </span>
                  <span>Email + 6-character code</span>
                </div>
              </section>
              <p className="ad-help">
                Invitations are private. Public visitors can browse projects,
                but cannot edit them.
              </p>
            </>
          ) : view === "projects" ? (
            <section aria-label="Project visibility">
              <div className="ad-visibility-toolbar">
                <p aria-live="polite">
                  <strong>{visibleCount}</strong> of {boards.length} visible
                </p>
                <div>
                  <button
                    className="ad-button"
                    disabled={visibleCount === boards.length}
                    onClick={() =>
                      changeVisibility(
                        boards.map((b) => b.id),
                        true
                      )
                    }
                  >
                    <Eye size={15} /> Show all
                  </button>
                  <button
                    className="ad-button"
                    disabled={visibleCount === 0}
                    onClick={() =>
                      changeVisibility(
                        boards.map((b) => b.id),
                        false
                      )
                    }
                  >
                    <EyeOff size={15} /> Hide all
                  </button>
                  <button className="ad-button" onClick={() => changeEditing(boards.map(b=>b.id),false)}>Lock editing for all</button>
                </div>
              </div>
              <div className="ad-project-list">
                {boards.map((b) => {
                  const assigned = people.filter(
                    (p) => p.projectId === b.id && !p.revoked
                  )
                  return (
                    <article className="ad-project-row" key={b.id}>
                      <span className="ad-project-code">{b.code}</span>
                      <div className="ad-project-info">
                        <strong>{b.title}</strong>
                        <small>{b.mentor}</small>
                        <button
                          className="ad-assignment-link"
                          onClick={() => openProject(b.id)}
                          aria-label={`Manage ${b.code} participants`}
                        >
                          {assigned.length} assigned <ArrowUpRight size={12} />
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
                      <div className="ad-project-controls"><span className="ad-control-label">Library visibility</span><button
                        className="ad-visibility-switch"
                        role="switch"
                        aria-checked={visibility[b.id] === true}
                        aria-label={`Show ${b.code} in research library`}
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
                      <span className="ad-control-label">Team editing</span><button className="ad-visibility-switch" role="switch" aria-checked={editingPermissions[b.id] === true} aria-label={`Allow editing for ${b.code}`} onClick={() => changeEditing([b.id], editingPermissions[b.id] !== true)}>
                        <span>{editingPermissions[b.id] === true ? "Allowed" : "Locked"}</span><span className="ad-switch-track" aria-hidden="true"><span/></span>
                      </button></div>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : (
            <div className="ad-setup">
              <p className="ad-notice">{useLiveBackend ? backend.error || "Using Supabase. Access is checked by the database." : "Workspace data is saved on this device. Live accounts and email delivery remain off until Supabase setup is complete."}</p>
              <article>
                <ShieldCheck size={23} />
                <div>
                  <h2>Accounts and project access</h2>
                  <p>
                    Supabase Auth handles sign-in. Database policies let each
                    participant update only their assigned project. Admin
                    permissions stay on the server.
                  </p>
                  <a
                    href="https://supabase.com/docs/guides/auth/passwords"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Supabase password authentication <ArrowUpRight size={14} />
                  </a>
                </div>
                <span>{supabase ? useLiveBackend && backend.ready ? "Connected" : "Key configured" : "Not configured"}</span>
              </article>
              <article>
                <Mail size={23} />
                <div>
                  <h2>Invitation delivery</h2>
                  <p>
                    Sender: myresearchguide.org@gmail.com. Configure custom
                    SMTP in Supabase with a Gmail app password, then test
                    delivery to a committee address before inviting teams.
                  </p>
                  <p>
                    Each participant receives a private, six-character access code.
                    It stays valid until the committee issues a replacement.
                  </p>
                </div>
                <span>Verify SMTP</span>
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
                  <p>
                    Admin passwords are handled by Supabase Auth.
                  </p>
                </div>
                <span>{useLiveBackend && backend.isAdmin ? "Connected" : "Not connected"}</span>
              </article>
            </div>
          )}
        </main>
      </div>
      <BulkAdd
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
              `${codes.join(" and ")} created and hidden from the library. Add or re-invite participants to their assigned page.`
            )
          }}
        />
      )}
      {editedPerson && (
        <ManagePerson
          key={editedPerson.id}
          person={editedPerson}
          onClose={() => setEditing(null)}
          onPrepare={() => {
            setEditing(null)
            prepare([editedPerson.id])
          }}
          onChanged={() => {
            setEditing(null)
            setNotice(
              "Assignment updated. Project permissions take effect immediately."
            )
          }}
        />
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

function BulkAdd({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (count: number) => void
}) {
  const boards = useProjectBoards()
  const { people } = useDemoAccess()
  const [text, setText] = useState("")
  const [project, setProject] = useState(boards[0]?.id || "")
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState("")
  const rows = useMemo(
    () => parseParticipants(text, project, boards, people),
    [text, project, boards, people]
  )
  const invalid = rows.some((r) => r.error) || rows.length > 200
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <DialogContent className="ad-modal ad-import">
        <DialogTitle>Add participants</DialogTitle>
        <DialogDescription>
          Upload a CSV or paste spreadsheet rows. Review assignments before adding.
        </DialogDescription>
        <label>
          Default project
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} · {b.title}
              </option>
            ))}
          </select>
        </label>
        <div className="ad-csv-tools">
          <label className="ad-file-label">Upload CSV<input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={async e => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.size > 1048576) { setError("Use a CSV smaller than 1 MB."); return }
            try { setText(await file.text()); setError("") } catch { setError("Could not read this file.") }
            e.target.value = ""
          }}/></label>
          <button type="button" className="ad-button" onClick={() => {
            const url = URL.createObjectURL(new Blob([participantCsvTemplate], {type:"text/csv;charset=utf-8"}))
            const a = document.createElement("a"); a.href = url; a.download = "myssp-participants-template.csv"; a.click(); URL.revokeObjectURL(url)
          }}>Download CSV template</button>
        </div>
        <p className="ad-muted">Columns: <code>name,email,project_code</code>. Use codes such as A-1 or I-2A. Up to 200 people per import. Extra columns in a spreadsheet export are ignored.</p>
        <label>
          Participants
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError("")
            }}
            rows={5}
            placeholder={"alex@example.com\nSam Tan, sam@example.com, A-2"}
          />
        </label>
        <div className="ad-import-help">
          <span>
            Optional format: name, email, project code. Up to 200 rows.
          </span>
          <button
            onClick={() =>
              setText(
                "Alex Tan, alex@example.com, A-1\nSam Lee, sam@example.com, A-2\nJamie Lim, jamie@example.com, A-3"
              )
            }
          >
            Use sample list
          </button>
        </div>
        {rows.length > 0 && (
          <div className="ad-import-review">
            <strong>
              Review {rows.length} participant{rows.length === 1 ? "" : "s"}
            </strong>
            {rows.map((r) => (
              <div key={r.line} className={r.error ? "ad-error" : ""}>
                <span>{r.email || `Row ${r.line}`}</span>
                <span>
                  {r.error || boards.find((b) => b.id === r.projectId)?.code}
                </span>
              </div>
            ))}
          </div>
        )}
        {rows.length > 200 && (
          <p className="ad-error">Limit each import to 200 participants.</p>
        )}
        {error && (
          <p className="ad-error" role="alert">
            {error}
          </p>
        )}
        <div className="ad-modal-actions">
          <button className="ad-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="ad-button ad-primary"
            disabled={!rows.length || invalid || importing}
            onClick={async () => {
              setImporting(true)
              const added = await addParticipants(rows).catch(() => false)
              setImporting(false)
              if (added) {
                onAdded(rows.length)
                setText("")
              } else
                setError(
                  "Could not add participants. Review duplicates and project assignments."
                )
            }}
          >
            {importing ? "Adding…" : `Add ${rows.length || ""} participants`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ManagePerson({
  person,
  onClose,
  onPrepare,
  onChanged,
}: {
  person: Assignment
  onClose: () => void
  onPrepare: () => void
  onChanged: () => void
}) {
  const boards = useProjectBoards()
  const [project, setProject] = useState(person.projectId)
  const [revoked, setRevoked] = useState(person.revoked)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="ad-modal">
        <DialogTitle>Participant access</DialogTitle>
        <DialogDescription>
          {person.name || person.email}
          <br />
          {person.name ? person.email : ""}
        </DialogDescription>
        <label>
          Assigned project
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} · {b.title}
              </option>
            ))}
          </select>
        </label>
        <label className="ad-toggle">
          <input
            type="checkbox"
            checked={!revoked}
            onChange={(e) => setRevoked(!e.target.checked)}
          />{" "}
          Allow access to this project
        </label>
        <p className="ad-muted">
          Changes take effect on their next request. Their project content is kept.
        </p>
        <div className="ad-modal-actions">
          <button
            className="ad-button"
            disabled={
              person.revoked ||
              project !== person.projectId ||
              revoked !== person.revoked
            }
            onClick={onPrepare}
          >
            <Mail size={15} /> New invitation
          </button>
          <button
            className="ad-button ad-primary"
            disabled={
              saving || (project === person.projectId && revoked === person.revoked)
            }
            onClick={async () => {
              setSaving(true); setSaveError("")
              const saved = await updateAssignment(person.id, project, revoked).catch(() => false)
              setSaving(false)
              if (saved) onChanged()
              else setSaveError("Could not update this assignment. Please try again.")
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
        {saveError && <p className="ad-error" role="alert">{saveError}</p>}
      </DialogContent>
    </Dialog>
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
              href="#/projectboard/workspace"
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
