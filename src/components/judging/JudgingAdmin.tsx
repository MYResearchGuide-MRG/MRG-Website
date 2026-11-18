import { Fragment, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, CircleDashed, Download, Gavel, GripVertical, Lock, Mail, PencilLine, Pencil, Plus, RotateCcw, Search, Trash2, Upload, X } from "lucide-react"
import { Reorder, useDragControls, useReducedMotion } from "motion/react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { Board } from "../projectboard/data"
import { useLiveBackend } from "../admin/backend"
import { useCohorts } from "../admin/project-registry"
import { judgeKindLabels, missingAnswers, scoreKeys, type JudgeKind } from "./form"
import {
  criterionLabels, feedbackCsv, judgeCsvTemplate, judgeInputError, MAX_TOTAL, parseJudgeCsv, projectResult, rankResults, reviewTotal,
  type CommitteeJudge, type CommitteeReview, type JudgeInput,
} from "./judge-model"
import {
  discardReview, importJudges, inviteJudges, previewJudgeCode, saveJudge, setJudgeDeleted, setLineup, setSwitches,
  switchesFor, useCommitteeJudging,
} from "./judging-admin"
import "../admin/mentors.css"
import "./judging-admin.css"

type Section = "judges" | "lineup" | "results"
const errorText = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback

