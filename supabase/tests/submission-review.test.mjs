import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import assert from 'node:assert/strict'
import {test} from 'node:test'

test('review queue checks complete content without images, keeps approvals private, rejects stale decisions and records corrections',async()=>{
  const db=new PGlite()
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`)
    for(const name of ['202611040001_myssp_access.sql','202611040003_roster_and_trash.sql','202611050001_participant_details.sql','202611050002_cohorts_and_projects.sql','202611060002_self_profile.sql','202611070001_mentor_access.sql','202611070002_submission_deadline.sql','202611070003_mentor_account_management.sql','202611210003_submission_review_queue.sql','202611210004_material_link_providers.sql','202611210006_material_provider_policy.sql'])
      await db.exec(readFileSync(new URL(`../migrations/${name}`,import.meta.url),'utf8'))
    const admin='00000000-0000-0000-0000-000000000001',student='00000000-0000-0000-0000-000000000002',other='00000000-0000-0000-0000-000000000003'
    await db.exec(`insert into auth.users values('${admin}','admin@example.test'),('${student}','student@example.test'),('${other}','other@example.test');insert into myssp_admins values('${admin}');
      insert into myssp_cohorts(year,name) values(2027,'MYSSP 2027');
      insert into myssp_projects(id,code,payload,published) values('one','A-1','{"year":2026,"title":"Original title","description":"Original brief","tasks":["Original method"],"team":[]}',false),('two','A-2','{"year":2026,"title":"Second","team":[]}',false),('future','A-1','{"year":2027,"title":"Future","team":[]}',false);
      insert into myssp_participants(user_id,name,email,project_id) values('${student}','Student','student@example.test','one');
      update myssp_projects set editing_enabled=true where id='one';update myssp_cohorts set submission_closes_at=clock_timestamp()+interval '1 day' where year=2026;`)
    const member=(await db.query('select id from myssp_participants')).rows[0].id
    const body={version:1,projectId:'one',overviewFormat:'markdown',title:'Final title',summary:'Our completed research',question:'What changes?',method:'We tested it',findings:'The measured results',coverImage:'data:image/jpeg;base64,'+'A'.repeat(100000),coverAlt:'Diagram',video:'https://youtu.be/M7lc1UVf-VE',slides:'https://canva.link/abc',paper:'https://drive.google.com/file/d/example_pdf/view',teamMembers:[{id:member,name:'Student',school:'School',bio:'My research role',photo:'data:image/jpeg;base64,YWJj'}],savedAt:'2026-11-20T10:00:00Z'}
    const as=async(role,id='')=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role};`)
    const queue=async(year=2026)=>(await db.query('select myssp_submission_review_queue($1) data',[year])).rows[0].data
    const save=(row,status='approved',notes='',checks=['links','guidelines','content','team'])=>db.query('select myssp_save_submission_review($1,$2,$3,$4,$5,$6)',[row.id,status,notes,JSON.stringify(checks),row.version,row.review?.revision??0])
    const own=async(project='one')=>(await db.query('select myssp_project_submission_review($1) data',[project])).rows[0].data
    await as('anon');await assert.rejects(()=>queue(),/permission denied/)
    await as('authenticated',student);await assert.rejects(()=>queue(),/Committee access required/)
    await assert.rejects(()=>save({id:'one',version:'x'}),/Committee access required/)
    await assert.rejects(()=>own('two'),/Project access required/)
    await as('authenticated',admin)
    let row=(await queue()).find(r=>r.id==='one')
    await assert.rejects(()=>save(row),/Complete missing content/)
    await assert.rejects(()=>save(row,'needs_changes',''),/Explain what/)
    await save(row,'needs_changes','Add your materials and profile photos.',[])
    await assert.rejects(()=>save(row,'needs_changes','Stale overwrite',[]),/project or review changed/)
    await as('authenticated',student)
    assert.equal((await own()).notes,'Add your materials and profile photos.')
    await assert.rejects(()=>db.query('select * from myssp_submission_reviews'),/permission denied/)
    await as('authenticated',other);await assert.rejects(()=>own(),/Project access required/)
    await as('authenticated',student)
    await db.query('select myssp_save_submission($1,$2,$3)',['one',body,0])
    await as('authenticated',admin)
    row=(await queue()).find(r=>r.id==='one')
    assert.notEqual(row.version,row.review.version)
    assert.ok(row.checklist.every(i=>i.done),JSON.stringify(row.checklist))
    assert.ok(JSON.stringify(await queue()).length<6500,'only small checklist metadata is returned')
    assert.ok(!JSON.stringify(await queue()).includes('data:image'))
    assert.deepEqual((await queue()).map(r=>r.code),['A-1','A-2'])
    await assert.rejects(()=>save(row,'approved','',[]),/four review checks/)
    await save(row)
    await as('authenticated',student);assert.equal((await own()).status,'approved');assert.equal((await own()).stale,false)
    await as('authenticated',admin)
    const stale=(await queue()).find(r=>r.id==='one')
    await as('authenticated',student)
    await db.query('select myssp_save_submission($1,$2,$3)',['one',{...body,findings:'New findings'},1])
    await as('authenticated',admin)
    await assert.rejects(()=>save(stale),/project or review changed/)
    await as('authenticated',student);assert.equal((await own()).stale,true)
    await as('authenticated',admin)
    await save((await queue()).find(r=>r.id==='one'))
    await as('postgres')
    assert.equal((await db.query('select count(*)::int n from myssp_submission_review_history')).rows[0].n,3)
    assert.equal((await db.query("select published from myssp_projects where id='one'")).rows[0].published,false)
    // Legacy unrelated saves remain possible; new wrong-provider links fail on the server.
    await db.query("alter table myssp_submissions disable trigger myssp_material_links")
    await db.query("update myssp_submissions set content=jsonb_set(content,'{video}','\"https://legacy.example/video\"') where project_id='one'")
    await db.query("alter table myssp_submissions enable trigger myssp_material_links")
    await db.query("update myssp_submissions set content=jsonb_set(content,'{title}','\"Unrelated edit\"') where project_id='one'")
    await assert.rejects(()=>db.query("update myssp_submissions set content=jsonb_set(content,'{paper}','\"https://wrong.example/file\"') where project_id='one'"),/Google Drive/)
    // Server and client agree on required items, including original brief and profile gaps.
    const load=name=>readFileSync(new URL(`../../src/components/projectboard/${name}`,import.meta.url),'utf8')
    const module=src=>`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(src)).toString('base64')}`
    const {materialError}=await import(module(load('materials.ts')))
    const providerLinks={
      video:['https://youtu.be/M7lc1UVf-VE','https://youtube.com/watch?v=M7lc1UVf-VE&feature=shared','https://youtube.com/shorts/M7lc1UVf-VE'],
      slides:['https://canva.link/xr1tgcwosi65q23','https://www.canva.com/design/ABC/token/edit','https://www.canva.com/design/ABC/view?embed'],
      paper:['https://drive.google.com/file/d/file_123/view','https://drive.google.com/file/u/0/d/file_123/preview?resourcekey=token','https://drive.google.com/open?id=file_123'],
      rejected:['https://docs.google.com/presentation/d/example/edit','https://drive.google.com/drive/folders/abc','https://canva.com.attacker.test/design/ABC/view','https://youtube.com@attacker.test/watch?v=M7lc1UVf-VE'],
    }
    for(const field of ['video','slides','paper']) for(const [provider,urls] of Object.entries(providerLinks)) for(const url of urls) {
      const allowed=provider===field
      const error=(await db.query('select myssp_material_link_error($1,$2) error',[field,url])).rows[0].error
      assert.equal(error===null,allowed,`SQL ${field}: ${url}`)
      assert.equal(materialError(field,url)===null,allowed,`Client ${field}: ${url}`)
      if(!allowed) await assert.rejects(()=>db.query('update myssp_submissions set content=jsonb_set(content,ARRAY[$1],to_jsonb($2::text)) where project_id=$3',[field,url,'one']),/Use a /)
    }
    const {submissionChecklist}=await import(module(load('submission-checklist.ts').replace('"./materials"',JSON.stringify(module(load('materials.ts')))).replace('"./overview"',JSON.stringify(module(load('overview.ts'))))))
    const board={id:'one',title:'Original title',description:'Original brief',tasks:['Original method'],team:[{memberId:member,name:'Student'}]}
    for(const c of [body,{...body,summary:'Original  brief',method:'- Original method',video:'',slides:'javascript:alert(1)',coverAlt:'',teamMembers:[]}]) {
      await as('postgres')
      const sql=(await db.query('select myssp_submission_checklist($1,$2) data',[board,c])).rows[0].data
      assert.deepEqual(sql.map(i=>[i.id,i.done]),submissionChecklist(board,c).map(i=>[i.id,i.done]))
    }
  } finally {await db.close()}
})
