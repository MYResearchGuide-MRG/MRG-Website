import { useId, useState } from "react"
import { ArrowUpRight, Globe, Plus, Trash2 } from "lucide-react"
import type { Draft } from "./data"
import {
  materialSpecs,
  materialEmbed,
  materialError,
  webUrl,
  linkService,
  MAX_ADDITIONAL_MATERIALS,
  type AdditionalMaterial,
  type MaterialService,
  type MaterialKey,
} from "./materials"

function ServiceIcon({ service }: { service: MaterialService }) {
  if (service === "web") return <Globe size={22} aria-hidden="true" />
  if (service === "canva")
    return (
      <span className="pb-canva-mark" aria-hidden="true">
        C
      </span>
    )
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      {service === "youtube" ? (
        <>
          <rect x="1" y="4" width="22" height="16" rx="5" fill="#ff4545" />
          <path d="m10 8 6 4-6 4Z" fill="#fff" />
        </>
      ) : service === "drive" ? (
        <>
          <path d="M8 2h8l-5 8-7 12-4-7Z" fill="#34a853" />
          <path d="m16 2 8 13h-9L8 2Z" fill="#fbbc04" />
          <path d="M4 22h16l4-7H8Z" fill="#4285f4" />
        </>
      ) : (
        <path
          fill="currentColor"
          d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49.99.1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.6-2.8 5.63-5.48 5.93.43.37.82 1.1.82 2.22v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"
        />
      )}
    </svg>
  )
}

