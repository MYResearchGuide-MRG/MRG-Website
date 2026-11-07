import { useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { ArrowUpRight, Check, Download, Mail, Pencil, Plus, Search, Upload, UsersRound } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { Board } from "../projectboard/data"
import { boardUrl } from "../projectboard/paths"
import { useLiveBackend } from "./backend"
import { importMentors, inviteMentors, previewMentorCode, saveMentor, useMentorAccess } from "./mentor-access"
import { mentorCsvTemplate, mentorInputError, parseMentorCsv, type Mentor, type MentorInput } from "./mentor-model"
import "./mentors.css"

const blank: MentorInput = { name: "", email: "", affiliation: "", projectIds: [], revoked: false }

export function MentorManagement({ boards, year }: { boards: Board[]; year: number }) {
  const { mentors, error: setupError } = useMentorAccess()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [scope, setScope] = useState<"cohort" | "all">("cohort")
  const [editing, setEditing] = useState<Mentor | "new" | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [confirmIds, setConfirmIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [previewId, setPreviewId] = useState<string | null>(null)
  const cohortMentors = mentors.filter(mentor => mentor.projectIds.some(id => boards.some(board => board.id === id && board.year === year)))
  const listed = (scope === "all" ? mentors : cohortMentors).filter(mentor => {
    const haystack = `${mentor.name} ${mentor.email} ${mentor.affiliation} ${mentor.projectIds.map(id => boards.find(board => board.id === id)?.code || "").join(" ")}`.toLowerCase()
    return haystack.includes(query.toLowerCase().trim()) && (filter === "all" || (filter === "active" ? !mentor.revoked : filter === "not-invited" ? !mentor.invitedAt : mentor.revoked))
  })
  const selectable = listed.filter(mentor => !mentor.revoked)
  const selectedHere = selectable.filter(mentor => selected.includes(mentor.id))
  const allSelected = selectable.length > 0 && selectable.every(mentor => selected.includes(mentor.id))
  const invitees = mentors.filter(mentor => confirmIds.includes(mentor.id) && !mentor.revoked)

  async function send() {
    if (!invitees.length || busy) return
    setBusy(true)
    setConfirmIds([])
    try {
      const result = await inviteMentors(invitees.map(mentor => mentor.id))
      setSelected([])
      setNotice(useLiveBackend
        ? `${result.sent} mentor invitation${result.sent === 1 ? "" : "s"} sent.${result.failed ? ` ${result.failed} failed; review the addresses and try again.` : ""}`
        : `${"drafts" in result ? result.drafts : invitees.length} local invitation${invitees.length === 1 ? "" : "s"} prepared. No email was sent.`)
      if (!useLiveBackend && invitees.length === 1) setPreviewId(invitees[0].id)
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Could not send mentor invitations.") }
    finally { setBusy(false) }
  }

  return <section className="am-root" aria-label="Mentor accounts">
    {setupError && <p className="ad-notice" role="status">{setupError}</p>}
    {notice && <p className="ad-feedback" role="status"><Check size={15} aria-hidden />{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></p>}
    <div className="am-summary">
      <span><strong>{cohortMentors.length}</strong> mentors assigned to {year}</span>
      <span><strong>{cohortMentors.filter(mentor => mentor.invitedAt && !mentor.revoked).length}</strong> invited</span>
      <span><strong>{cohortMentors.filter(mentor => !mentor.revoked).length}</strong> active</span>
    </div>
    <div className="am-toolbar">
      <label className="am-search"><Search size={16} aria-hidden /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email or project" aria-label="Search mentors" /></label>
      <select aria-label="Mentor cohort" value={scope} onChange={event => setScope(event.target.value as "cohort" | "all")}><option value="cohort">{year} cohort</option><option value="all">All cohorts</option></select>
      <select aria-label="Filter mentors" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All mentors</option><option value="active">Active</option><option value="not-invited">Not invited</option><option value="revoked">Access paused</option></select>
      <button className="ad-button" onClick={() => setImportOpen(true)}><Upload size={15} aria-hidden /> Import CSV</button>
      <button className="ad-button ad-primary" onClick={() => setEditing("new")}><Plus size={15} aria-hidden /> Add mentor</button>
    </div>
    {selectedHere.length > 0 && <div className="am-selection"><span>{selectedHere.length} selected</span><button className="ad-button" disabled={busy} onClick={() => setConfirmIds(selectedHere.map(mentor => mentor.id))}><Mail size={15} aria-hidden /> Send access codes</button><button onClick={() => setSelected([])}>Clear</button></div>}
    <div className="am-table-wrap">
      <table className="am-table"><thead><tr><th><input type="checkbox" aria-label="Select all filtered mentors" checked={allSelected} disabled={!selectable.length} onChange={() => setSelected(allSelected ? selected.filter(id => !listed.some(mentor => mentor.id === id)) : [...new Set([...selected, ...selectable.map(mentor => mentor.id)])])} /></th><th>Mentor</th><th>Assigned projects</th><th>Access</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {listed.map(mentor => <tr key={mentor.id}>
          <td><input type="checkbox" aria-label={`Select ${mentor.name}`} checked={selected.includes(mentor.id)} disabled={mentor.revoked} onChange={() => setSelected(selected.includes(mentor.id) ? selected.filter(id => id !== mentor.id) : [...selected, mentor.id])} /></td>
          <td><strong>{mentor.name}</strong><span>{mentor.affiliation || "Affiliation not added"}</span><span className="am-email">{mentor.email}</span></td>
          <td><div className="am-project-links">{mentor.projectIds.map(id => { const board = boards.find(board => board.id === id); return board ? <a key={id} href={boardUrl(id)} title={board.title}>{board.code} <ArrowUpRight size={12} aria-hidden /></a> : <span key={id}>Unassigned project</span> })}</div></td>
          <td><span className={`am-status ${mentor.revoked ? "am-status-muted" : ""}`}><i />{mentor.revoked ? "Paused" : mentor.invitedAt ? "Invited" : "Not invited"}</span></td>
          <td><div className="am-actions"><button aria-label={`Edit ${mentor.name}`} onClick={() => setEditing(mentor)}><Pencil size={15} aria-hidden /> Edit</button><button disabled={busy || mentor.revoked} onClick={() => setConfirmIds([mentor.id])}><Mail size={15} aria-hidden /> {mentor.invitedAt ? "Reissue" : "Invite"}</button></div></td>
        </tr>)}
      </tbody></table>
      {!listed.length && <div className="am-empty"><UsersRound size={24} aria-hidden /><h2>{cohortMentors.length || scope === "all" ? "No mentors match these filters" : `No mentors assigned to ${year}`}</h2><p>Add a mentor and select the projects they supervise. Invitations are sent separately.</p><button className="ad-button" onClick={() => setEditing("new")}>Add mentor</button>{scope === "cohort" && mentors.length > cohortMentors.length && <button className="ad-button" onClick={() => setScope("all")}>View all cohorts</button>}</div>}
    </div>
    {editing && <MentorEditor key={editing === "new" ? "new" : editing.id} mentor={editing === "new" ? undefined : editing} boards={boards} year={year} existing={mentors} onClose={() => setEditing(null)} onSaved={() => { setNotice(editing === "new" ? "Mentor added. Send an invitation when ready." : "Mentor details saved."); setEditing(null) }} />}
    {importOpen && <MentorImport boards={boards.filter(board => board.year === year)} existing={mentors} onClose={() => setImportOpen(false)} onImported={count => { setImportOpen(false); setNotice(`${count} mentors added. Review assignments before sending invitations.`) }} />}
    {confirmIds.length > 0 && <Dialog open onOpenChange={open => { if (!open) setConfirmIds([]) }}><DialogContent className="ad-modal am-dialog"><DialogTitle>{invitees.some(mentor => mentor.invitedAt) ? "Send new access codes?" : "Invite mentors?"}</DialogTitle><DialogDescription>{useLiveBackend ? "Each mentor receives a private six-character code by email. Sending again replaces their existing code." : "This local preview prepares test codes only. No email will be sent."}</DialogDescription><div className="am-confirm-list">{invitees.map(mentor => <div key={mentor.id}><strong>{mentor.name}</strong><span>{mentor.email}</span></div>)}</div><div className="ad-modal-actions"><button className="ad-button" onClick={() => setConfirmIds([])}>Cancel</button><button className="ad-button ad-primary" disabled={busy || !invitees.length} onClick={() => void send()}><Mail size={15} aria-hidden /> {useLiveBackend ? "Send codes" : "Prepare codes"}</button></div></DialogContent></Dialog>}
    {previewId && !useLiveBackend && <Dialog open onOpenChange={open => { if (!open) setPreviewId(null) }}><DialogContent className="ad-modal am-dialog"><DialogTitle>Local mentor sign-in</DialogTitle><DialogDescription>Use this code to test the mentor view in this browser. No email was sent.</DialogDescription><p className="am-preview-code">{previewMentorCode(previewId)}</p><p className="am-hint">The code remains valid until you prepare a new one.</p><div className="ad-modal-actions"><button className="ad-button ad-primary" onClick={() => setPreviewId(null)}>Done</button></div></DialogContent></Dialog>}
  </section>
}

function MentorEditor({ mentor, boards, year, existing, onClose, onSaved }: { mentor?: Mentor; boards: Board[]; year: number; existing: Mentor[]; onClose: () => void; onSaved: () => void }) {
  const [input, setInput] = useState<MentorInput>(mentor ? {name:mentor.name,email:mentor.email,affiliation:mentor.affiliation,projectIds:mentor.projectIds,revoked:mentor.revoked} : blank)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [projectQuery, setProjectQuery] = useState("")
  const shown = boards.filter(board => board.year === year || input.projectIds.includes(board.id)).filter(board => `${board.code} ${board.title}`.toLowerCase().includes(projectQuery.toLowerCase()))
  async function submit(event: FormEvent) {
    event.preventDefault()
    const validation = mentorInputError(input, boards, existing, mentor?.id)
    if (validation) { setError(validation); return }
    setSaving(true); setError("")
    try { await saveMentor(input, mentor?.id); onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save mentor.") }
    finally { setSaving(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose() }}><DialogContent className="ad-modal am-dialog am-editor"><DialogTitle>{mentor ? "Edit mentor" : "Add mentor"}</DialogTitle><DialogDescription>Set the account details and the projects this mentor can review.</DialogDescription><form onSubmit={event => void submit(event)}>
    <div className="am-field-pair"><label>Name<input required maxLength={100} value={input.name} onChange={event => setInput({...input,name:event.target.value})} placeholder="Full name" /></label><label>Email address<input required type="email" value={input.email} disabled={Boolean(mentor?.invitedAt)} onChange={event => setInput({...input,email:event.target.value})} placeholder="mentor@example.com" /></label></div>
    {mentor?.invitedAt && <p className="am-hint">To change a signed-in mentor’s email, pause this account and add a new one.</p>}
    <label>Affiliation<input maxLength={180} value={input.affiliation} onChange={event => setInput({...input,affiliation:event.target.value})} placeholder="University or organisation" /></label>
    <div className="am-project-picker"><div className="am-picker-head"><strong>Projects this mentor can review</strong><span>{input.projectIds.length} selected</span></div><input aria-label="Find a project" value={projectQuery} onChange={event => setProjectQuery(event.target.value)} placeholder="Find a project by code or title" /><div className="am-project-options">{shown.map(board => <label key={board.id}><input type="checkbox" checked={input.projectIds.includes(board.id)} onChange={() => setInput({...input,projectIds: input.projectIds.includes(board.id) ? input.projectIds.filter(id => id !== board.id) : [...input.projectIds,board.id]})} /><span className="am-project-option-code">{board.code}</span><span>{board.title}<small>{board.year} cohort</small></span></label>)}</div></div>
    {mentor && <label className="am-pause"><input type="checkbox" checked={input.revoked} onChange={event => setInput({...input,revoked:event.target.checked})} /><span><strong>Pause mentor access</strong><small>The mentor cannot open assigned private projects until access is restored.</small></span></label>}
    {error && <p className="ad-error" role="alert">{error}</p>}
    <div className="ad-modal-actions"><button type="button" className="ad-button" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" className="ad-button ad-primary" disabled={saving}>{saving ? "Saving…" : "Save mentor"}</button></div>
  </form></DialogContent></Dialog>
}

function MentorImport({ boards, existing, onClose, onImported }: { boards: Board[]; existing: Mentor[]; onClose: () => void; onImported: (count: number) => void }) {
  const [text, setText] = useState("")
  const [filename, setFilename] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const rows = useMemo(() => parseMentorCsv(text, boards, existing), [text, boards, existing])
  const errors = rows.filter(row => row.error)
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""
    if (!file) return
    if (!/\.(csv|tsv)$/i.test(file.name) || file.size > 1_048_576) { setError("Choose a CSV or TSV file smaller than 1 MB."); return }
    setText(await file.text()); setFilename(file.name); setError("")
  }
  function download() {
    const url = URL.createObjectURL(new Blob([mentorCsvTemplate], {type:"text/csv;charset=utf-8"}))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "myssp-mentors-template.csv"; anchor.click(); URL.revokeObjectURL(url)
  }
  async function commit() {
    if (!rows.length || errors.length || busy) return
    setBusy(true); setError("")
    try { await importMentors(rows); onImported(rows.length) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not import mentors.") }
    finally { setBusy(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent className="ad-modal am-dialog am-import"><DialogTitle>Import mentors</DialogTitle><DialogDescription>Use one row per mentor. Separate multiple project codes with semicolons. Review every row before saving.</DialogDescription>
    <div className="am-import-tools"><label className="ad-button"><Upload size={15} aria-hidden />{filename || "Choose CSV file"}<input type="file" accept=".csv,.tsv" className="sr-only" onChange={event => void readFile(event)} /></label><button className="ad-button" onClick={download}><Download size={15} aria-hidden /> CSV template</button></div>
    <p className="am-hint">Columns: <code>name,email,affiliation,project_codes</code></p><textarea aria-label="Paste mentor CSV rows" rows={5} spellCheck={false} value={text} onChange={event => { setText(event.target.value); setFilename(""); setError("") }} placeholder={mentorCsvTemplate.replaceAll("\r", "")} />
    {rows.length > 0 && <div className="am-import-review"><strong>{rows.length} row{rows.length === 1 ? "" : "s"}</strong><span>{errors.length ? `${errors.length} need changes` : "Ready to import"}</span><div>{rows.slice(0, 100).map(row => <p key={row.line}><span>{row.name || `Row ${row.line}`}<small>{row.email}</small></span><span>{row.error || row.projectIds.map(id => boards.find(board => board.id === id)?.code).join(", ")}</span></p>)}</div></div>}
    {rows.length > 100 && <p className="ad-error" role="alert">Import up to 100 mentors at a time.</p>}{error && <p className="ad-error" role="alert">{error}</p>}
    <div className="ad-modal-actions"><button className="ad-button" disabled={busy} onClick={onClose}>Cancel</button><button className="ad-button ad-primary" disabled={busy || !rows.length || rows.length > 100 || errors.length > 0} onClick={() => void commit()}>{busy ? "Importing…" : `Import ${rows.length || ""} mentor${rows.length === 1 ? "" : "s"}`}</button></div>
  </DialogContent></Dialog>
}