export function JudgingAdmin({ boards, year }: { boards: Board[]; year: number }) {
  const data = useCommitteeJudging()
  const [section, setSection] = useState<Section>("judges")
  const [notice, setNotice] = useState("")
  const lineup = (data.lineups[year] || []).map(id => boards.find(board => board.id === id)).filter((board): board is Board => Boolean(board))
  const cohortJudges = data.judges.filter(judge => judge.cohortYear === year && !judge.deletedAt)
  const lineupIds = new Set(lineup.map(board => board.id))
  const cohortReviews = data.reviews.filter(review => lineupIds.has(review.projectId))
  const lineupLocked = switchesFor(data, year).judgingOpen

  return <section className="am-root jd-root" aria-label="Judging">
    {data.error && <p className="ad-notice" role="status">{data.error}</p>}
    {notice && <p className="ad-feedback" role="status"><Check size={15} aria-hidden />{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></p>}
    <JudgingSwitches year={year} reviews={cohortReviews} judges={cohortJudges.filter(judge => !judge.revoked)} lineupSize={lineup.length} onNotice={setNotice} />
    <div className="jd-tabs" role="tablist" aria-label="Judging sections">
      {([["judges", `Judges · ${cohortJudges.length}`], ["lineup", `Lineup · ${lineup.length}`], ["results", "Progress & results"]] as const).map(([id, label]) =>
        <button key={id} role="tab" aria-selected={section === id} onClick={() => setSection(id)}>
          {label}{id === "lineup" && lineupLocked && <Lock size={12} className="jd-tab-lock" aria-label="locked" />}
        </button>)}
    </div>
    {section === "judges" ? <JudgeManagement year={year} reviews={cohortReviews} lineupSize={lineup.length} onNotice={setNotice} />
      : section === "lineup" ? <LineupEditor key={`${year}:${(data.lineups[year] || []).join()}`} locked={lineupLocked} year={year} boards={boards} saved={data.lineups[year] || []} reviews={cohortReviews} onNotice={setNotice} />
      : <Results year={year} lineup={lineup} judges={cohortJudges} allJudges={data.judges} reviews={cohortReviews} onNotice={setNotice} />}
  </section>
}

// Switches -----------------------------------------------------------------------------
function JudgingSwitches({ year, reviews, judges, lineupSize, onNotice }: { year: number; reviews: CommitteeReview[]; judges: CommitteeJudge[]; lineupSize: number; onNotice: (text: string) => void }) {
  const data = useCommitteeJudging()
  const current = switchesFor(data, year)
  const [confirm, setConfirm] = useState<"open-judging" | "release" | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const submitted = reviews.filter(review => review.submittedAt).length
  const drafts = reviews.length - submitted
  // Closing judging submits complete drafts automatically; only incomplete ones are lost.
  // Only drafts from active judges are submitted automatically.
  const activeJudges = new Set(judges.map(judge => judge.id))
  const incompleteDrafts = reviews.filter(review => !review.submittedAt && (missingAnswers(review).length || !activeJudges.has(review.judgeId))).length
  const completeDrafts = drafts - incompleteDrafts
  async function change(next: typeof current, message: string, then: typeof confirm = null) {
    setBusy(true); setError("")
    try { await setSwitches(year, next); onNotice(message); setConfirm(then) }
    catch (cause) { setError(errorText(cause, "Could not change judging status.")) }
    finally { setBusy(false) }
  }
  return <div className="jd-switches">
    <div className="jd-switch-card">
      <div><strong>Judging</strong><p>{current.judgingOpen ? "Judges can save and submit feedback." : "Judges can view their lineup but cannot save feedback."}</p></div>
      <Switch label="Judging open" checked={current.judgingOpen} disabled={busy}
        onChange={() => current.judgingOpen
          ? void change({ ...current, judgingOpen: false }, "Judging closed. Judges can no longer change feedback. The lineup can be edited again.")
          : setConfirm("open-judging")} />
    </div>
    <div className="jd-switch-card">
      <div><strong>Feedback to teams</strong><p>{current.feedbackReleased ? "Teams can see each anonymous review: every score and remark." : "Hidden from teams until you release it after the results announcement."}</p></div>
      <Switch label="Feedback released" checked={current.feedbackReleased} disabled={busy}
        onChange={() => current.feedbackReleased
          ? void change({ ...current, feedbackReleased: false }, "Feedback hidden from teams again.")
          : setConfirm("release")} />
    </div>
    {error && <p className="ad-error" role="alert">{error}</p>}
    {confirm === "open-judging" && <Dialog open onOpenChange={open => { if (!open && !busy) setConfirm(null) }}><DialogContent className="ad-modal am-dialog">
      <DialogTitle>Open judging?</DialogTitle>
      <DialogDescription>Judges will be able to save and submit feedback on every project in the lineup.</DialogDescription>
      <ul className="jd-checklist">
        {lineupSize === 0
          ? <li className="jd-warn">The lineup is empty. Add projects in the Lineup tab before opening judging.</li>
          : <li>{lineupSize} project{lineupSize === 1 ? "" : "s"} in the lineup, {judges.length} active judge{judges.length === 1 ? "" : "s"}.</li>}
        <li>The lineup locks while judging is open: no adding, removing or reordering projects. Close judging to change it.</li>
        {current.feedbackReleased && <li className="jd-warn">Feedback is hidden from teams again while judging is open. Release it again after you close judging.</li>}
      </ul>
      {error && <p className="ad-error" role="alert">{error}</p>}
      <div className="ad-modal-actions"><button className="ad-button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
        <button className="ad-button ad-primary" disabled={busy || lineupSize === 0} onClick={() => void change({ judgingOpen: true, feedbackReleased: false }, "Judging opened. Judges can now save and submit feedback. The lineup is locked.")}>{busy ? "Opening…" : "Open judging and lock lineup"}</button></div>
    </DialogContent></Dialog>}
    {confirm === "release" && <Dialog open onOpenChange={open => { if (!open && !busy) setConfirm(null) }}><DialogContent className="ad-modal am-dialog">
      <DialogTitle>{current.judgingOpen ? "Close judging and release feedback?" : "Release feedback to teams?"}</DialogTitle>
      <DialogDescription>Each team will see every submitted review in full, all eight scores and both section reviews, in random order. Reviews are labelled only “Main judge” or “Special award judge”; names stay hidden.</DialogDescription>
      <ul className="jd-checklist">
        <li>{submitted} submitted review{submitted === 1 ? "" : "s"} across {lineupSize} project{lineupSize === 1 ? "" : "s"} ({judges.length * lineupSize} expected).</li>
        {current.judgingOpen && <li>Judging is still open. Releasing closes it first, so no review can change once teams see it.</li>}
        {current.judgingOpen && completeDrafts > 0 && <li>{completeDrafts} complete draft{completeDrafts === 1 ? " is" : "s are"} not submitted yet. Closing judging submits {completeDrafts === 1 ? "it" : "them"} automatically.</li>}
        {incompleteDrafts > 0 && <li className="jd-warn">{incompleteDrafts} draft{incompleteDrafts === 1 ? " is" : "s are"} incomplete and won’t reach the team.</li>}
        <li>Discard any test reviews before releasing. Released reviews stay visible to teams, even if a judge is deleted later.</li>
      </ul>
      {error && <p className="ad-error" role="alert">{error}</p>}
      <div className="ad-modal-actions"><button className="ad-button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
        <button className="ad-button ad-primary" disabled={busy} onClick={() => void change({ judgingOpen: false, feedbackReleased: true }, current.judgingOpen ? "Judging closed and feedback released. Teams can now see it on their project page." : "Feedback released. Teams can now see it on their project page.")}>{busy ? "Releasing…" : current.judgingOpen ? "Close judging and release" : "Release feedback"}</button></div>
    </DialogContent></Dialog>}
  </div>
}

function Switch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: () => void }) {
  return <button className="ad-visibility-switch" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}>
    <span>{checked ? (label === "Judging open" ? "Open" : "Released") : (label === "Judging open" ? "Closed" : "Hidden")}</span>
    <span className="ad-switch-track" aria-hidden="true"><span /></span>
  </button>
}

// Judges -----------------------------------------------------------------------------------
const blankJudge = (year: number): JudgeInput => ({ name: "", email: "", affiliation: "", kind: "main", revoked: false, cohortYear: year })

