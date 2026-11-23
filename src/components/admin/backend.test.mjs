import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"
import { test } from "node:test"
import { createHash } from "node:crypto"
const policySource = stripTypeScriptTypes(readFileSync(new URL('./refresh-policy.ts', import.meta.url), 'utf8')).replace('export function', 'function')

// Exercise the live adapter with a fake transport, never a real Supabase project.
const source = stripTypeScriptTypes(readFileSync(new URL("./backend.ts", import.meta.url), "utf8"))
  .replace(/^import .*$/gm, "")
  .replace('!isLocalPreview || import.meta.env.VITE_ACCESS_MODE === "supabase"', "true")
let nextFixture = 0
async function fixture(loadContent = true) {
  const transport = { user: "student", isAdmin: false, deadlines: [], failRead: false, failSession: false, failSignOut: false, failSave: false, revision: 2, title: "Before save", saveCalls: 0, tables: {}, queries: [], snapshots: 0, largeRecords: 0 }
  let authChanged
  const response = table => transport.failRead ? { error: new Error("Offline") } : { error: null, data:
    transport.tables[table] ?? (table === "myssp_projects" ? [{ id: "one", code: "A-1", payload: { title: "Project one" }, published: true, editing_enabled: true }] :
    table === "myssp_participants" ? [{ id: "member", name: "Test", email: "test@example.test", project_id: "one", revoked: false }] :
    table === "myssp_submissions" ? [{ project_id: "one", content: { projectId: "one", title: transport.title }, revision: transport.revision }] : []) }
  const supabase = {
    auth: {
      getSession: async () => transport.failSession
        ? { data: { session: null }, error: new Error("Auth temporarily unavailable") }
        : { data: { session: transport.user ? { user: { id: transport.user } } : null }, error: null },
      onAuthStateChange: callback => { authChanged = callback },
      signOut: async options => {
        assert.equal(options.scope, "local")
        if (transport.failSignOut) return { error: new Error("Sign-out failed") }
        transport.user = null
        authChanged("SIGNED_OUT", null)
        return { error: null }
      },
    },
    from: table => {
      let select, id
      const query = {
        select: value => { select = value; return query }, eq: (key,value) => { if (key === "project_id") id=value; return query },
        maybeSingle: async () => {
          transport.queries.push({table,select,id})
          const result=response(table)
          const row=result.data?.find(d=>d.project_id===id)
          const data=row ? {cache_version:`draft-${row.revision}`,content:row.content,cover:row.content.coverImage,revision:row.revision} : null
          await transport.contentGate
          return {data,error:result.error}
        },
      }
      return query
    },
    rpc: async (name, args) => {
      if (transport.rpcErrors?.[name]) return {data:null,error:transport.rpcErrors[name]}
      if (name === "myssp_is_admin") return { data: false, error: null }
      if (name === "myssp_submission_deadlines") return { data: [], error: null }
      if (name === "myssp_backend_snapshot_v2") {
        transport.snapshots++
        if (transport.failRead) return {data:null,error:{message:"Offline"}}
        const delta=(table,known={})=>response(table).data.map(record=>{
          const version=createHash("sha256").update(JSON.stringify(record)).digest("hex")
          const changed=known[record.id]!==version
          transport.largeRecords+=Number(changed)
          return {id:record.id,version,record:changed ? record : null}
        })
        const data={projects:delta("myssp_projects",args.known.projects),people:transport.user ? delta("myssp_participants",args.known.people) : [],
          submissions:response("myssp_submissions").data.map(row=>({project_id:row.project_id,version:`draft-${row.revision}`,revision:row.revision,title:row.content.title,hasCover:!!row.content.coverImage})),
          isAdmin:transport.isAdmin,fields:[],deadlines:transport.deadlines,cohorts:[],adminProfile:null,
          mentors:response("myssp_mentors").data,mentorProjects:response("myssp_mentor_projects").data}
        await transport.snapshotGate
        return {data,error:null}
      }
      if (name === "myssp_set_submission_deadline") {
        transport.deadlineArgs = args
        if (transport.deadlineError) return {data:null,error:transport.deadlineError}
        const cutoff = args.close_now ? new Date().toISOString() : args.closing_time
        transport.deadlines = [{year:args.cohort_year,closes_at:cutoff}]
        transport.afterWrite?.()
        return {data:cutoff,error:null}
      }
      assert.equal(name, "myssp_save_submission")
      transport.saveCalls++
      if (transport.failSave || args.expected_revision !== transport.revision) return { error: new Error("Rejected") }
      transport.title = args.body.title
      transport.revision++
      transport.afterWrite?.()
      return { error: null }
    },
  }
  const key = `__mysspBackendFixture${++nextFixture}`
  globalThis[key] = supabase
  const prefix = `${policySource}\nconst supabase=globalThis.${key}; const isDraft=()=>true; const useSyncExternalStore=(_,get)=>get(); const window={setTimeout(){},setInterval(){},addEventListener(){}}; const document={visibilityState:'hidden',addEventListener(){}};\n`
  const api = await import(`data:text/javascript;base64,${Buffer.from(prefix + source).toString("base64")}`)
  delete globalThis[key]
  await api.refreshBackend()
  if (loadContent) await api.loadLiveProjectContent("one")
  return { api, transport }
}

