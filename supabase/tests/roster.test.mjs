import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const admin='00000000-0000-0000-0000-000000000001'
const alice='00000000-0000-0000-0000-000000000002'
const migration=name=>readFileSync(new URL(`../migrations/${name}.sql`,import.meta.url),'utf8')
const initial={projectId:'one',version:1,overviewFormat:'markdown',title:'Edited project',summary:'Preserve this abstract',question:'',method:'Method',findings:'Finding',slides:'',paper:'https://drive.google.com/file/d/example/view',video:'',savedAt:null,
  teamMembers:[{id:'one:member-1',name:'Alice edited',school:'School',bio:'Biography',photo:'data:image/jpeg;base64,YQ=='}]}

test('roster migration, reassignment, deletion and recovery preserve work and enforce access',async()=>{
  const db=new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`)
    await db.exec(migration('202611040001_myssp_access'))
    await db.exec(`insert into auth.users values('${admin}'),('${alice}'); insert into myssp_admins values('${admin}');
      insert into myssp_projects(id,code,payload) values('one','A-1','{"team":[{"name":"Alice","school":"Old school"}]}'),('two','A-2','{}');
      insert into myssp_participants(user_id,name,email,project_id) values('${alice}','Alice','alice@example.com','one');`)
    await db.query('insert into myssp_submissions(project_id,content) values($1,$2)',['one',initial])
    await db.exec(migration('202611040003_roster_and_trash'))
    const person=(await db.query('select id from myssp_participants')).rows[0].id
    const one=async sql=>(await db.query(sql)).rows[0]
    const members=async project=>(await db.query('select payload from myssp_projects where id=$1',[project])).rows[0].payload.team
    const submission=async() => one("select content,revision from myssp_submissions where project_id='one'")
    async function as(role,id=''){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role}`)}
    const remove=(kind,id,yes=true,destination=null)=>db.query('select myssp_set_deleted($1,$2,$3,$4)',[kind,id,yes,destination])
    const restored=await submission()
    assert.equal(restored.revision,2)
    assert.deepEqual(restored.content,{...initial,teamMembers:[{...initial.teamMembers[0],id:person}]})
    assert.equal((await members('one'))[0].memberId,person)
    assert.equal((await members('one'))[0].photo,initial.teamMembers[0].photo)
    assert.ok(!JSON.stringify(await members('one')).includes('alice@example.com'))
    await as('authenticated',alice)
    await assert.rejects(()=>remove('participant',person))
    await assert.rejects(()=>remove('project','one'))
    await assert.rejects(()=>db.exec('delete from myssp_participants'))
    await assert.rejects(()=>db.exec("update myssp_participants set deleted_at=now()"))
    await as('authenticated',admin)
    await db.exec("update myssp_projects set editing_enabled=true where id='one'")
    await db.query('select myssp_import_participants($1)',[[{name:'Bob',email:'bob@example.com',project_id:'one'}]])
    assert.equal((await members('one')).length,2)
    assert.equal((await submission()).content.summary,initial.summary)
    assert.equal((await submission()).revision,3)
    await as('authenticated',alice)
    const save=(body,rev)=>db.query('select myssp_save_submission($1,$2,$3)',['one',body,rev])
    await assert.rejects(()=>save(restored.content,restored.revision))
    const latest=await submission()
    await assert.rejects(()=>save({...latest.content,teamMembers:latest.content.teamMembers.slice(1)},latest.revision))
    await assert.rejects(()=>save({...latest.content,teamMembers:latest.content.teamMembers.map(m=>({...m,email:'private@example.com'}))},latest.revision))
    await save({...latest.content,teamMembers:latest.content.teamMembers.map(m=>m.id===person?{...m,bio:'Updated bio'}:m)},latest.revision)
    await as('authenticated',admin)
    await db.query("update myssp_participants set project_id='two' where id=$1",[person])
    assert.equal((await members('one')).length,1)
    assert.equal((await submission()).content.teamMembers.length,1)
    assert.equal((await members('two'))[0].bio,'Updated bio')
    assert.equal((await members('two'))[0].photo,initial.teamMembers[0].photo)
    await remove('participant',person)
    assert.deepEqual(await members('two'),[])
    await as('authenticated',alice)
    assert.equal((await one('select count(*)::int as n from myssp_projects')).n,0)
    assert.equal((await one('select count(*)::int as n from myssp_participants')).n,0)
    await as('service_role'); assert.equal((await db.query('select myssp_claim_invitation($1) as ok',[person])).rows[0].ok,false)
    await as('authenticated',admin)
    await remove('participant',person,false,'one')
    assert.equal((await members('one')).find(m=>m.memberId===person).bio,'Updated bio')
    await db.query('update myssp_participants set revoked=true where id=$1',[person])
    assert.equal((await members('one')).length,2) // revoking access is distinct from removing a student
    await db.query('update myssp_participants set revoked=false where id=$1',[person])
    await db.exec("update myssp_projects set published=true,editing_enabled=true where id='one'")
    await remove('project','one')
    assert.equal((await submission()).content.paper,initial.paper)
    await as('anon'); assert.equal((await one('select count(*)::int as n from myssp_projects')).n,0)
    assert.equal((await one('select count(*)::int as n from myssp_submissions')).n,0)
    await as('authenticated',alice)
    assert.equal((await one('select count(*)::int as n from myssp_projects')).n,0)
    await assert.rejects(()=>save(latest.content,latest.revision))
    await as('service_role'); assert.equal((await db.query('select myssp_claim_invitation($1) as ok',[person])).rows[0].ok,false)
    await as('authenticated',admin)
    await assert.rejects(()=>db.query('select myssp_import_participants($1)',[[{name:'X',email:'x@example.com',project_id:'one'}]]))
    await remove('participant',person)
    await assert.rejects(()=>remove('participant',person,false)) // parent still in Trash
    await remove('participant',person,false,'two')
    assert.equal((await members('two'))[0].memberId,person)
    await remove('project','one',false)
    assert.deepEqual(await one("select published,editing_enabled from myssp_projects where id='one'"),{published:false,editing_enabled:false})
    assert.equal((await submission()).content.summary,initial.summary)

    // A split follows the active roster and preserves profiles, without reviving deleted people.
    await db.query("update myssp_participants set project_id='one' where id=$1",[person])
    const bob=(await one("select id from myssp_participants where email='bob@example.com'")).id
    await remove('participant',bob)
    await db.query('select myssp_split_project($1,$2,$3)',['one',[
      {id:'one-a',code:'A-1A',payload:{title:'Split A'}},{id:'one-b',code:'A-1B',payload:{title:'Split B'}}
    ],{[person]:'one-a'}])
    assert.equal((await members('one-a'))[0].bio,'Updated bio')
    assert.deepEqual(await members('one-b'),[])
    await assert.rejects(()=>remove('participant',bob,false))
    await remove('participant',bob,false,'one-b')
    assert.equal((await members('one-b'))[0].name,'Bob')
  } finally { await db.close() }
})
