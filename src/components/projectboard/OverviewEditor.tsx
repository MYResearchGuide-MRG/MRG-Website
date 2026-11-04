import { lazy, Suspense, useId, useRef, useState } from "react"
import { Bold, Italic, Heading2, List, Sigma } from "lucide-react"

const MarkdownContent = lazy(() => import("./MarkdownContent"))

export function OverviewContent({ text }: { text: string }) {
  return (
    <div className="pb-rich-text">
      <Suspense fallback={<p className="pb-plain-text">{text}</p>}>
        <MarkdownContent text={text} />
      </Suspense>
    </div>
  )
}

const symbols = [
  "α",
  "β",
  "γ",
  "δ",
  "θ",
  "λ",
  "μ",
  "π",
  "σ",
  "Δ",
  "Σ",
  "√",
  "∞",
  "±",
  "×",
  "÷",
  "≤",
  "≥",
  "≠",
  "²",
  "₀",
  "₁",
  "₂",
]

export function OverviewEditor({
  label,
  value,
  onChange,
  maxLength,
  rows = 7,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  maxLength: number
  rows?: number
}) {
  const id = useId()
  const input = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)
  const [notice, setNotice] = useState("")
  const overLimit = value.length > maxLength

  function insert(before: string, after = "", placeholder = "") {
    const area = input.current
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const selected = value.slice(start, end) || placeholder
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    if (next.length > maxLength) {
      setNotice("This field has reached its character limit.")
      return
    }
    setNotice("")
    onChange(next)
    requestAnimationFrame(() => {
      area.focus()
      area.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  return (
    <div className="pb-overview-field">
      <div className="pb-writing-heading">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="pb-text-button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Edit Markdown" : "Preview"}
        </button>
      </div>
      <div className="pb-writing-box">
        {!preview && (
          <div className="pb-writing-tools" role="group" aria-label={`${label} formatting`}>
            <button
              type="button"
              aria-label="Bold"
              title="Bold"
              onClick={() => insert("**", "**", "text")}
            >
              <Bold size={15} />
            </button>
            <button
              type="button"
              aria-label="Italic"
              title="Italic"
              onClick={() => insert("*", "*", "text")}
            >
              <Italic size={15} />
            </button>
            <button
              type="button"
              aria-label="Heading"
              title="Heading"
              onClick={() => insert("\n\n## ", "\n", "Heading")}
            >
              <Heading2 size={17} />
            </button>
            <button
              type="button"
              aria-label="Bullet list"
              title="Bullet list"
              onClick={() => insert("\n- ", "", "Item")}
            >
              <List size={17} />
            </button>
            <button type="button" onClick={() => insert("$", "$", "E = mc^2")}>
              <Sigma size={15} /> Inline maths
            </button>
            <button type="button" onClick={() => insert("\n\n$$\n", "\n$$\n", "\\frac{a}{b}")}>
              Equation
            </button>
            <select
              aria-label={`Insert symbol in ${label.toLowerCase()}`}
              value=""
              onChange={(e) => insert(e.target.value)}
            >
              <option value="" disabled>
                Math symbol
              </option>
              {symbols.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
        )}
        {preview ? (
          <div className="pb-writing-preview" role="region" aria-label={`${label} preview`}>
            {value.trim() ? (
              <OverviewContent text={value} />
            ) : (
              <p className="pb-muted">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <textarea
            ref={input}
            id={id}
            aria-describedby={`${id}-help${overLimit ? ` ${id}-error` : ""}`}
            aria-invalid={overLimit}
            value={value}
            rows={rows}
            maxLength={maxLength}
            className="is-markdown"
            onChange={(e) => {
              const next = e.target.value
              // Also cover paste/input methods that bypass native maxLength.
              // Older over-limit drafts can still be shortened without data loss.
              if (next.length > maxLength && next.length >= value.length) {
                setNotice(`Keep this section within ${maxLength.toLocaleString()} characters.`)
                return
              }
              onChange(next)
              setNotice("")
            }}
            onKeyDown={(e) => {
              if (!(e.ctrlKey || e.metaKey)) return
              if (e.key === "b" || e.key === "i") {
                e.preventDefault()
                const marker = e.key === "b" ? "**" : "*"
                insert(marker, marker, "text")
              }
            }}
          />
        )}
      </div>
      <div className="pb-writing-help" id={`${id}-help`}>
        <span>
          Inline maths: <code>$x^2$</code>. Equations: <code>$$...$$</code>.
        </span>
        <span>
          {value.length.toLocaleString()}/{maxLength.toLocaleString()} characters
        </span>
      </div>
      {overLimit && (
        <p className="pb-small-note" id={`${id}-error`} role="alert">
          Shorten this section by {(value.length - maxLength).toLocaleString()} characters before
          saving.
        </p>
      )}
      {notice && (
        <p className="pb-small-note" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
