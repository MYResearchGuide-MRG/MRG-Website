import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

const access = stripTypeScriptTypes(readFileSync(new URL('./access-model.ts',import.meta.url),'utf8'))
const { importRecords } = await import(`data:text/javascript;base64,${Buffer.from(access).toString('base64')}`)
globalThis.__importRecords = importRecords
const source = stripTypeScriptTypes(readFileSync(new URL('./mentor-model.ts',import.meta.url),'utf8'))
  .replace(/^import .*$/gm,'')
const { parseMentorCsv, mentorInputError } = await import(`data:text/javascript;base64,${Buffer.from(`const importRecords=globalThis.__importRecords;\n${source}`).toString('base64')}`)
globalThis.__importRecords = undefined

const boards = [
  {id:'one',code:'A-1'}, {id:'two',code:'A-2'},
]
test('mentor import maps one mentor to multiple projects and catches duplicate email',()=>{
  const rows = parseMentorCsv('name,email,affiliation,project_codes\n"Dr. Example",EXAMPLE@MAIL.COM,University,A-1;A-2\nOther,example@mail.com,Lab,A-1',boards,[])
  assert.deepEqual(rows[0].projectIds,['one','two'])
  assert.equal(rows[0].email,'example@mail.com')
  assert.equal(rows[0].error,'')
  assert.match(rows[1].error,/more than once/)
})
test('mentor details require an assigned valid project',()=>{
  assert.match(mentorInputError({name:'Dr. Example',email:'example@mail.com',affiliation:'',projectIds:[],revoked:false},boards,[]),/Assign/)
})
