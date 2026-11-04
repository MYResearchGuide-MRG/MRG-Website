import { lazy, Suspense, useId, useRef, useState } from "react"
import { Bold, Italic, Heading2, List, Sigma } from "lucide-react"
import type { OverviewFormat } from "./data"

const MarkdownContent = lazy(() => import("./MarkdownContent"))

export function OverviewContent({
  text,
  format = "plain",
}: {
  text: string
  format?: OverviewFormat
}) {
  return (
    <div className={`pb-rich-text ${format === "plain" ? "pb-plain-text" : ""}`}>
      {format === "markdown" ? (
        <Suspense fallback={<p className="pb-plain-text">{text}</p>}>
          <MarkdownContent text={text} />
        </Suspense>
      ) : (
        text
      )}
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
  format,
  onChange,
  maxLength,
  rows = 7,
}: {
  label: string
  value: string
  format: OverviewFormat
  onChange: (value: string) => void
  maxLength: number
  rows?: number
}) {
  const id = useId()
  const input = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)
  const [notice, setNotice] = useState("")

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
          {preview ? "Edit text" : "Preview"}
        </button>
      </div>
      <div className="pb-writing-box">
        {!preview && (
          <div className="pb-writing-tools" role="group" aria-label={`${label} formatting`}>
            {format === "markdown" && (
              <>
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
              </>
            )}
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
              <OverviewContent text={value} format={format} />
            ) : (
              <p className="pb-muted">Nothing to preview yet.</p>
            )}
          </div>
        ) : (
          <textarea
            ref={input}
            id={id}
            aria-describedby={`${id}-help`}
            value={value}
            rows={rows}
            maxLength={maxLength}
            className={format === "markdown" ? "is-markdown" : ""}
            onChange={(e) => {
              onChange(e.target.value)
              setNotice("")
            }}
            onKeyDown={(e) => {
              if (format !== "markdown" || !(e.ctrlKey || e.metaKey)) return
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
          {format === "markdown" ? (
            <>
              Inline maths: <code>$x^2$</code>. Equations: <code>$$...$$</code>.
            </>
          ) : (
            "Plain text. Symbols such as α, π and ≤ are supported."
          )}
        </span>
        <span>
          {value.length.toLocaleString()}/{maxLength.toLocaleString()}
        </span>
      </div>
      {notice && (
        <p className="pb-small-note" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
