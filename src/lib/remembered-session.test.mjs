import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"
import { createClient } from "@supabase/supabase-js"

const source = stripTypeScriptTypes(readFileSync(new URL("./remembered-session.ts", import.meta.url), "utf8"))
const { createRememberedSessionStorage, REMEMBERED_SESSION_MS } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)
const key = "sb-test-auth-token"
const day = 24 * 60 * 60 * 1000
const jwt = claims => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.test-signature`
const session = (id = "session-1", user = "participant", refresh = "refresh-1") => ({
  access_token: jwt({ session_id: id, sub: user, exp: Math.floor(Date.now() / 1000) + 3600 }),
  refresh_token: refresh, token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: user, email: `${user}@example.test`, app_metadata: {}, user_metadata: {} },
})
function fixture() {
  const data = new Map()
  let time = Date.now()
  const disk = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }
  const open = () => createRememberedSessionStorage(key, () => disk, () => time)
  return { data, disk, open, advance: ms => { time += ms } }
}

for (const role of ["participant", "mentor", "admin"]) {
  test(`${role} session survives browser reopening for 30 days, then expires`, () => {
    const f = fixture()
    const value = JSON.stringify(session("first", role))
    f.open().setItem(key, value)
    f.advance(29 * day)
    assert.equal(f.open().getItem(key), value)
    f.advance(day - 1)
    assert.equal(f.open().getItem(key), value)
    f.advance(1)
    assert.equal(f.open().getItem(key), null)
    assert.equal(f.disk.getItem(key), null)
    assert.equal(f.disk.getItem(`${key}-remembered-v1`).includes("refresh-1"), false)
  })
}

test("refreshes and new tabs preserve the original expiry and cannot resurrect it", () => {
  const f = fixture()
  const tab = f.open()
  tab.setItem(key, JSON.stringify(session()))
  const expiry = f.disk.getItem(`${key}-remembered-v1`)
  f.advance(20 * day)
  tab.setItem(key, JSON.stringify(session("session-1", "participant", "rotated-token")))
  assert.equal(f.disk.getItem(`${key}-remembered-v1`), expiry)
  f.advance(10 * day)
  assert.equal(f.open().getItem(key), null)
  tab.setItem(key, JSON.stringify(session("session-1", "participant", "late-refresh")))
  assert.equal(tab.getItem(key), null)
  assert.equal(f.disk.getItem(key), null)
})

test("new sign-ins and switching accounts get a fresh window", () => {
  const f = fixture()
  const tab = f.open()
  tab.setItem(key, JSON.stringify(session()))
  f.advance(31 * day)
  assert.equal(tab.getItem(key), null)
  tab.setItem(key, JSON.stringify(session("new-sign-in")))
  f.advance(29 * day)
  assert.ok(tab.getItem(key))
  tab.setItem(key, JSON.stringify(session("admin-sign-in", "admin")))
  f.advance(29 * day)
  assert.equal(JSON.parse(f.open().getItem(key)).user.id, "admin")
})

test("sign-out and site-data clearing are seen by other tabs without stale memory", () => {
  const f = fixture()
  const tab = f.open()
  const other = f.open()
  tab.setItem(key, JSON.stringify(session()))
  assert.ok(other.getItem(key))
  other.removeItem(key)
  assert.equal(tab.getItem(key), null)
  assert.equal(f.data.size, 0)
  tab.setItem(key, JSON.stringify(session("second")))
  f.data.clear()
  assert.equal(tab.getItem(key), null)
})

test("existing Supabase sessions migrate without changing the token format", () => {
  const f = fixture()
  const value = JSON.stringify(session())
  f.disk.setItem(key, value)
  assert.equal(f.open().getItem(key), value)
  assert.equal(f.disk.getItem(key), value)
  assert.ok(f.disk.getItem(`${key}-remembered-v1`))
  f.advance(REMEMBERED_SESSION_MS)
  assert.equal(f.open().getItem(key), null)
})

test("unavailable or quota-limited storage falls back to the current tab", () => {
  for (const disk of [() => { throw Error("blocked") }, () => ({getItem: () => null, setItem: () => { throw Error("quota") }, removeItem() {}})]) {
    const tab = createRememberedSessionStorage(key, disk)
    const value = JSON.stringify(session())
    tab.setItem(key, value)
    assert.equal(tab.getItem(key), value)
    tab.removeItem(key)
    assert.equal(tab.getItem(key), null)
    assert.equal(createRememberedSessionStorage(key, disk).getItem(key), null)
  }
})

test("corrupt sessions are discarded and non-session storage is unchanged", () => {
  const f = fixture()
  const tab = f.open()
  f.disk.setItem(key, "not-json")
  assert.equal(tab.getItem(key), null)
  tab.setItem(key, JSON.stringify({ user: { id: "x" }, access_token: "invalid" }))
  assert.equal(tab.getItem(key), null)
  tab.setItem(`${key}-code-verifier`, "verifier")
  assert.equal(tab.getItem(`${key}-code-verifier`), "verifier")
})

test("actual Supabase client restores, refreshes, expires and signs out without real accounts", async t => {
  const f = fixture()
  const requests = []
  let active = session("sdk-session", "admin")
  const clients = []
  function open() {
    const client = createClient("https://test.supabase.co", "public-test-key", {
      auth: { storageKey: key, storage: f.open(), persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async (url, options) => {
        requests.push(String(url))
        if (String(url).includes("/logout")) return new Response("{}", { status: 200 })
        const body = JSON.parse(options.body)
        if (String(url).includes("grant_type=password") && body.password !== "test-only") {
          return new Response(JSON.stringify({msg:"Invalid login",error_code:"invalid_credentials"}), {status:400})
        }
        return new Response(JSON.stringify(active), {status:200,headers:{"Content-Type":"application/json"}})
      } },
    })
    clients.push(client)
    return client
  }
  t.after(() => clients.forEach(client => client.auth.stopAutoRefresh()))
  const first = open()
  assert.equal((await first.auth.signInWithPassword({email:"admin@example.test",password:"test-only"})).error, null)
  f.advance(20 * day)
  const reopened = open()
  assert.equal((await reopened.auth.getSession()).data.session.user.id, "admin")
  const expiry = f.disk.getItem(`${key}-remembered-v1`)
  active = session("sdk-session", "admin", "rotated")
  assert.equal((await reopened.auth.refreshSession()).error, null)
  assert.equal(f.disk.getItem(`${key}-remembered-v1`), expiry)
  assert.equal((await reopened.auth.signInWithPassword({email:"admin@example.test",password:"wrong"})).error.code, "invalid_credentials")
  assert.equal(f.disk.getItem(`${key}-remembered-v1`), expiry)
  f.advance(10 * day)
  const requestsBeforeExpiry = requests.length
  assert.equal((await reopened.auth.getSession()).data.session, null)
  assert.equal((await open().auth.getSession()).data.session, null)
  assert.equal(requests.length, requestsBeforeExpiry, "expired session must not refresh")
  active = session("new-sdk-session", "admin")
  assert.equal((await reopened.auth.signInWithPassword({email:"admin@example.test",password:"test-only"})).error, null)
  assert.equal((await reopened.auth.signOut({scope:"local"})).error, null)
  assert.equal((await first.auth.getSession()).data.session, null)
  assert.equal(f.disk.getItem(`${key}-remembered-v1`), null)
})
