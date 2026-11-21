import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire, stripTypeScriptTypes } from "node:module"
import { runInNewContext } from "node:vm"
import { test } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const read = file => readFileSync(new URL(file, import.meta.url), "utf8")
const materials = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(read("./materials.ts"))).toString("base64")}`)
const require = createRequire(import.meta.url)
const exports = {}
runInNewContext(ts.transpileModule(read("./ProjectMaterials.tsx"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText, { exports, require: name => name === "./materials" ? materials : name === "./canva-preview" ? {resolveCanvaPreview:async()=>null} : require(name) })

function render(content) {
  return renderToStaticMarkup(createElement(exports.ProjectMaterials, {
    content, editing: false, onChange() {}, onLinksChange() {},
  }))
}

test("non-embeddable materials remain visible as working external links", () => {
  const links = {
    video: "https://vimeo.com/123456789",
    slides: "https://canva.link/xr1tgcwosi65q23",
    paper: "https://example.com/research.pdf",
  }
  const html = render(links)
  for (const href of Object.values(links)) assert.ok(html.includes(`href="${href}"`))
  assert.equal((html.match(/class="pb-material-open"/g) || []).length, 3)
  assert.equal(html.includes("<iframe"), false)
  assert.ok(html.includes("Canva"))
  assert.ok(html.includes("vimeo.com"))
  assert.ok(html.includes("example.com"))
})

test("recognised providers keep previews while unsafe links never render", () => {
  const html = render({
    video: "https://youtu.be/M7lc1UVf-VE",
    slides: "https://www.canva.com/design/ABC/view",
    paper: "https://drive.google.com/file/d/abcdefghijk/view",
  })
  assert.equal((html.match(/<iframe/g) || []).length, 3)
  const unsafe = render({video:"javascript:alert(1)",slides:"data:text/html,test",paper:"not a link"})
  assert.equal(unsafe.includes("<iframe"), false)
  assert.equal(unsafe.includes('class="pb-material-open"'), false)
})

test("Canva slides render inline automatically while editing, without a preview-button step", () => {
  const html = renderToStaticMarkup(createElement(exports.ProjectMaterials, {
    content: {slides:"https://www.canva.com/design/ABC/token/edit"},
    editing: true, onChange() {}, onLinksChange() {},
  }))
  assert.ok(html.includes('src="https://www.canva.com/design/ABC/token/view?embed"'))
  assert.ok(html.includes("Reload preview"))
  assert.ok(html.includes("Enable the Canva preview"))
  assert.ok(html.includes("Share → See all → Embed"))
  assert.ok(html.includes("Smart embed link"))
  assert.equal(html.includes("Preview link"), false)
  const short = renderToStaticMarkup(createElement(exports.ProjectMaterials, {
    content: {slides:"https://canva.link/example"},
    editing: true, onChange() {}, onLinksChange() {},
  }))
  assert.ok(short.includes("Preparing Canva preview"))
  assert.equal(short.includes("Preview link"), false)
})