test("a reused code uses only the replacement in lists while preserving the deleted record in Trash", async () => {
  const {api,transport} = await fixture(false)
  transport.isAdmin = true
  const payload = {title:'Project',year:2026,team:[]}
  transport.tables.myssp_projects = [
    {id:'old',code:'A-6',payload,deleted_at:'2026-11-23T00:00:00Z'},
    {id:'replacement',code:'A-6',payload,deleted_at:null,published:false,editing_enabled:false},
  ]
  transport.tables.myssp_mentors = [{id:'mentor',name:'Mentor',email:'mentor@example.test'}]
  transport.tables.myssp_mentor_projects = [{mentor_id:'mentor',project_id:'old'}]
  await api.refreshBackend()
  const state = api.getBackend()
  assert.deepEqual(state.boards.map(b=>b.id),['replacement'])
  assert.deepEqual(state.projects.map(b=>b.id),['replacement'])
  assert.deepEqual(state.deletedProjects.map(b=>b.id),['old'])
  assert.deepEqual(state.mentors[0].projectIds,[])
  assert.deepEqual(state.visibility,{replacement:false})
  assert.deepEqual(state.editing,{replacement:false})
})

test("duplicate creates, splits and restores explain the conflict without blaming deleted projects", async () => {
  const {api,transport} = await fixture(false)
  transport.isAdmin = true
  transport.rpcErrors = Object.fromEntries(['myssp_save_project_brief','myssp_split_project','myssp_set_deleted'].map(name=>[name,{code:'23505'}]))
  await api.refreshBackend()
  await assert.rejects(()=>api.saveLiveProject({code:'A-6',year:2026}),/existing project or split parent/)
  await assert.rejects(()=>api.setDeletedLive('project','old',false),/Move that project to Trash/)
  assert.match(await api.splitLiveProject({parentId:'parent'},[],{}),/team code is already used/)
})

test("failed refresh preserves the signed-in participant and saved work", async () => {
  const { api, transport } = await fixture()
  transport.failRead = true
  await api.refreshBackend()
  assert.equal(api.getBackend().userId, "student")
  assert.equal(api.liveProject(), "one")
  assert.equal(api.getBackend().drafts.one.title, "Before save")
  assert.ok(api.getBackend().error)
})

test("temporary auth errors preserve the session, but expiry clears private data even offline", async () => {
  const { api, transport } = await fixture()
  transport.failSession = true
  await api.refreshBackend()
  assert.equal(api.getBackend().userId, "student")
  assert.equal(api.liveProject(), "one")
  transport.failSession = false
  transport.user = null
  transport.failRead = true
  await api.refreshBackend()
  assert.equal(api.getBackend().userId, null)
  assert.deepEqual(api.getBackend().drafts, {})
  assert.deepEqual(api.getBackend().people, [])
})

test("restoring a revoked participant session does not restore project access", async () => {
  const { api, transport } = await fixture()
  transport.tables = { myssp_participants: [], myssp_projects: [], myssp_submissions: [] }
  await api.refreshBackend()
  assert.equal(api.getBackend().userId, "student")
  assert.equal(api.liveProject(), null)
  assert.deepEqual(api.getBackend().drafts, {})
})