function MaterialField({
  spec,
  value,
  onChange,
}: {
  spec: (typeof materialSpecs)[number]
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  const [touched, setTouched] = useState(false)
  const error = touched ? materialError(spec.key, value) : null
  return (
    <div className="pb-material-input">
      <label className="pb-field" htmlFor={id}>
        {spec.label}
        <input
          id={id}
          type="url"
          value={value}
          maxLength={2048}
          placeholder={spec.placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
          onBlur={() => setTouched(true)}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <p id={`${id}-help`} className="pb-material-help">
        {spec.instruction}
      </p>
      {error && (
        <p id={`${id}-error`} className="pb-material-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function ProjectMaterials({
  content,
  editing,
  onChange,
  onLinksChange,
}: {
  content?: Draft
  editing: boolean
  onChange: (key: MaterialKey, value: string) => void
  onLinksChange: (links: AdditionalMaterial[]) => void
}) {
  const links = content?.additionalMaterials ?? []
  function changeLink(id: string, changes: Partial<AdditionalMaterial>) {
    onLinksChange(links.map((link) => (link.id === id ? { ...link, ...changes } : link)))
  }
  return (
    <div className="pb-materials">
      <h2 className="pb-main-materials-heading">Main materials</h2>
      {editing && (
        <section className="pb-submission-rules" aria-labelledby="pb-submission-heading">
          <h3 id="pb-submission-heading">Before you submit</h3>
          <p>
            One submission per team, preferably completed by the team leader. All three components
            below are required for the final submission.
          </p>
          <p>
            Follow the{" "}
            <a href="#/resources" target="_blank" rel="noopener noreferrer">
              official templates and guidelines
            </a>
            . Check that every file is complete, finalised and shared correctly before submitting.
          </p>
          <p className="pb-submission-note">
            Submitted research materials and associated information may be published or showcased on
            MYResearchGuide’s official platforms and in programme publications.
          </p>
          <p className="pb-submission-note">
            Link formats are checked here. Check video length, resolution, slide count, file
            contents and sharing permissions before your final submission.
          </p>
        </section>
      )}
      {materialSpecs.map((spec) => {
        const value = content?.[spec.key] ?? ""
        const embed = materialEmbed(spec.key, value)
        const href = embed?.href ?? webUrl(value)?.href
        return (
          <section key={spec.key} className="pb-media-card" aria-label={spec.title}>
            <div className="pb-media-heading">
              <span className="pb-service-icon">
                <ServiceIcon service={spec.service} />
              </span>
              <div>
                <h3>{spec.title}</h3>
                <span>{spec.provider}</span>
              </div>
              {!editing && href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pb-material-open"
                  aria-label={`Open ${spec.title.toLowerCase()} in a new tab`}
                >
                  Open <ArrowUpRight size={15} />
                </a>
              )}
            </div>
            {editing && (
              <ul className="pb-material-rules">
                {spec.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            )}
            {editing ? (
              <MaterialField
                spec={spec}
                value={value}
                onChange={(next) => onChange(spec.key, next)}
              />
            ) : embed ? (
              <>
                <div className={`pb-media-frame pb-media-frame-${spec.key}`}>
                  <iframe
                    src={embed.src}
                    title={`${spec.title} on ${spec.provider}`}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    allow={
                      spec.key === "video"
                        ? "encrypted-media; picture-in-picture; fullscreen"
                        : "fullscreen"
                    }
                  />
                </div>
                <p className="pb-embed-note">
                  Preview not loading?{" "}
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    Open on {spec.provider.split(" · ")[0]} <ArrowUpRight size={12} />
                  </a>
                </p>
              </>
            ) : (
              <div className="pb-media-empty">
                <p>
                  {value.trim()
                    ? "This link does not support an embedded preview."
                    : "Not added yet"}
                </p>
              </div>
            )}
          </section>
        )
      })}
      <section className="pb-additional-materials" aria-labelledby="pb-additional-heading">
        <div className="pb-additional-heading">
          <h2 id="pb-additional-heading">Additional materials</h2>
          {editing && (
            <button
              className="pb-button"
              disabled={links.length >= MAX_ADDITIONAL_MATERIALS}
              onClick={() =>
                onLinksChange([...links, { id: crypto.randomUUID(), name: "", url: "" }])
              }
            >
              <Plus size={15} /> Add link
            </button>
          )}
        </div>
        {editing ? (
          <>
            <p className="pb-material-help">
              Link to code, datasets or other supporting work. Give each link a name.
            </p>
            <div className="pb-link-edit-list">
              {links.map((link, index) => (
                <div className="pb-link-edit-row" key={link.id}>
                  <div className="pb-link-edit-fields">
                    <label className="pb-field">
                      Link name
                      <input
                        aria-label={`Link ${index + 1} name`}
                        value={link.name}
                        maxLength={100}
                        placeholder="e.g. Code repository"
                        onChange={(event) => changeLink(link.id, { name: event.target.value })}
                      />
                    </label>
                    <label className="pb-field">
                      URL
                      <input
                        aria-label={`Link ${index + 1} URL`}
                        type="url"
                        value={link.url}
                        maxLength={2048}
                        placeholder="https://"
                        onChange={(event) => changeLink(link.id, { url: event.target.value })}
                      />
                    </label>
                  </div>
                  <button
                    className="pb-remove-link"
                    aria-label={`Remove link ${index + 1}`}
                    title="Remove link"
                    onClick={() => onLinksChange(links.filter((item) => item.id !== link.id))}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
            {links.length >= MAX_ADDITIONAL_MATERIALS && (
              <p className="pb-material-help">
                Up to {MAX_ADDITIONAL_MATERIALS} links per project.
              </p>
            )}
          </>
        ) : links.length ? (
          <div className="pb-supporting-links">
            {links.map((link) => {
              const url = webUrl(link.url)
              if (!url) return null
              const service = linkService(link.url)
              return (
                <a
                  key={link.id}
                  href={url.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pb-supporting-link"
                >
                  <span className="pb-service-icon">
                    <ServiceIcon service={service.icon} />
                  </span>
                  <span className="pb-supporting-link-copy">
                    <strong>{link.name}</strong>
                    <span>{service.label}</span>
                  </span>
                  <ArrowUpRight size={17} className="pb-link-arrow" />
                </a>
              )
            })}
          </div>
        ) : (
          <p className="pb-material-help">No additional materials yet.</p>
        )}
      </section>
    </div>
  )
}
