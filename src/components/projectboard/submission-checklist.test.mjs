import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
const load = file => readFileSync(new URL(file, import.meta.url), "utf8")
const source = load("./submission-checklist.ts")
  .replace('"./materials"', JSON.stringify(moduleUrl(load("./materials.ts"))))
  .replace('"./overview"', JSON.stringify(moduleUrl(load("./overview.ts"))))
const { submissionChecklist, submissionFingerprint, submissionReviewed } = await import(moduleUrl(source))
const { submissionClosed, submissionDeadlines } = await import(moduleUrl(load("./submission-deadline.ts")))
const board = {id:"one",description:"Original brief",tasks:["Original method"],team:[{memberId:"member",name:"Student"}]}
const image = "data:image/jpeg;base64,YWJj"
const complete = {title:"Research title",coverImage:image,coverAlt:"Experiment",summary:"Our completed research",question:"What happens?",method:"We measured outcomes",findings:"We found a change",teamMembers:[{id:"member",name:"Student",school:"School",bio:"My research role",photo:image}],video:"https://youtu.be/M7lc1UVf-VE",slides:"https://www.canva.com/design/ABC/view",paper:"https://drive.google.com/file/d/abcdefghijk/view",additionalMaterials:[]}

test("required content and each photo are checked; additional materials remain optional",()=>{
  assert.ok(submissionChecklist(board,complete).every(item=>item.done))
  for(const key of ["title","coverImage","coverAlt","summary","question","method","findings","video","slides","paper"])
    assert.ok(submissionChecklist(board,{...complete,[key]:""}).some(item=>!item.done),key)
  for(const key of ["name","school","bio","photo"])
    assert.equal(submissionChecklist(board,{...complete,teamMembers:[{...complete.teamMembers[0],[key]:""}]}).find(item=>item.id==="member-0").done,false,key)
  assert.equal(submissionChecklist(board,{...complete,teamMembers:[]}).find(item=>item.id==="member-0").done,false)
  assert.equal(submissionChecklist(board,{...complete,summary:" Original  brief ",method:"- Original method"}).filter(item=>["summary","method"].includes(item.id)).every(item=>!item.done),true)
  assert.equal(submissionChecklist(board,{...complete,video:"https://evil.example/watch?v=M7lc1UVf-VE"}).find(item=>item.id==="video").done,false)
})
test("final review expires when required content changes and survives unrelated save metadata",()=>{
  const reviewed={...complete,reviewedFingerprint:submissionFingerprint(complete)}
  assert.ok(submissionReviewed(reviewed))
  assert.ok(submissionReviewed({...reviewed,savedAt:"2026-11-10",additionalMaterials:[{name:"Extra"}]}))
  assert.equal(submissionReviewed({...reviewed,summary:"New text"}),false)
  assert.equal(submissionReviewed({...reviewed,teamMembers:[{...complete.teamMembers[0],photo:""}]}),false)
})
test("cutoff includes all of 20 November in Malaysia and has no effect on unset cohorts",()=>{
  const cutoff=submissionDeadlines[2026]
  assert.equal(submissionClosed(cutoff,Date.parse("2026-11-20T23:59:59.999+08:00")),false)
  assert.equal(submissionClosed(cutoff,Date.parse("2026-11-21T00:00:00+08:00")),true)
  assert.equal(submissionClosed(cutoff,Date.parse("2026-11-20T16:00:00Z")),true)
  assert.equal(submissionClosed(submissionDeadlines[2027],Date.parse("2027-12-01")),false)
})