test("mentor view keeps both split pages and drops the retired parent assignment", async () => {
  const { api, transport } = await fixture()
  transport.tables = {
    myssp_projects: ['a','b'].map(team=>({id:`child-${team}`,code:`I-2${team.toUpperCase()}`,payload:{title:`Team ${team}`},published:false})),
    myssp_mentors: [{id:'mentor',user_id:'student',name:'Test Mentor',email:'mentor@example.test',affiliation:'University',revoked:false}],
    myssp_mentor_projects: ['parent','child-a','child-b'].map(project_id=>({mentor_id:'mentor',project_id})),
  }
  await api.refreshBackend()
  assert.deepEqual(api.getBackend().mentors[0].projectIds,['child-a','child-b'])
  assert.deepEqual(api.getBackend().boards.map(board=>board.code),['I-2A','I-2B'])
})

test("confirmed save remains visible if the following refresh fails", async () => {
  const { api, transport } = await fixture()
  transport.afterWrite = () => { transport.failRead = true }
  assert.equal(await api.saveLiveDraft({ projectId: "one", title: "Saved title" }, 2), true)
  assert.equal(api.getBackend().drafts.one.title, "Saved title")
  assert.equal(api.getBackend().revisions.one, 3)
  assert.equal(api.getBackend().userId, "student")
  transport.failRead = false
  await api.refreshBackend()
  await api.loadLiveProjectContent("one")
  assert.equal(api.getBackend().drafts.one.title, "Saved title")
})

test("another project cannot be saved and stale revisions are rejected", async () => {
  const { api, transport } = await fixture()
  assert.equal(await api.saveLiveDraft({ projectId: "other", title: "No" }, 2), false)
  assert.equal(transport.saveCalls, 0)
  assert.equal(await api.saveLiveDraft({ projectId: "one", title: "Stale" }, 1), false)
  assert.equal(api.getBackend().drafts.one.title, "Before save")
})

test("failed sign-out preserves the session so the user can retry", async () => {
  const { api, transport } = await fixture()
  transport.failSignOut = true
  await assert.rejects(api.signOutLive())
  assert.equal(api.getBackend().userId, "student")
  transport.failSignOut = false
  await api.signOutLive()
  assert.equal(api.getBackend().userId, null)
  assert.equal(api.liveProject(), null)
})

test("sign-out during an in-flight save cannot restore the previous session", async () => {
  const { api, transport } = await fixture()
  transport.afterWrite = () => { transport.user = null }
  await api.saveLiveDraft({ projectId: "one", title: "Saved before sign-out" }, 2)
  assert.equal(api.getBackend().userId, null)
  assert.equal(api.liveProject(), null)
})

test("idle refreshes transfer no unchanged large rows and never fetch full submissions", async () => {
  const {api,transport}=await fixture(false)
  const original=transport.largeRecords
  for (let i=0;i<120;i++) await api.refreshBackend(false)
  assert.equal(transport.largeRecords,original)
  assert.deepEqual(transport.queries,[])
  assert.equal(api.getBackend().summaries.one.title,"Before save")
  assert.deepEqual(api.getBackend().drafts,{})
})

test("project content is scoped, deduplicated and reused until its version changes", async () => {
  const {api,transport}=await fixture(false)
  await Promise.all([api.loadLiveProjectContent("one"),api.loadLiveProjectContent("one"),api.loadLiveProjectContent("unknown")])
  assert.equal(transport.queries.length,1)
  assert.equal(transport.queries[0].id,"one")
  await api.loadLiveProjectContent("one")
  assert.equal(transport.queries.length,1)
  transport.revision++; transport.title="Teammate edit"
  await api.refreshBackend()
  assert.equal(transport.queries.length,1)
  assert.notEqual(api.getBackend().draftVersions.one,api.getBackend().summaries.one.version)
  await api.loadLiveProjectContent("one")
  assert.equal(api.getBackend().drafts.one.title,"Teammate edit")
  assert.equal(transport.queries.length,2)
})

test("archive cover requests exclude the rest of the submission", async () => {
  const {api,transport}=await fixture(false)
  transport.tables.myssp_submissions=[{project_id:"one",revision:3,content:{title:"Title",coverImage:"data:image/jpeg;base64,photo"}}]
  await api.refreshBackend()
  await api.loadLiveProjectContent("one",true)
  assert.equal(transport.queries[0].select,"cache_version,cover:content->>coverImage")
  assert.equal(api.getBackend().covers.one.image,"data:image/jpeg;base64,photo")
  assert.deepEqual(api.getBackend().drafts,{})
})

