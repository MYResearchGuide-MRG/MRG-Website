import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

// Exercise the live adapter with a fake transport, never a real Supabase project.
const source = stripTypeScriptTypes(readFileSync(new URL("./backend.ts", import.meta.url), "utf8"))
  .replace(/^import .*$/gm, "")
  .replace('!isLocalPreview || import.meta.env.VITE_ACCESS_MODE === "supabase"', "true")
let nextFixture = 0
async function fixture() {
  const transport = { user: "student", failRead: false, failSignOut: false, failSave: false, revision: 2, title: "Before save", saveCalls: 0 }
  let authChanged
  const response = table => transport.failRead ? { error: new Error("Offline") } : { error: null, data:
    table === "myssp_projects" ? [{ id: "one", code: "A-1", payload: { title: "Project one" }, published: true, editing_enabled: true }] :
    table === "myssp_participants" ? [{ id: "member", name: "Test", email: "test@example.test", project_id: "one", revoked: false }] :
    table === "myssp_submissions" ? [{ project_id: "one", content: { projectId: "one", title: transport.title }, revision: transport.revision }] : [] }
  const supabase = {
    auth: {
      getSession: async () => ({ data: { session: transport.user ? { user: { id: transport.user } } : null } }),
      onAuthStateChange: callback => { authChanged = callback },
      signOut: async options => {
        assert.equal(options.scope, "local")
        if (transport.failSignOut) return { error: new Error("Sign-out failed") }
        transport.user = null
        authChanged("SIGNED_OUT", null)
        return { error: null }
      },
    },
    from: table => {
      const query = { select: () => query, eq: () => query, order: () => query, then: (resolve, reject) => Promise.resolve(response(table)).then(resolve, reject) }
      return query
    },
    rpc: async (name, args) => {
      if (name === "myssp_is_admin") return { data: false, error: null }
      assert.equal(name, "myssp_save_submission")
      transport.saveCalls++
      if (transport.failSave || args.expected_revision !== transport.revision) return { error: new Error("Rejected") }
      transport.title = args.body.title
      transport.revision++
      transport.afterWrite?.()
      return { error: null }
    },
  }
  const key = `__mysspBackendFixture${++nextFixture}`
  globalThis[key] = supabase
  const prefix = `const supabase=globalThis.${key}; const isDraft=()=>true; const useSyncExternalStore=(_,get)=>get(); const window={setTimeout(){},setInterval(){}}; const document={visibilityState:'hidden'};\n`
  const api = await import(`data:text/javascript;base64,${Buffer.from(prefix + source).toString("base64")}`)
  delete globalThis[key]
  await api.refreshBackend()
  return { api, transport }
}

test("failed refresh preserves the signed-in participant and saved work", async () => {
  const { api, transport } = await fixture()
  transport.failRead = true
  await api.refreshBackend()
  assert.equal(api.getBackend().userId, "student")
  assert.equal(api.liveProject(), "one")
  assert.equal(api.getBackend().drafts.one.title, "Before save")
  assert.ok(api.getBackend().error)
})

test("confirmed save remains visible if the following refresh fails", async () => {
  const { api, transport } = await fixture()
  transport.afterWrite = () => { transport.failRead = true }
  assert.equal(await api.saveLiveDraft({ projectId: "one", title: "Saved title" }, 2), true)
  assert.equal(api.getBackend().drafts.one.title, "Saved title")
  assert.equal(api.getBackend().revisions.one, 3)
  assert.equal(api.getBackend().userId, "student")
  transport.failRead = false
  await api.refreshBackend()
  assert.equal(api.getBackend().drafts.one.title, "Saved title")
})

test("another project cannot be saved and stale revisions are rejected", async () => {
  const { api, transport } = await fixture()
  assert.equal(await api.saveLiveDraft({ projectId: "other", title: "No" }, 2), false)
  assert.equal(transport.saveCalls, 0)
  assert.equal(await api.saveLiveDraft({ projectId: "one", title: "Stale" }, 1), false)
  assert.equal(api.getBackend().drafts.one.title, "Before save")
})

test("failed sign-out preserves the session so the user can retry", async () => {
  const { api, transport } = await fixture()
  transport.failSignOut = true
  await assert.rejects(api.signOutLive())
  assert.equal(api.getBackend().userId, "student")
  transport.failSignOut = false
  await api.signOutLive()
  assert.equal(api.getBackend().userId, null)
  assert.equal(api.liveProject(), null)
})

test("sign-out during an in-flight save cannot restore the previous session", async () => {
  const { api, transport } = await fixture()
  transport.afterWrite = () => { transport.user = null }
  await api.saveLiveDraft({ projectId: "one", title: "Saved before sign-out" }, 2)
  assert.equal(api.getBackend().userId, null)
  assert.equal(api.liveProject(), null)
})
