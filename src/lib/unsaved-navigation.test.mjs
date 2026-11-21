import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { runInNewContext } from "node:vm"
import { test } from "node:test"

const source = stripTypeScriptTypes(readFileSync(new URL("./unsaved-navigation.ts", import.meta.url), "utf8")).replace("export function", "function")
function harness({ answer = false, busy = false } = {}) {
  const listeners = new Map()
  const window = {
    location: { href: "http://localhost/#/profile/settings" },
    confirm: () => { window.prompts++; return answer }, prompts: 0,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
  }
  window.history = { state: null, replaceState: (_state, _title, url) => { window.location.href = url } }
  class Element { closest() { return this } }
  class HTMLAnchorElement extends Element {
    constructor({ href = "http://localhost/#/profile/projects", target = "", download = false } = {}) { super(); Object.assign(this, { href, target, download }) }
    hasAttribute(name) { return name === "download" && this.download }
  }
  const document = { addEventListener: window.addEventListener, removeEventListener: window.removeEventListener }
  const cleanup = runInNewContext(`${source}; protectUnsavedNavigation("Discard changes?", busy)`, { window, document, Element, HTMLAnchorElement, busy })
  const event = extra => ({ prevented: false, stopped: false, button: 0, preventDefault() { this.prevented = true }, stopPropagation() { this.stopped = true }, stopImmediatePropagation() { this.stopped = true }, ...extra })
  const click = (anchor, extra) => { const e = event({ target: new HTMLAnchorElement(anchor), ...extra }); listeners.get("click")(e); return e }
  const navigate = url => { window.location.href = url; const e = event(); listeners.get("hashchange")(e); return e }
  return { window, listeners, cleanup, event, click, navigate }
}

test("cancelled profile links and history navigation retain the form URL", () => {
  const h = harness()
  assert.equal(h.click().prevented, true)
  const event = h.navigate("http://localhost/#/project-archive")
  assert.equal(event.stopped, true)
  assert.equal(h.window.location.href, "http://localhost/#/profile/settings")
  assert.equal(h.window.prompts, 2)
})

test("confirmed links prompt once and permit the router's hash event", () => {
  const h = harness({ answer: true })
  assert.equal(h.click().prevented, false)
  assert.equal(h.navigate("http://localhost/#/profile/projects").stopped, false)
  assert.equal(h.window.prompts, 1)
  assert.equal(h.navigate("http://localhost/#/").stopped, false)
  assert.equal(h.window.prompts, 2)
})

test("saving or processing photos blocks navigation without offering discard", () => {
  const h = harness({ answer: true, busy: true })
  assert.equal(h.click().prevented, true)
  assert.equal(h.navigate("http://localhost/#/").stopped, true)
  assert.equal(h.window.prompts, 0)
})

test("downloads, new tabs and modified clicks leave the dirty form available", () => {
  const h = harness()
  for (const anchor of [{ download: true }, { target: "_blank" }, { href: h.window.location.href }]) assert.equal(h.click(anchor).prevented, false)
  for (const extra of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) assert.equal(h.click({}, extra).prevented, false)
  assert.equal(h.window.prompts, 0)
})

test("reloads warn and cleanup removes every registered handler", () => {
  const h = harness()
  const event = h.event()
  h.listeners.get("beforeunload")(event)
  assert.equal(event.prevented, true)
  assert.equal(event.returnValue, "")
  h.cleanup()
  assert.equal(h.listeners.size, 0)
})
