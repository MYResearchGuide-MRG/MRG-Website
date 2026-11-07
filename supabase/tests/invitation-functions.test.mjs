import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

function fixture(kind, { signedIn = true, admin = true, deliveryFails = false } = {}) {
  const id = '00000000-0000-0000-0000-000000000001'
  const row = { id, user_id: id, email: 'test@example.test', revoked: false }
  let handler, sends = 0, serviceCreated = false
  const metadata = { display_name: 'Test account' }
  const updates = []
  const service = {
    from: table => {
      let single = false
      const query = {
        select: () => query, in: () => query, eq: () => query,
        update: () => query, is: () => query,
        maybeSingle: () => { single = true; return query },
        then: (resolve, reject) => Promise.resolve({ error: null, data: single ? null : table === `myssp_${kind}` ? [row] : [] }).then(resolve, reject),
      }
      return query
    },
    rpc: async () => ({ data: true, error: null }),
    auth: { admin: {
      getUserById: async () => ({ data: { user: { email: row.email, user_metadata: { ...metadata } } }, error: null }),
      updateUserById: async (_, update) => {
        updates.push(update)
        // Supabase Auth merges metadata; null deletes a key.
        for (const [key, value] of Object.entries(update.user_metadata || {})) {
          if (value === null) delete metadata[key]
          else metadata[key] = value
        }
        return { error: null }
      },
    } },
  }
  const createClient = (_, key, options) => {
    if (key === 'service') { serviceCreated = true; return service }
    if (options.global) return {
      auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'committee' } : null }, error: null }) },
      rpc: async () => ({ data: admin, error: null }),
    }
    return { auth: { resetPasswordForEmail: async email => {
      assert.equal(email, row.email)
      assert.match(metadata.myssp_access_code, /^[A-HJ-NP-Z2-9]{6}$/)
      sends++
      return { error: deliveryFails ? new Error('Mail unavailable') : null }
    } } }
  }
  const source = stripTypeScriptTypes(readFileSync(new URL(`../functions/invite-${kind}/index.ts`, import.meta.url), 'utf8')).replace(/^import .*$/gm, '')
  runInNewContext(source, {
    createClient, Response, Uint8Array,
    crypto: { getRandomValues: bytes => { bytes.fill(0); return bytes } },
    Deno: { env: { get: name => name === 'SUPABASE_SERVICE_ROLE_KEY' ? 'service' : 'anon' }, serve: callback => { handler = callback } },
  })
  return {
    call: () => handler(new Request('https://example.test/invite', { method: 'POST', body: JSON.stringify({ ids: [id] }) })),
    metadata, updates, sends: () => sends, serviceCreated: () => serviceCreated,
  }
}

for (const kind of ['mentors', 'participants']) {
  test(`${kind}: only verified committee users may invoke invitations`, async () => {
    for (const [options, status] of [[{ signedIn: false }, 401], [{ admin: false }, 403]]) {
      const f = fixture(kind, options)
      assert.equal((await f.call()).status, status)
      assert.equal(f.serviceCreated(), false)
      assert.equal(f.sends(), 0)
    }
  })
  test(`${kind}: codes are removed from metadata after successful and failed delivery`, async () => {
    for (const deliveryFails of [false, true]) {
      const f = fixture(kind, { deliveryFails })
      const response = await f.call()
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { sent: deliveryFails ? 0 : 1, failed: deliveryFails ? 1 : 0 })
      assert.equal(f.sends(), 1)
      assert.equal(f.metadata.display_name, 'Test account')
      assert.equal('myssp_access_code' in f.metadata, false)
      assert.equal(f.updates.at(-1).user_metadata.myssp_access_code, null)
    }
  })
}