function JudgeManagement({ year, reviews, lineupSize, onNotice }: { year: number; reviews: CommitteeReview[]; lineupSize: number; onNotice: (text: string) => void }) {
  const { judges } = useCommitteeJudging()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"cohort" | "all" | "deleted">("cohort")
  const [editing, setEditing] = useState<CommitteeJudge | "new" | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<CommitteeJudge | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [confirmIds, setConfirmIds] = useState<string[]>([])
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const shown = judges.filter(judge => (filter === "deleted" ? judge.deletedAt : !judge.deletedAt && (filter === "all" || judge.cohortYear === year))
    && `${judge.name} ${judge.email} ${judge.affiliation}`.toLowerCase().includes(query.trim().toLowerCase()))
  const selectable = shown.filter(judge => !judge.revoked && !judge.deletedAt)
  const selectedHere = selectable.filter(judge => selected.includes(judge.id))
  const allSelected = selectable.length > 0 && selectable.every(judge => selected.includes(judge.id))
  const invitees = judges.filter(judge => confirmIds.includes(judge.id) && !judge.revoked && !judge.deletedAt)
  const cohort = judges.filter(judge => judge.cohortYear === year && !judge.deletedAt)

  async function send() {
    if (!invitees.length || busy) return
    setBusy(true)
    const ids = invitees.map(judge => judge.id)
    setConfirmIds([])
    try {
      const result = await inviteJudges(ids)
      setSelected([])
      if (useLiveBackend) onNotice(`${result.sent} judge invitation${result.sent === 1 ? "" : "s"} sent.${result.failed ? ` ${result.failed} failed; check the addresses and try again.` : ""}`)
      else { onNotice(`${ids.length} local code${ids.length === 1 ? "" : "s"} prepared. No email was sent.`); if (ids.length === 1) setPreviewId(ids[0]) }
    } catch (cause) { onNotice(errorText(cause, "Could not send judge invitations.")) }
    finally { setBusy(false) }
  }

  return <>
    <div className="am-summary">
      <span><strong>{cohort.length}</strong> judges for {year}</span>
      <span><strong>{cohort.filter(judge => judge.invitedAt && !judge.revoked).length}</strong> invited</span>
      <span><strong>{cohort.filter(judge => !judge.revoked).length}</strong> active</span>
    </div>
    <div className="am-toolbar">
      <label className="am-search"><Search size={16} aria-hidden /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email or affiliation" aria-label="Search judges" /></label>
      <select aria-label="Filter judges" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="cohort">{year} judges</option><option value="all">All cohorts</option><option value="deleted">Deleted judges</option></select>
      <button className="ad-button ad-primary" onClick={() => setEditing("new")}><Plus size={15} aria-hidden /> Add judge</button>
      <button className="ad-button" onClick={() => setImportOpen(true)}><Upload size={15} aria-hidden /> Import CSV</button>
    </div>
    {selectedHere.length > 0 && <div className="am-selection"><span>{selectedHere.length} selected</span><button className="ad-button" disabled={busy} onClick={() => setConfirmIds(selectedHere.map(judge => judge.id))}><Mail size={15} aria-hidden /> Send access codes</button><button onClick={() => setSelected([])}>Clear</button></div>}
    <div className="am-table-wrap">
      <table className="am-table"><thead><tr><th><input type="checkbox" aria-label="Select all listed judges" checked={allSelected} disabled={!selectable.length} onChange={() => setSelected(allSelected ? selected.filter(id => !selectable.some(judge => judge.id === id)) : [...new Set([...selected, ...selectable.map(judge => judge.id)])])} /></th><th>Judge</th><th>Reviews submitted</th><th>Access</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {shown.map(judge => {
          const submitted = reviews.filter(review => review.judgeId === judge.id && review.submittedAt).length
          return <tr key={judge.id}>
            <td><input type="checkbox" aria-label={`Select ${judge.name}`} checked={selected.includes(judge.id)} disabled={judge.revoked || Boolean(judge.deletedAt)} onChange={() => setSelected(selected.includes(judge.id) ? selected.filter(id => id !== judge.id) : [...selected, judge.id])} /></td>
            <td><strong>{judge.name}</strong>{judge.kind === "special" && <span className="jd-kind">Special award</span>}<span>{judge.affiliation || "Affiliation not added"}{judge.cohortYear !== year && ` · ${judge.cohortYear} cohort`}</span><span className="am-email">{judge.email}</span></td>
            <td className="jd-num">{judge.cohortYear === year ? `${submitted} / ${lineupSize}` : "–"}</td>
            <td><span className={`am-status ${judge.revoked || judge.deletedAt ? "am-status-muted" : ""}`}><i />{judge.deletedAt ? "Deleted" : judge.revoked ? "Paused" : judge.invitedAt ? "Invited" : "Not invited"}</span></td>
            <td><div className="am-actions">{judge.deletedAt
              ? <button disabled={busy} aria-label={`Restore ${judge.name}`} onClick={() => setDeleting(judge)}><RotateCcw size={15} aria-hidden /> Restore</button>
              : <><button aria-label={`Edit ${judge.name}`} onClick={() => setEditing(judge)}><Pencil size={15} aria-hidden /> Edit</button>
                <button disabled={busy || judge.revoked} onClick={() => setConfirmIds([judge.id])}><Mail size={15} aria-hidden /> {judge.invitedAt ? "Reissue" : "Invite"}</button>
                <button className="am-delete" disabled={busy} aria-label={`Delete ${judge.name}`} title="Delete judge" onClick={() => setDeleting(judge)}><Trash2 size={15} aria-hidden /></button></>}</div></td>
          </tr>
        })}
      </tbody></table>
      {!shown.length && <div className="am-empty"><Gavel size={24} aria-hidden /><h2>{filter === "deleted" ? "No deleted judges" : `No judges for ${year} yet`}</h2><p>{filter === "deleted" ? "Deleted judges appear here so you can restore them." : "Add each judge, then send their access codes when the lineup is ready."}</p>{filter !== "deleted" && <button className="ad-button" onClick={() => setEditing("new")}>Add judge</button>}</div>}
    </div>
    {editing && <JudgeEditor key={editing === "new" ? "new" : editing.id} judge={editing === "new" ? undefined : editing} year={year} existing={judges} onClose={() => setEditing(null)}
      onSaved={emailChanged => { onNotice(editing === "new" ? "Judge added. Send their access code when ready." : emailChanged ? "Email updated. Send a new access code; the previous login no longer works." : "Judge details saved."); setEditing(null) }} />}
    {importOpen && <JudgeImport year={year} existing={judges} onClose={() => setImportOpen(false)} onImported={count => { setImportOpen(false); onNotice(`${count} judges added. Review the list before sending access codes.`) }} />}
    {deleting && <JudgeDeleteDialog judge={deleting} onClose={() => setDeleting(null)}
      onSaved={() => { onNotice(deleting.deletedAt ? "Judge restored." : "Judge deleted. Their sign-in no longer works; submitted reviews are kept."); setSelected(ids => ids.filter(id => id !== deleting.id)); setDeleting(null) }} />}
    {confirmIds.length > 0 && <Dialog open onOpenChange={open => { if (!open) setConfirmIds([]) }}><DialogContent className="ad-modal am-dialog">
      <DialogTitle>{invitees.some(judge => judge.invitedAt) ? "Send new access codes?" : "Invite judges?"}</DialogTitle>
      <DialogDescription>{useLiveBackend ? "Each judge receives a private six-character code by email. Sending again replaces their existing code." : "This local preview prepares test codes only. No email will be sent."}</DialogDescription>
      <div className="am-confirm-list">{invitees.map(judge => <div key={judge.id}><strong>{judge.name}</strong><span>{judge.email}</span></div>)}</div>
      <div className="ad-modal-actions"><button className="ad-button" onClick={() => setConfirmIds([])}>Cancel</button><button className="ad-button ad-primary" disabled={busy || !invitees.length} onClick={() => void send()}><Mail size={15} aria-hidden /> {useLiveBackend ? "Send codes" : "Prepare codes"}</button></div>
    </DialogContent></Dialog>}
    {previewId && !useLiveBackend && <Dialog open onOpenChange={open => { if (!open) setPreviewId(null) }}><DialogContent className="ad-modal am-dialog">
      <DialogTitle>Local judge sign-in</DialogTitle><DialogDescription>Use this code with the judge’s email to test the judge pages in this browser. No email was sent.</DialogDescription>
      <p className="am-preview-code">{previewJudgeCode(previewId)}</p>
      <div className="ad-modal-actions"><button className="ad-button ad-primary" onClick={() => setPreviewId(null)}>Done</button></div>
    </DialogContent></Dialog>}
  </>
}

