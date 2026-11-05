import { useEffect, useId, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { ArrowLeft, Check, Copy, ImagePlus, Pencil } from "lucide-react"
import {
  newDraft,
  teamProfiles,
  validTeamProfiles,
  type Board,
  type Draft,
  type TeamMemberProfile,
} from "./data"
import { OverviewContent, OverviewEditor } from "./OverviewEditor"
import { libraryHash, projectShareUrl } from "./paths"
import { prepareProjectImage, prepareMemberPhoto } from "./project-image"
import { MemberAvatar, ProjectTeam } from "./ProjectTeam"
import { ProjectMaterials } from "./ProjectMaterials"
import { materialSpecs, materialError, validAdditionalMaterials } from "./materials"
import { overviewFields, overviewError } from "./overview"

const tabs = ["overview", "materials", "team"] as const

function ProjectShare({ board }: { board: Board }) {
  const url = projectShareUrl(board.id, window.location.origin, window.location.pathname)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(timer)
  }, [copied])
  return (
    <aside className="pb-share-sidebar" aria-label="Share project">
      <div className="pb-share-card">
        <QRCodeSVG
          value={url}
          size={224}
          marginSize={4}
          level="M"
          title={`QR code for project ${board.code}`}
          role="img"
        />
        <button
          className="pb-button pb-full"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url)
              setCopied(true)
              setError(false)
            } catch {
              setError(true)
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span aria-live="polite">{copied ? "Link copied" : "Copy project link"}</span>
        </button>
        {error && (
          <label className="pb-field pb-copy-fallback">
            Copy this link
            <input readOnly value={url} onFocus={(event) => event.target.select()} />
          </label>
        )}
      </div>
    </aside>
  )
}