test("concurrent background refreshes share one request but mutations get a trailing read", async () => {
  const {api,transport}=await fixture(false)
  let release
  transport.snapshotGate=new Promise(resolve=>{release=resolve})
  const start=transport.snapshots
  const first=api.refreshBackend(false)
  await Promise.resolve()
  const second=api.refreshBackend(false)
  assert.equal(first,second)
  const mutation=api.refreshBackend(true)
  release()
  await Promise.all([first,second,mutation])
  assert.equal(transport.snapshots-start,2)
})

test("a signed-out user's in-flight content cannot repopulate private caches", async () => {
  const {api,transport}=await fixture(false)
  let release
  transport.contentGate=new Promise(resolve=>{release=resolve})
  const request=api.loadLiveProjectContent("one")
  await api.signOutLive()
  release(); await request
  assert.deepEqual(api.getBackend().drafts,{})
  assert.deepEqual(api.getBackend().covers,{})
})

test("removing read access prunes cached pages and images even without signing out", async () => {
  const {api,transport}=await fixture()
  transport.tables={myssp_projects:[],myssp_participants:[],myssp_submissions:[]}
  await api.refreshBackend()
  assert.deepEqual(api.getBackend().drafts,{})
  assert.deepEqual(api.getBackend().covers,{})
  assert.deepEqual(api.getBackend().draftVersions,{})
})

test("only committee can schedule editing and RPC failures do not change the cached deadline", async () => {
  const {api,transport}=await fixture(false)
  const old="2026-11-20T16:00:00Z",next="2026-11-25T16:00:00Z"
  await assert.rejects(()=>api.setLiveSubmissionDeadline(2026,next,old,true),/Committee sign-in required/)
  assert.equal(transport.deadlineArgs,undefined)
  transport.isAdmin=true
  transport.deadlines=[{year:2026,closes_at:old}]
  await api.refreshBackend()
  transport.deadlineError={code:"40001",message:"The deadline changed. Close this window and try again."}
  await assert.rejects(()=>api.setLiveSubmissionDeadline(2026,next,old,true),/deadline changed/)
  assert.equal(api.getBackend().submissionDeadlines[2026],old)
  transport.deadlineError={code:"PGRST202"}
  await assert.rejects(()=>api.setLiveSubmissionDeadline(2026,next,old,true),/latest database update/)
})

test("a confirmed deadline change survives a failed refresh without changing visibility or another cohort", async () => {
  const {api,transport}=await fixture(false)
  const old="2026-11-20T16:00:00Z",next="2026-11-25T16:00:00Z"
  transport.isAdmin=true
  transport.deadlines=[{year:2026,closes_at:old}]
  transport.tables.myssp_projects=[
    {id:"one",code:"A-1",payload:{year:2026},published:false,editing_enabled:false},
    {id:"other",code:"A-1",payload:{year:2027},published:false,editing_enabled:false},
  ]
  await api.refreshBackend()
  transport.afterWrite=()=>{transport.failRead=true}
  await api.setLiveSubmissionDeadline(2026,next,old,true)
  assert.deepEqual(transport.deadlineArgs,{cohort_year:2026,closing_time:next,expected_closing_time:old,reopen_projects:true,close_now:false})
  assert.equal(api.getBackend().submissionDeadlines[2026],next)
  assert.deepEqual(api.getBackend().editing,{one:true,other:false})
  assert.deepEqual(api.getBackend().visibility,{one:false,other:false})
  assert.ok(api.getBackend().error)
})

test("a deadline response arriving after sign-out cannot restore committee state", async () => {
  const {api,transport}=await fixture(false)
  transport.isAdmin=true
  await api.refreshBackend()
  transport.afterWrite=()=>{void api.signOutLive();transport.failRead=true}
  await api.setLiveSubmissionDeadline(2026,null,null,true)
  assert.equal(api.getBackend().userId,null)
  assert.equal(api.getBackend().isAdmin,false)
  assert.deepEqual(api.getBackend().submissionDeadlines,{})
})
