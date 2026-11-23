import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
const source = stripTypeScriptTypes(readFileSync(new URL('./refresh-policy.ts',import.meta.url),'utf8'))
const {backendRefreshDue} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('public background polling drops 90%, signed-in polling halves, and foreground checks refresh sooner',()=>{
  for (const [signedIn,expected] of [[false,12],[true,60]]) {
    let last=0, reads=0
    for (let now=30_000;now<=3_600_000;now+=30_000) {
      if (backendRefreshDue(last,now,signedIn)) {last=now;reads++}
    }
    assert.equal(reads,expected)
  }
  assert.equal(backendRefreshDue(1000,15_999,false,true),false)
  assert.equal(backendRefreshDue(1000,16_000,false,true),true)
})
