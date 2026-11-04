import { useMemo, useState, type ChangeEvent } from "react"
import { Tabs } from "radix-ui"
import { Check, Download, FileSpreadsheet, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog"
import type { Board } from "../projectboard/data"
import { parseParticipants, participantCsvTemplate } from "./access-model"
import { addParticipants, useDemoAccess } from "./demo-access"
import { useBackend } from "./backend"
import { AdminSelect } from "./AdminSelect"

export function ParticipantImport({
  boards,
  year,
  open,
  onClose,
  onAdded,
}: {
  boards: Board[]
  year: number
  open: boolean
  onClose: () => void
  onAdded: (count: number) => void
}) {
  const { people } = useDemoAccess()
  const { deletedPeople } = useBackend()
  const [text, setText] = useState("")
  const [project, setProject] = useState(boards[0]?.id || "")
  const [filename, setFilename] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const rows = useMemo(
    () =>
      parseParticipants(text, project, boards, [...people, ...deletedPeople]),
    [text, project, boards, people, deletedPeople]
  )
  const errors = rows.filter((row) => row.error).length
  const invalid = errors > 0 || rows.length > 200

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setText("")
    setFilename("")
    if (!/\.(csv|tsv)$/i.test(file.name) || file.size > 1048576) {
      setError("Choose a CSV or TSV file smaller than 1 MB.")
      return
    }
    setBusy(true)
    try {
      const contents = await file.text()
      setText(contents)
      setFilename(file.name)
      setError(
        contents.trim()
          ? ""
          : "This file is empty. Add participant rows and try again."
      )
    } catch {
      setError("Could not read this file. Try pasting the rows instead.")
    } finally {
      setBusy(false)
    }
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(
      new Blob([participantCsvTemplate], { type: "text/csv;charset=utf-8" })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "myssp-participants-template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importRows() {
    if (busy || !rows.length || invalid) return
    setBusy(true)
    setError("")
    try {
      if (!(await addParticipants(rows)))
        throw new Error(
          "Could not add participants. Review duplicates and project assignments."
        )
      onAdded(rows.length)
      setText("")
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not add participants. Please try again."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose()
      }}
    >
      <DialogContent
        className="ad-modal ad-import-modal"
        onInteractOutside={(event) => {
          if (busy || text) event.preventDefault()
        }}
      >
        <div className="ad-import-heading">
          <DialogTitle>Import participants</DialogTitle>
          <DialogDescription>
            Add people to the {year} cohort. Review their details before saving.
          </DialogDescription>
        </div>
        <div className="ad-import-body">
          <Tabs.Root defaultValue="upload" className="ad-import-source">
            <Tabs.List className="ad-import-tabs" aria-label="Import method">
              <Tabs.Trigger value="upload">
                <Upload size={15} aria-hidden="true" />
                Upload file
              </Tabs.Trigger>
              <Tabs.Trigger value="paste">
                <FileSpreadsheet size={15} aria-hidden="true" />
                Paste rows
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="upload" className="ad-import-input">
              <label className="ad-upload-zone">
                <Upload size={22} aria-hidden="true" />
                <strong>{filename || "Choose a CSV file"}</strong>
                <span>
                  {filename
                    ? "Click to choose another file"
                    : "CSV or TSV · Up to 200 participants · 1 MB max"}
                </span>
                <input
                  type="file"
                  aria-label="Upload participant CSV"
                  accept=".csv,.tsv,text/csv,text/tab-separated-values"
                  disabled={busy}
                  onChange={readFile}
                />
              </label>
            </Tabs.Content>
            <Tabs.Content value="paste" className="ad-import-input">
              <label className="ad-paste-label">
                Spreadsheet rows
                <textarea
                  name="participantRows"
                  value={text}
                  disabled={busy}
                  spellCheck={false}
                  rows={5}
                  placeholder={
                    "name,email,project_code\nAlex Tan,alex@example.com,A-1"
                  }
                  onChange={(event) => {
                    setText(event.target.value)
                    setFilename("")
                    setError("")
                  }}
                />
              </label>
            </Tabs.Content>
          </Tabs.Root>
          <div className="ad-import-format">
            <div>
              <span>Column order</span>
              <code>name, email, project_code</code>
            </div>
            <button
              type="button"
              className="ad-template-link"
              onClick={downloadTemplate}
            >
              <Download size={14} aria-hidden="true" />
              CSV template
            </button>
          </div>
          <label className="ad-import-project">
            Default project
            <AdminSelect
              label="Default project"
              value={project}
              onChange={setProject}
              disabled={busy}
              options={boards.map((board) => ({
                value: board.id,
                label: `${board.code} · ${year}`,
                description: board.title,
              }))}
            />
            <small>
              Used only when a row has no project code. Codes match this cohort.
            </small>
          </label>
          {rows.length > 0 && (
            <section className="ad-import-preview" aria-label="Import review">
              <div className="ad-import-preview-heading">
                <strong>
                  Review participants <span>{rows.length}</span>
                </strong>
                <span role="status">
                  {errors ? `${errors} to fix` : `${rows.length} ready`}
                </span>
              </div>
              <div className="ad-import-preview-scroll">
                {rows.map((row) => (
                  <div className="ad-import-preview-row" key={row.line}>
                    <div>
                      <strong>{row.name || `Row ${row.line}`}</strong>
                      <span>{row.email || "Missing email"}</span>
                    </div>
                    <span className="ad-import-assignment">
                      {boards.find((board) => board.id === row.projectId)
                        ?.code || "Unassigned"}
                      {!row.error && <Check size={13} aria-hidden="true" />}
                    </span>
                    {row.error && <p>{row.error}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {rows.length > 200 && (
            <p className="ad-error" role="alert">
              Limit each import to 200 participants.
            </p>
          )}
          {error && (
            <p className="ad-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="ad-import-footer">
          <span>Access codes are sent separately.</span>
          <div>
            <button
              type="button"
              className="ad-button"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ad-button ad-primary"
              disabled={!rows.length || invalid || busy}
              onClick={importRows}
            >
              {busy
                ? "Working…"
                : rows.length
                  ? `Add ${rows.length} participant${rows.length === 1 ? "" : "s"}`
                  : "Add participants"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