function JudgeImport({ year, existing, onClose, onImported }: { year: number; existing: CommitteeJudge[]; onClose: () => void; onImported: (count: number) => void }) {
  const [text, setText] = useState("")
  const [filename, setFilename] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const rows = useMemo(() => parseJudgeCsv(text, year, existing), [text, year, existing])
  const errors = rows.filter(row => row.error)
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""
    if (!file) return
    if (!/\.(csv|tsv)$/i.test(file.name) || file.size > 1_048_576) { setError("Choose a CSV or TSV file smaller than 1 MB."); return }
    setText(await file.text()); setFilename(file.name); setError("")
  }
  function download() {
    const url = URL.createObjectURL(new Blob([judgeCsvTemplate], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "myssp-judges-template.csv"; anchor.click(); URL.revokeObjectURL(url)
  }
  async function commit() {
    if (!rows.length || errors.length || rows.length > 100 || busy) return
    setBusy(true); setError("")
    try { await importJudges(rows); onImported(rows.length) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not import judges.") }
    finally { setBusy(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent className="ad-modal am-dialog am-import">
    <DialogTitle>Import judges</DialogTitle><DialogDescription>Use one row per judge. Review every row before adding them to the {year} cohort.</DialogDescription>
    <div className="am-import-tools"><label className="ad-button"><Upload size={15} aria-hidden />{filename || "Choose CSV file"}<input type="file" accept=".csv,.tsv" className="sr-only" onChange={event => void readFile(event)} /></label><button className="ad-button" onClick={download}><Download size={15} aria-hidden /> CSV template</button></div>
    <p className="am-hint">Columns: <code>name,email,affiliation,judge_type</code>. Judge type must be <code>main</code> or <code>special</code>.</p>
    <textarea aria-label="Paste judge CSV rows" rows={5} spellCheck={false} value={text} onChange={event => { setText(event.target.value); setFilename(""); setError("") }} placeholder={judgeCsvTemplate.replaceAll("\r", "")} />
    {rows.length > 0 && <div className="am-import-review"><strong>{rows.length} row{rows.length === 1 ? "" : "s"}</strong><span>{errors.length ? `${errors.length} need changes` : "Ready to import"}</span><div>{rows.slice(0, 100).map(row => <p key={row.line}><span>{row.name || `Row ${row.line}`}<small>{row.email}</small></span><span>{row.error || (row.kind === "special" ? "Special award judge" : "Main judge")}</span></p>)}</div></div>}
    {rows.length > 100 && <p className="ad-error" role="alert">Import up to 100 judges at a time.</p>}{error && <p className="ad-error" role="alert">{error}</p>}
    <div className="ad-modal-actions"><button className="ad-button" disabled={busy} onClick={onClose}>Cancel</button><button className="ad-button ad-primary" disabled={busy || !rows.length || rows.length > 100 || errors.length > 0} onClick={() => void commit()}>{busy ? "Importing…" : `Import ${rows.length || ""} judge${rows.length === 1 ? "" : "s"}`}</button></div>
  </DialogContent></Dialog>
}

function JudgeEditor({ judge, year, existing, onClose, onSaved }: { judge?: CommitteeJudge; year: number; existing: CommitteeJudge[]; onClose: () => void; onSaved: (emailChanged: boolean) => void }) {
  const cohorts = useCohorts()
  const [input, setInput] = useState<JudgeInput>(judge ? { name: judge.name, email: judge.email, affiliation: judge.affiliation, kind: judge.kind, revoked: judge.revoked, cohortYear: judge.cohortYear } : blankJudge(year))
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const emailChanged = Boolean(judge && input.email.trim().toLowerCase() !== judge.email)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = judgeInputError(input, existing, judge?.id)
    if (problem) { setError(problem); return }
    setSaving(true); setError("")
    try { await saveJudge(input, judge?.id); onSaved(emailChanged) }
    catch (cause) { setError(errorText(cause, "Could not save this judge.")) }
    finally { setSaving(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose() }}><DialogContent className="ad-modal am-dialog am-editor">
    <DialogTitle>{judge ? "Edit judge" : "Add judge"}</DialogTitle>
    <DialogDescription>Judges see only their cohort’s Demo Day lineup. Mentors and participants cannot be judges.</DialogDescription>
    <form onSubmit={event => void submit(event)}>
      <div className="am-field-pair"><label>Name<input required maxLength={100} value={input.name} onChange={event => setInput({ ...input, name: event.target.value })} placeholder="Full name" /></label>
        <label>Email address<input required type="email" maxLength={254} value={input.email} onChange={event => setInput({ ...input, email: event.target.value })} placeholder="judge@example.com" /></label></div>
      {emailChanged && <p className="am-email-notice" role="status">Saving a new email signs out the previous login. Send a new access code after saving.</p>}
      <div className="am-field-pair"><label>Affiliation<input maxLength={180} value={input.affiliation} onChange={event => setInput({ ...input, affiliation: event.target.value })} placeholder="University or organisation" /></label>
        <label>Judging cohort<select value={input.cohortYear} onChange={event => setInput({ ...input, cohortYear: Number(event.target.value) })}>
          {[...new Set([input.cohortYear, ...cohorts.map(c => c.year)])].sort((a, b) => b - a).map(y => <option key={y} value={y}>{cohorts.find(c => c.year === y)?.name || `MYSSP ${y}`}</option>)}
        </select></label></div>
      <label className="jd-kind-field">Judge type<select value={input.kind} onChange={event => setInput({ ...input, kind: event.target.value as JudgeKind })}>
        {(Object.keys(judgeKindLabels) as JudgeKind[]).map(kind => <option key={kind} value={kind}>{judgeKindLabels[kind]}</option>)}
      </select><small>Teams see this label on each review. Names stay hidden.</small></label>
      {judge && judge.cohortYear !== input.cohortYear && <p className="am-email-notice" role="status">The judge will see the {input.cohortYear} lineup instead. Their {judge.cohortYear} reviews stay with those teams.</p>}
      {judge && <label className="am-pause"><input type="checkbox" checked={input.revoked} onChange={event => setInput({ ...input, revoked: event.target.checked })} /><span><strong>Pause judge access</strong><small>The judge can’t sign in until access is restored. Submitted reviews still count.</small></span></label>}
      {error && <p className="ad-error" role="alert">{error}</p>}
      <div className="ad-modal-actions"><button type="button" className="ad-button" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" className="ad-button ad-primary" disabled={saving}>{saving ? "Saving…" : judge ? "Save judge" : "Add judge"}</button></div>
    </form>
  </DialogContent></Dialog>
}

function JudgeDeleteDialog({ judge, onClose, onSaved }: { judge: CommitteeJudge; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const restoring = Boolean(judge.deletedAt)
  async function submit() {
    setSaving(true); setError("")
    try { await setJudgeDeleted(judge.id, !restoring); onSaved() }
    catch (cause) { setError(errorText(cause, "Could not update this judge.")) }
    finally { setSaving(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose() }}><DialogContent className="ad-modal am-dialog">
    <DialogTitle>{restoring ? "Restore judge?" : "Delete judge?"}</DialogTitle>
    <DialogDescription>{restoring ? "Restores their account and access status. A paused account stays paused." : "Removes this judge from the list and blocks their sign-in. Reviews they submitted stay with the teams. You can undo this under Deleted judges."}</DialogDescription>
    <div className="am-confirm-list"><div><strong>{judge.name}</strong><span>{judge.email}</span></div></div>
    {error && <p className="ad-error" role="alert">{error}</p>}
    <div className="ad-modal-actions"><button className="ad-button" disabled={saving} onClick={onClose}>Cancel</button><button className={restoring ? "ad-button ad-primary" : "ad-button am-destructive"} disabled={saving} onClick={() => void submit()}>{saving ? "Saving…" : restoring ? "Restore judge" : "Delete judge"}</button></div>
  </DialogContent></Dialog>
}

// Lineup ---------------------------------------------------------------------------------------
const byCode = (a: Board, b: Board) => a.code.localeCompare(b.code, undefined, { numeric: true })

function LineupEditor({ year, boards, saved, reviews, locked, onNotice }: { year: number; boards: Board[]; saved: string[]; reviews: CommitteeReview[]; locked: boolean; onNotice: (text: string) => void }) {
  const cohortBoards = useMemo(() => boards.filter(board => board.year === year).sort(byCode), [boards, year])
  const [order, setOrder] = useState(() => saved.filter(id => cohortBoards.some(board => board.id === id)))
  const [adding, setAdding] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const dirty = order.join() !== saved.join()
  const remaining = cohortBoards.filter(board => !order.includes(board.id))
  const removedWithReviews = saved.filter(id => !order.includes(id) && reviews.some(review => review.projectId === id))
  const move = (index: number, by: number) => setOrder(current => {
    const next = [...current]; const [item] = next.splice(index, 1); next.splice(index + by, 0, item); return next
  })
  async function save() {
    setSaving(true); setError("")
    try { await setLineup(year, order); onNotice(`Lineup saved. Judges now see ${order.length} project${order.length === 1 ? "" : "s"} in this order.`) }
    catch (cause) { setError(errorText(cause, "Could not save the lineup.")) }
    finally { setSaving(false) }
  }
  if (locked) return <div>
    <p className="jd-lock-note" role="status"><Lock size={14} aria-hidden />The lineup is locked while judging is open. Close judging to add, remove or reorder projects.</p>
    <ol className="jd-lineup">
      {saved.map((id, index) => {
        const board = cohortBoards.find(item => item.id === id)
        return board && <li key={id} className="jd-lineup-row jd-locked">
          <span className="jd-position">{index + 1}</span>
          <span className="jd-lineup-project"><span className="jd-code">{board.code}</span><span>{board.title}</span></span>
        </li>
      })}
    </ol>
  </div>
  return <div>
    {/* Sticky, so saving never needs a scroll to the end of a long lineup. */}
    <div className={`jd-lineup-bar${dirty ? " jd-dirty" : ""}`}>
      <p className="jd-intro">{dirty ? "Unsaved changes to the lineup." : "The lineup locks once judging opens."}</p>
      <div className="jd-lineup-save">
        {!dirty && saved.length > 0 && <span className="jd-muted">Saved</span>}
        <button className="ad-button" disabled={!dirty || saving} onClick={() => setOrder(saved)}>Undo changes</button>
        <button className="ad-button ad-primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save lineup"}</button>
      </div>
    </div>
    {/* Drag by the handle (mouse or touch); the arrow buttons cover keyboard use. */}
    <Reorder.Group as="ol" axis="y" values={order} onReorder={setOrder} className="jd-lineup">
      {order.map((id, index) => {
        const board = cohortBoards.find(item => item.id === id)
        if (!board) return null
        return <LineupRow key={id} board={board} index={index} last={index === order.length - 1}
          onMove={by => move(index, by)} onRemove={() => setOrder(order.filter(item => item !== id))} />
      })}
    </Reorder.Group>
    {!order.length && <div className="am-empty"><h2>No projects in the lineup</h2><p>Add projects in presentation order, or add them all in code order and rearrange.</p></div>}
    {remaining.length > 0 && <div className="jd-lineup-add">
      <select aria-label="Project to add" value={adding} onChange={event => setAdding(event.target.value)}>
        <option value="">Add a project…</option>
        {remaining.map(board => <option key={board.id} value={board.id}>{board.code} · {board.title}</option>)}
      </select>
      <button className="ad-button" disabled={!adding} onClick={() => { setOrder([...order, adding]); setAdding("") }}><Plus size={15} aria-hidden /> Add</button>
      <button className="ad-button" onClick={() => setOrder([...order, ...remaining.map(board => board.id)])}>Add all {remaining.length} remaining</button>
    </div>}
    {removedWithReviews.length > 0 && <p className="ad-notice">Removing {removedWithReviews.map(id => cohortBoards.find(board => board.id === id)?.code || id).join(", ")} hides it from judges. Feedback already given is kept.</p>}
    {error && <p className="ad-error" role="alert">{error}</p>}
  </div>
}

function LineupRow({ board, index, last, onMove, onRemove }: { board: Board; index: number; last: boolean; onMove: (by: number) => void; onRemove: () => void }) {
  const controls = useDragControls()
  const reduceMotion = useReducedMotion()
  return <Reorder.Item as="li" value={board.id} dragListener={false} dragControls={controls}
    layout={reduceMotion ? undefined : "position"} className="jd-lineup-row"
    whileDrag={{ scale: 1.01, boxShadow: "0 12px 30px rgb(0 0 0 / 0.55)", zIndex: 2 }}>
    <span className="jd-drag-handle" aria-hidden="true" title="Drag to reorder"
      onPointerDown={event => { event.preventDefault(); controls.start(event) }}>
      <GripVertical size={16} />
    </span>
    <span className="jd-position">{index + 1}</span>
    <span className="jd-lineup-project"><span className="jd-code">{board.code}</span><span>{board.title}</span></span>
    <span className="jd-lineup-actions">
      <button aria-label={`Move ${board.code} up`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={15} aria-hidden /></button>
      <button aria-label={`Move ${board.code} down`} disabled={last} onClick={() => onMove(1)}><ArrowDown size={15} aria-hidden /></button>
      <button aria-label={`Remove ${board.code} from lineup`} onClick={onRemove}><X size={15} aria-hidden /></button>
    </span>
  </Reorder.Item>
}

// Results -------------------------------------------------------------------------------------
function Results({ year, lineup, judges, allJudges, reviews, onNotice }: { year: number; lineup: Board[]; judges: CommitteeJudge[]; allJudges: CommitteeJudge[]; reviews: CommitteeReview[]; onNotice: (text: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState<CommitteeReview | null>(null)
  const results = lineup.map(board => projectResult(board.id, reviews))
  const ranks = rankResults(results)
  const activeJudges = judges.filter(judge => !judge.revoked)
  // Show anyone who has reviewed a lineup project, even if later paused or moved.
  const columns = [...activeJudges, ...allJudges.filter(judge => !activeJudges.includes(judge) && reviews.some(review => review.judgeId === judge.id))]
  const submitted = reviews.filter(review => review.submittedAt).length
  const judgeName = (id: string) => allJudges.find(judge => judge.id === id)?.name || "Unknown judge"

  function download() {
    const csv = feedbackCsv(lineup.map(board => ({ id: board.id, code: board.code, title: board.title })), allJudges, reviews)
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `myssp-${year}-judging.csv`; anchor.click(); URL.revokeObjectURL(url)
  }

  if (!lineup.length) return <div className="am-empty"><h2>Set the lineup first</h2><p>Progress and scores appear here once projects are in the lineup.</p></div>
  return <>
    <div className="am-summary jd-results-head">
      <span><strong>{submitted}</strong> of {activeJudges.length * lineup.length} reviews submitted</span>
      <span><strong>{reviews.length - submitted}</strong> drafts</span>
      <button className="ad-button" disabled={!reviews.length} onClick={download}><Download size={15} aria-hidden /> Export CSV</button>
    </div>
    <p className="jd-intro">Scores use submitted reviews only. Total is out of {MAX_TOTAL} (8 criteria × 5), averaged across judges. Select a project to see each review.</p>
    <div className="am-table-wrap">
      <table className="jd-table"><thead><tr>
        <th>#</th><th>Project</th>
        {columns.map(judge => <th key={judge.id} className="jd-judge-col" title={`${judge.name} · ${judge.email}`}>{judge.name.replace(/^((assoc\.?\s+)?prof\.?|dr\.?|mr\.?|ms\.?|mrs\.?)\s+/i, "")}</th>)}
        <th className="jd-num">Avg total</th><th className="jd-num">Rank</th>
      </tr></thead><tbody>
        {lineup.map((board, index) => {
          const result = results[index]
          const expanded = open === board.id
          const projectReviews = reviews.filter(review => review.projectId === board.id)
          return <Fragment key={board.id}>
            <tr className="jd-result-row" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : board.id)}>
              <td>{index + 1}</td>
              <td><button className="jd-expand" aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "Show"} reviews for ${board.code}`} onClick={event => { event.stopPropagation(); setOpen(expanded ? null : board.id) }}>{expanded ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}<span className="jd-code">{board.code}</span></button><span className="jd-title">{board.title}</span></td>
              {columns.map(judge => {
                const review = projectReviews.find(item => item.judgeId === judge.id)
                return <td key={judge.id} className="jd-judge-col"><ReviewDot review={review} judge={judge.name} /></td>
              })}
              <td className="jd-num">{result.averageTotal ?? "–"}</td>
              <td className="jd-num">{ranks.get(board.id) ?? "–"}</td>
            </tr>
            {expanded && <tr className="jd-detail-row"><td colSpan={columns.length + 4}>
              {projectReviews.length ? <div className="jd-detail">
                {result.averages && <p className="jd-averages">{scoreKeys.map(key => <span key={key}>{criterionLabels[key]} <strong>{result.averages![key]}</strong></span>)}</p>}
                {projectReviews.map(review => <div key={review.judgeId} className="jd-review">
                  <div className="jd-review-head"><strong>{judgeName(review.judgeId)}</strong>{allJudges.find(judge => judge.id === review.judgeId)?.kind === "special" && <span className="jd-kind">Special award</span>}
                    <span className={review.submittedAt ? "jd-ok" : "jd-muted"}>{review.submittedAt ? `Submitted · ${reviewTotal(review)}/${MAX_TOTAL}` : "Draft, not counted"}</span>
                    <button className="jd-discard" onClick={() => setDiscarding(review)}><Trash2 size={13} aria-hidden /> Discard</button></div>
                  <p className="jd-scores">{scoreKeys.map(key => <span key={key} title={criterionLabels[key]}>{review[key] ?? "–"}</span>)}</p>
                  <div className="jd-review-remarks">
                    <p><strong>Research review:</strong> {review.researchRemarks || "No review yet."}</p>
                    <p><strong>Presentation review:</strong> {review.presentationRemarks || "No review yet."}</p>
                  </div>
                </div>)}
              </div> : <p className="jd-muted jd-detail">No reviews for this project yet.</p>}
            </td></tr>}
          </Fragment>
        })}
      </tbody></table>
    </div>
    {discarding && <DiscardDialog review={discarding} judge={judgeName(discarding.judgeId)} project={lineup.find(board => board.id === discarding.projectId)?.code || ""} onClose={() => setDiscarding(null)} onDone={() => { onNotice("Review discarded."); setDiscarding(null) }} />}
  </>
}

function ReviewDot({ review, judge }: { review?: CommitteeReview; judge: string }) {
  const status = !review ? "Not started" : review.submittedAt ? "Submitted" : "Draft"
  const Icon = !review ? CircleDashed : review.submittedAt ? Check : PencilLine
  return <span className={`jd-dot jd-dot-${status.split(" ")[0].toLowerCase()}`} title={`${judge}: ${status}`}>
    <Icon size={13} aria-hidden /><span className="sr-only">{judge}: {status}</span>
  </span>
}

function DiscardDialog({ review, judge, project, onClose, onDone }: { review: CommitteeReview; judge: string; project: string; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function submit() {
    setBusy(true); setError("")
    try { await discardReview(review.judgeId, review.projectId); onDone() }
    catch (cause) { setError(errorText(cause, "Could not discard this review.")) }
    finally { setBusy(false) }
  }
  return <Dialog open onOpenChange={next => { if (!next && !busy) onClose() }}><DialogContent className="ad-modal am-dialog">
    <DialogTitle>Discard this review?</DialogTitle>
    <DialogDescription>Permanently deletes {judge}’s {review.submittedAt ? "submitted review" : "draft"} for {project}, including the remark. This can’t be undone. Use it for test or mistaken reviews.</DialogDescription>
    {error && <p className="ad-error" role="alert">{error}</p>}
    <div className="ad-modal-actions"><button className="ad-button" disabled={busy} onClick={onClose}>Cancel</button><button className="ad-button am-destructive" disabled={busy} onClick={() => void submit()}>{busy ? "Discarding…" : "Discard review"}</button></div>
  </DialogContent></Dialog>
}
