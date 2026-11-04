import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
const moduleUrl=source=>`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`
const model=moduleUrl(readFileSync(new URL('./access-model.ts',import.meta.url),'utf8'))
const source=readFileSync(new URL('./participant-tools.ts',import.meta.url),'utf8').replace('"./access-model"',JSON.stringify(model))
const {filterParticipants,participantsCsv,validateParticipantDetails}=await import(moduleUrl(source))
const projects=[{id:'one',code:'A-2'},{id:'two',code:'A-10'}]
const people=[
  {id:'b',name:'Beth',email:'beth@example.com',projectId:'two',revoked:false,displayProfile:{school:'North College'}},
  {id:'a',name:'Alex, "C"',email:'alex@example.com',projectId:'one',revoked:true,code:'SECRET',displayProfile:{school:'South College'}}
]
test('combined roster filters and natural project sorting keep the source roster intact',()=>{
  assert.deepEqual(filterParticipants(people,projects,'','','','project',0).map(p=>p.id),['a','b'])
  assert.equal(people[0].id,'b')
  assert.deepEqual(filterParticipants(people,projects,'north','two','','name',0).map(p=>p.id),['b'])
  assert.equal(filterParticipants(people,projects,'north','one','','name',0).length,0)
  assert.equal(filterParticipants(people,projects,'A-10','','','name',0)[0].id,'b')
})
test('CSV export quotes correctly, blocks formula injection and excludes credentials',()=>{
  const csv=participantsCsv([...people,{...people[0],name:'=HYPERLINK("x")'}],projects,0)
  assert.ok(csv.includes('"Alex, ""C"""'))
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'))
  assert.ok(!csv.includes('SECRET'))
})
test('participant details require a bounded name and a valid project',()=>{
  const good={name:'Alex',school:'College',projectId:'one',revoked:false}
  assert.equal(validateParticipantDetails(good,projects),'')
  for(const patch of [{name:'  '},{name:'x'.repeat(101)},{school:'x'.repeat(201)},{projectId:'missing'}])
    assert.ok(validateParticipantDetails({...good,...patch},projects))
})