export function ProjectDetail({
  board,
  savedDraft,
  onSave,
  onSignOut,
  editable,
  owner,
  revision,
}: {
  board: Board
  savedDraft?: Draft
  onSave: (draft: Draft, revision:number) => Promise<boolean>
  onSignOut: () => void
  editable: boolean
  owner: boolean
  revision: number
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("overview")
  const [requestedEditing, setEditing] = useState(false)
  const [editRevision, setEditRevision] = useState(revision)
  const editing = requestedEditing && editable
  const [draft, setDraft] = useState<Draft>(
    () =>
      savedDraft ?? {
        ...newDraft(board),
        projectId: board.id,
        title: board.title,
        teamMembers: teamProfiles(board),
        summary: board.description,
        question: "",
        method: board.tasks.map((task) => `- ${task}`).join("\n"),
      }
  )
  const [status, setStatus] = useState("")
  const [uploading, setUploading] = useState(false)
  const imageInput = useId()
  const sections = useRef<HTMLDivElement>(null)
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(savedDraft)
  const content = editing ? draft : savedDraft
  const title = content?.title ?? board.title
  const members = content?.teamMembers ?? teamProfiles(board)
  const staleTeam = editing && (editRevision !== revision ||
    JSON.stringify((draft.teamMembers ?? []).map(member => member.id)) !== JSON.stringify(teamProfiles(board).map(member => member.id)))

  useEffect(() => {
    if (!dirty && !uploading) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    const checkNavigation = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        anchor.href === window.location.href
      )
        return
      if (!window.confirm("Leave this project without saving your changes?")) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", warn)
    document.addEventListener("click", checkNavigation, true)
    return () => {
      window.removeEventListener("beforeunload", warn)
      document.removeEventListener("click", checkNavigation, true)
    }
  }, [dirty, uploading])

  function update<K extends Exclude<keyof Draft, "projectId" | "version">>(
    key: K,
    value: Draft[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
    setStatus("")
  }
  function updateMember(id: string, changes: Partial<Omit<TeamMemberProfile, "id">>) {
    setDraft((current) => ({
      ...current,
      teamMembers: (current.teamMembers ?? teamProfiles(board)).map((member) =>
        member.id === id ? { ...member, ...changes } : member
      ),
    }))
    setStatus("")
  }
  async function uploadMemberPhoto(id: string, file: File) {
    setUploading(true)
    try {
      updateMember(id, { photo: await prepareMemberPhoto(file) })
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not read that photo. Try another file."
      )
    } finally {
      setUploading(false)
    }
  }
  async function save() {
    if (!owner || !editable || uploading) return
    const invalidOverview = overviewError(draft)
    if (!draft.title.trim() || draft.title.length > 240 || invalidOverview) {
      setStatus(
        !draft.title.trim() || draft.title.length > 240
          ? "Add a project title of 240 characters or fewer."
          : invalidOverview!
      )
      setTab("overview")
      return
    }
    const invalidMaterial = materialSpecs
      .map((spec) => materialError(spec.key, draft[spec.key] ?? ""))
      .find(Boolean)
    if (invalidMaterial) {
      setStatus(invalidMaterial)
      setTab("materials")
      return
    }
    const additionalMaterials = (draft.additionalMaterials ?? [])
      .filter((link) => link.name.trim() || link.url.trim())
      .map((link) => ({ ...link, name: link.name.trim(), url: link.url.trim() }))
    if (!validAdditionalMaterials(additionalMaterials)) {
      setStatus("Give each additional material a name and a full https:// or http:// link.")
      setTab("materials")
      return
    }
    const teamMembers = (draft.teamMembers ?? teamProfiles(board)).map((member) => ({
      ...member,
      name: member.name.trim(),
      school: member.school.trim(),
      bio: member.bio.trim(),
    }))
    if (!validTeamProfiles(teamMembers, board)) {
      setStatus("Add a name for every team member before saving.")
      setTab("team")
      return
    }
    const next: Draft = {
      ...draft,
      projectId: board.id,
      overviewFormat: "markdown",
      title: draft.title.trim(),
      teamMembers,
      additionalMaterials,
      video: draft.video.trim(),
      slides: draft.slides.trim(),
      paper: draft.paper.trim(),
      savedAt: new Date().toISOString(),
    }
    if (await onSave(next, editRevision)) {
      setDraft(next)
      setEditing(false)
      setStatus("Changes saved.")
    } else {
      setStatus("Could not save. Your access may have changed or a teammate saved a newer version. Copy your changes before reloading.")
    }
  }

  return (
    <main className="pb-main pb-detail">
      <div className="pb-breadcrumb">
        <a href={libraryHash}>
          <ArrowLeft size={15} /> Project Archive
        </a>
        <span>/</span>
        <span>{board.code}</span>
      </div>
      {owner && (
        <div className={`pb-inline-toolbar ${editing ? "is-editing" : ""}`}>
          <div>
            <strong>{editing ? "Editing your project" : "Your team’s project"}</strong>
            <span role="status">
              {uploading
                ? "Preparing image…"
                : staleTeam ? "The project or team has changed. Copy any unsaved work, then cancel and edit again to load the latest version."
                : status || (dirty ? "Unsaved changes" : editable ? board.code : "Editing is closed by the committee.")}
            </span>
          </div>
          <div className="pb-inline-actions">
            {editing ? (
              <>
                <button
                  className="pb-button"
                  disabled={uploading}
                  onClick={() => {
                    if (dirty && !window.confirm("Discard your unsaved changes?")) return
                    setDraft(savedDraft ?? newDraft(board))
                    setEditing(false)
                    setStatus("")
                  }}
                >
                  Cancel
                </button>
                <button className="pb-button pb-primary" disabled={uploading || staleTeam} onClick={save}>
                  Save changes
                </button>
              </>
            ) : (
              <>
                <button className="pb-text-button" onClick={onSignOut}>
                  Sign out
                </button>
                <button
                  className="pb-button pb-primary"
                  disabled={!editable}
                  onClick={() => {
                    setDraft(savedDraft ?? newDraft(board))
                    setStatus("")
                    setEditRevision(revision)
                    setEditing(true)
                  }}
                >
                  <Pencil size={14} /> Edit project
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <header className="pb-detail-heading">
        <div className="pb-detail-intro">
          <div className="pb-tag-row">
            <span className="pb-code">{board.code}</span>
            <span>{board.track}</span>
          </div>
          {editing && (
            <p className="pb-small-note">
              Project code {board.code} is assigned by the committee and cannot be edited.
            </p>
          )}
          {editing ? (
            <label className="pb-field pb-title-field">
              Project title
              <textarea
                rows={3}
                value={draft.title}
                maxLength={240}
                onChange={(event) => update("title", event.target.value)}
              />
            </label>
          ) : (
            <h1>{title}</h1>
          )}
          <p className="pb-detail-field">{board.type}</p>
          <button
            className="pb-team-summary"
            onClick={() => {
              setTab("team")
              sections.current?.scrollIntoView({ block: "start" })
              document.getElementById("pb-tab-team")?.focus({ preventScroll: true })
            }}
            aria-label={`View team: ${members.map((member) => member.name).join(", ")}`}
          >
            <span className="pb-member-stack">
              {members.map((member) => (
                <MemberAvatar key={member.id} member={member} />
              ))}
            </span>
            <span className="pb-team-summary-copy">
              <strong>{members.map((member) => member.name).join(", ")}</strong>
            </span>
          </button>
        </div>
        <div className="pb-detail-visual">
          <div className="pb-project-image-frame">
            {content?.coverImage ? (
              <img
                src={content.coverImage}
                alt={content.coverAlt || `Project image for ${title}`}
              />
            ) : (
              <div className="pb-project-image-placeholder">
                <ImagePlus size={32} strokeWidth={1} aria-hidden="true" />
                <span>Project image</span>
                <small>No image added yet</small>
              </div>
            )}
          </div>
          {editing && (
            <div className="pb-inline-image">
              <div className="pb-image-controls">
                <label className="pb-button pb-image-picker" htmlFor={imageInput}>
                  <ImagePlus size={16} />{" "}
                  {draft.coverImage ? "Change project image" : "Add project image"}
                  <input
                    className="pb-sr-only"
                    id={imageInput}
                    aria-describedby={`${imageInput}-help`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ""
                      if (!file) return
                      setUploading(true)
                      try {
                        update("coverImage", await prepareProjectImage(file))
                      } catch (error) {
                        setStatus(
                          error instanceof Error
                            ? error.message
                            : "Could not read that image. Try another file."
                        )
                      } finally {
                        setUploading(false)
                      }
                    }}
                  />
                </label>
                {draft.coverImage && (
                  <button
                    className="pb-text-button"
                    disabled={uploading}
                    onClick={() => update("coverImage", "")}
                  >
                    Remove image
                  </button>
                )}
              </div>
              <p className="pb-small-note" id={`${imageInput}-help`}>
                Use a 16:9 landscape image, ideally 1600 × 900 px. JPG, PNG or WebP, up to 5 MB.
                Other sizes are cropped to fit, so keep important details away from the edges.
              </p>
              {draft.coverImage && (
                <label className="pb-field">
                  Image description
                  <input
                    value={draft.coverAlt ?? ""}
                    maxLength={200}
                    onChange={(event) => update("coverAlt", event.target.value)}
                    placeholder="Briefly describe the image"
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="pb-detail-layout">
        <div className="pb-detail-primary">
          <div className="pb-board-content pb-detail-sections" ref={sections}>
            <div className="pb-tabs" role="tablist" aria-label="Project sections">
              {tabs.map((name, index) => (
                <button
                  key={name}
                  role="tab"
                  aria-selected={tab === name}
                  aria-controls={`pb-panel-${name}`}
                  id={`pb-tab-${name}`}
                  tabIndex={tab === name ? 0 : -1}
                  onClick={() => setTab(name)}
                  onKeyDown={(event) => {
                    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return
                    event.preventDefault()
                    const next =
                      tabs[
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? 2
                            : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3
                      ]
                    setTab(next)
                    document.getElementById(`pb-tab-${next}`)?.focus()
                  }}
                >
                  {name === "overview"
                    ? "Overview"
                    : name === "materials"
                      ? "Project materials"
                      : "The team"}
                </button>
              ))}
            </div>
            <div
              className="pb-tab-panel"
              role="tabpanel"
              id={`pb-panel-${tab}`}
              aria-labelledby={`pb-tab-${tab}`}
              key={tab}
            >
              {tab === "overview" ? (
                editing ? (
                  <>
                    <p className="pb-editor-note">
                      Write in Markdown. Keep the overview brief; put full details in your research
                      write-up.
                    </p>
                    {overviewFields.map(({ key, label, maxLength }) => (
                      <OverviewEditor
                        key={key}
                        label={label}
                        value={draft[key]}
                        onChange={(value) => update(key, value)}
                        maxLength={maxLength}
                        rows={key === "question" ? 3 : 6}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <section>
                      <h2>Abstract</h2>
                      <OverviewContent text={content?.summary ?? board.description} />
                    </section>
                    {content?.question && (
                      <section>
                        <h2>Research question</h2>
                        <OverviewContent text={content.question} />
                      </section>
                    )}
                    <section>
                      <h2>Research approach</h2>
                      <OverviewContent
                        text={content?.method ?? board.tasks.map((task) => `- ${task}`).join("\n")}
                      />
                    </section>
                    <section>
                      <h2>Findings</h2>
                      {content?.findings ? (
                        <OverviewContent text={content.findings} />
                      ) : (
                        <p className="pb-muted">The team has not added findings yet.</p>
                      )}
                    </section>
                  </>
                )
              ) : tab === "materials" ? (
                <ProjectMaterials
                  content={content}
                  editing={editing}
                  onChange={update}
                  onLinksChange={(links) => update("additionalMaterials", links)}
                />
              ) : (
                <section>
                  <div className="pb-team-section-heading">
                    <h2>Student researchers</h2>
                    {owner && !editing && (
                      <button
                        className="pb-button"
                        onClick={() => {
                          setDraft(savedDraft ?? newDraft(board))
                          setStatus("")
                          setEditRevision(revision)
                          setEditing(true)
                        }}
                      >
                        <Pencil size={14} /> Edit team
                      </button>
                    )}
                  </div>
                  {editing && (
                    <p className="pb-small-note pb-team-upload-note">
                      Photos: JPG, PNG or WebP, up to 5 MB. Cropped to a circle.
                    </p>
                  )}
                  <ProjectTeam
                    members={members}
                    editing={editing}
                    uploading={uploading}
                    onChange={updateMember}
                    onPhoto={uploadMemberPhoto}
                  />
                  <h2>Research mentor</h2>
                  <div className="pb-mentor">
                    <div className="pb-member-photo-column">
                      <span className="pb-member-avatar">
                        <img src={board.photo} alt={board.mentor} loading="lazy" />
                      </span>
                    </div>
                    <div className="pb-member-copy">
                      <h3>{board.mentor}</h3>
                      <p>{board.affiliation}</p>
                    </div>
                  </div>
                  {editing && (
                    <p className="pb-small-note">
                      Team membership and mentor assignments are managed by the committee.
                    </p>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
        <ProjectShare board={board} />
      </div>
    </main>
  )
}
