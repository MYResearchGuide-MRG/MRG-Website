import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {test} from 'node:test'
const {reviewStatus,reviewError,reviewCsv}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(readFileSync(new URL('./review-model.ts',import.meta.url),'utf8'))).toString('base64'))
const row={id:'one',code:'A-1',title:'Title',year:2026,version:'v2',savedAt:null,checklist:[{id:'video',label:'Video',detail:'Add a link',done:false,section:'materials'}],review:null}
test('completion, approval and changed content remain separate',()=>{
  assert.equal(reviewStatus(row),'incomplete')
  const ready={...row,checklist:[{...row.checklist[0],done:true}]}
  assert.equal(reviewStatus(ready),'ready')
  assert.match(reviewError(row,'approved','',['links','guidelines','content','team']),/missing content/)
  assert.match(reviewError(ready,'approved','',[]),/four review/)
  assert.ok(reviewError(ready,'needs_changes',' ',[]))
  assert.equal(reviewError(ready,'approved','',['links','guidelines','content','team']),null)
  assert.equal(reviewStatus({...ready,review:{status:'approved',version:'v2'}}),'approved')
  assert.equal(reviewStatus({...ready,review:{status:'approved',version:'v1'}}),'resubmitted')
  assert.equal(reviewStatus({...row,review:{status:'needs_changes',version:'v2'}}),'needs_changes')
})
test('missing-content CSV quotes text and neutralises spreadsheet formulas',()=>{
  const csv=reviewCsv([{...row,title:'=HYPERLINK("https://example.com")'}])
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.com"")"'))
  assert.ok(csv.includes('Video: Add a link'))
})
