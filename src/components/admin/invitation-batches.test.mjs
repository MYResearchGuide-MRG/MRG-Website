import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

const source = stripTypeScriptTypes(readFileSync(new URL('./invitation-batches.ts', import.meta.url), 'utf8'))
const { sendInvitationBatches } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const recipients = Array.from({ length: 123 }, (_, index) => `participant-${index}`)

test('a selection larger than the server limit sends each recipient once, sequentially', async () => {
  const deliveries = []
  let running = false
  const result = await sendInvitationBatches([...recipients, recipients[0]], async ids => {
    assert.equal(running, false)
    running = true
    await new Promise(resolve => setImmediate(resolve))
    assert.ok(ids.length > 0 && ids.length <= 50)
    deliveries.push(...ids)
    running = false
    return { sent: ids.length, failed: 0 }
  })
  assert.deepEqual(deliveries, recipients)
  assert.deepEqual(result, { sent: 123, failed: 0 })
})

test('empty selections send nothing and per-recipient failures are counted accurately', async () => {
  assert.deepEqual(await sendInvitationBatches([], () => assert.fail('No request expected')), { sent: 0, failed: 0 })
  const result = await sendInvitationBatches(recipients, async ids => ({ sent: ids.length - 1, failed: 1 }))
  assert.deepEqual(result, { sent: 120, failed: 3 })
})

test('a failed request stops later batches without retrying or claiming delivery', async () => {
  let calls = 0
  await assert.rejects(sendInvitationBatches(recipients, async ids => {
    calls++
    if (calls === 2) throw new Error('Connection interrupted')
    return { sent: ids.length - 1, failed: 1 }
  }), /49 access codes confirmed sent; 1 failed.*next 50 participants could not be confirmed.*23 remaining participants were not attempted/)
  assert.equal(calls, 2)
})

test('incomplete responses are not treated as successful sends', async () => {
  for (const response of [null, {sent: 0, failed: 0}, {sent: 51, failed: -1}]) {
    let calls = 0
    await assert.rejects(sendInvitationBatches(recipients, async () => {
      calls++
      return response
    }), /could not be confirmed/)
    assert.equal(calls, 1)
  }
})
