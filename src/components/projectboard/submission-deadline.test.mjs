import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {test} from 'node:test'
const source=stripTypeScriptTypes(readFileSync(new URL('./submission-deadline.ts',import.meta.url),'utf8'))
const {deadlineToInput,deadlineFromInput,submissionClosed,submissionDeadlineLabel}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('Malaysia deadline inputs round-trip the full last minute independently of device timezone',()=>{
  const cutoff='2026-11-20T16:00:00.000Z'
  assert.equal(deadlineToInput(cutoff),'2026-11-20T23:59')
  assert.equal(deadlineFromInput('2026-11-20T23:59'),cutoff)
  assert.equal(submissionClosed(cutoff,Date.parse('2026-11-20T15:59:59.999Z')),false)
  assert.equal(submissionClosed(cutoff,Date.parse(cutoff)),true)
  assert.match(submissionDeadlineLabel(cutoff),/20 November 2026, 11:59 pm MYT/)
  assert.equal(deadlineFromInput('2026-11-25T17:30'),'2026-11-25T09:31:00.000Z')
})
test('invalid dates are rejected, leap days and no deadline remain supported',()=>{
  for(const input of ['', '2026-02-30T12:00','2026-11-21T25:00','2026-13-01T12:00','not-a-date']) assert.equal(deadlineFromInput(input),null)
  assert.equal(deadlineFromInput('2028-02-29T23:59'),'2028-02-29T16:00:00.000Z')
  assert.equal(deadlineToInput(null),'')
  assert.equal(submissionClosed(null),false)
})
