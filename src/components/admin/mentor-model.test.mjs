import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

const access = stripTypeScriptTypes(readFileSync(new URL('./access-model.ts',import.meta.url),'utf8'))
const { importRecords } = await import(`data:text/javascript;base64,${Buffer.from(access).toString('base64')}`)
globalThis.__importRecords = importRecords
const source = stripTypeScriptTypes(readFileSync(new URL('./mentor-model.ts',import.meta.url),'utf8'))
  .replace(/^import .*$/gm,'')
const { parseMentorCsv, mentorInputError, resolvePreviewMentorProjects } = await import(`data:text/javascript;base64,${Buffer.from(`const importRecords=globalThis.__importRecords;\n${source}`).toString('base64')}`)
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

const splitBoards = [
  {id:'team-a',code:'I-2A',year:2026,affiliation:'University'},
  {id:'team-b',code:'I-2B',year:2026,affiliation:'University'},
  {id:'unrelated',code:'I-20A',year:2026},
]
const csv = codes => `name,email,affiliation,project_codes\nTest Mentor,mentor@example.test,,${codes}`

test('parent CSV code resolves both split teams and displays their actual codes',()=>{
  const [row] = parseMentorCsv(csv('i-2'),splitBoards,[])
  assert.equal(row.error,'')
  assert.deepEqual(row.projectIds,['team-a','team-b'])
  assert.equal(row.affiliation,'University')
  assert.deepEqual(row.projectIds.map(id=>splitBoards.find(board=>board.id===id).code),['I-2A','I-2B'])
})

test('explicit child codes stay scoped and overlapping codes do not duplicate access',()=>{
  assert.deepEqual(parseMentorCsv(csv('I-2A'),splitBoards,[])[0].projectIds,['team-a'])
  assert.deepEqual(parseMentorCsv(csv('I-2B'),splitBoards,[])[0].projectIds,['team-b'])
  const [row] = parseMentorCsv(csv('I-2;I-2A;I-2B;I-2'),splitBoards,[])
  assert.equal(row.error,'')
  assert.deepEqual(row.projectIds,['team-a','team-b'])
})

test('unknown and lookalike codes cannot grant partial or unrelated access',()=>{
  for (const code of ['I-2C','I-2.*','I-','I-2;NOT-1']) {
    assert.match(parseMentorCsv(csv(code),splitBoards,[])[0].error,/Unknown project code/)
  }
  assert.deepEqual(parseMentorCsv(csv('I-20'),splitBoards,[])[0].projectIds,['unrelated'])
})

test('import uses the selected cohort and rejects ambiguous cross-cohort codes',()=>{
  const future = splitBoards.slice(0,2).map(board=>({...board,id:`future-${board.id}`,year:2027}))
  assert.deepEqual(parseMentorCsv(csv('I-2'),future,[])[0].projectIds,['future-team-a','future-team-b'])
  assert.match(parseMentorCsv(csv('I-2'),[...splitBoards,...future],[])[0].error,/one cohort/)
})

test('unsplit projects keep their exact assignment',()=>{
  const [row] = parseMentorCsv(csv('I-2'),[{id:'parent',code:'I-2',year:2026}],[])
  assert.equal(row.error,'')
  assert.deepEqual(row.projectIds,['parent'])
})

test('preview mentors keep both split projects while child-only access stays separate',()=>{
  const splits = [{parentId:'parent',teams:[{id:'team-a'},{id:'team-b'}]}]
  assert.deepEqual(resolvePreviewMentorProjects(['parent'],splitBoards,splits),['team-a','team-b'])
  assert.deepEqual(resolvePreviewMentorProjects(['team-a'],splitBoards,splits),['team-a'])
  assert.deepEqual(resolvePreviewMentorProjects(['parent','team-a','deleted'],splitBoards,splits),['team-a','team-b'])
  assert.deepEqual(resolvePreviewMentorProjects(['parent'],[{id:'parent'}],[]),['parent'])
})
