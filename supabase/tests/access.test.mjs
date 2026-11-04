import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'

test('database enforces publication, assignment, editing locks, admin access and concurrent saves', async()=>{
  const db=new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`)
  await db.exec(readFileSync(new URL('../migrations/202611040001_myssp_access.sql',import.meta.url),'utf8'))
  await db.exec(readFileSync(new URL('../migrations/202611040003_roster_and_trash.sql',import.meta.url),'utf8'))
  const admin='00000000-0000-0000-0000-000000000001',alice='00000000-0000-0000-0000-000000000002',bob='00000000-0000-0000-0000-000000000003'
  await db.exec(`insert into auth.users values('${admin}'),('${alice}'),('${bob}');
    insert into public.myssp_admins values('${admin}');
    insert into public.myssp_projects(id,code,payload) values('one','A-1','{}'),('two','A-2','{}');
    insert into public.myssp_participants(user_id,name,email,project_id) values('${alice}','Alice','alice@example.com','one'),('${bob}','Bob','bob@example.com','two');`)
  async function as(role,id='') {await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`)}
  const count=async table=>(await db.query(`select count(*)::int as n from ${table}`)).rows[0].n
  const roster=(await db.query('select id,name,project_id from myssp_participants')).rows
  const body=id=>({projectId:id,version:1,overviewFormat:'markdown',title:'Title',summary:'Abstract',question:'',method:'',findings:'',slides:'',paper:'',video:'',teamMembers:roster.filter(p=>p.project_id===id).map(p=>({id:p.id,name:p.name,school:'',bio:'',photo:''}))})
  const save=(id,revision=0,content=body(id))=>db.query('select public.myssp_save_submission($1,$2,$3)',[id,content,revision])
  await as('anon'); assert.equal(await count('myssp_projects'),0)
  await assert.rejects(()=>count('myssp_participants'))
  await assert.rejects(()=>db.query('select myssp_import_participants($1)',[[{name:'X',email:'x@example.com',project_id:'one'}]]))
  await as('authenticated',alice)
  assert.equal(await count('myssp_projects'),1); assert.equal(await count('myssp_participants'),1)
  await assert.rejects(()=>save('one')) // default locked
  await assert.rejects(()=>db.exec("insert into myssp_admins values(auth.uid())"))
  assert.equal((await db.query("update myssp_projects set published=true where id='one' returning id")).rows.length,0)
  await as('authenticated',admin)
  await db.exec("update myssp_projects set editing_enabled=true where id='one'")
  await as('authenticated',alice)
  await save('one') // hidden but editable
  await assert.rejects(()=>save('two'))
  await assert.rejects(()=>save('one',1,body('two'))) // immutable project identity
  await assert.rejects(()=>save('one',1,{...body('one'),summary:'x'.repeat(1501)}))
  await assert.rejects(()=>save('one',1,{...body('one'),title:null}))
  await assert.rejects(()=>db.query('select myssp_auth_user_for_email($1)',['someone@example.com']))
  await assert.rejects(()=>db.exec("update myssp_projects set code='HACK' where id='one'"))
  await assert.rejects(()=>save('one',0)) // concurrent stale version
  await save('one',1)
  await as('authenticated',bob); assert.equal(await count('myssp_submissions'),0)
  await as('anon'); assert.equal(await count('myssp_submissions'),0)
  await as('authenticated',admin)
  await db.exec("update myssp_projects set published=true,editing_enabled=false where id='one'")
  await as('anon'); assert.equal(await count('myssp_submissions'),1)
  await as('authenticated',alice); await assert.rejects(()=>save('one',2)) // public but locked
  await as('authenticated',admin)
  await db.exec("update myssp_projects set published=false,editing_enabled=true where id='one'; update myssp_participants set revoked=true where user_id='"+alice+"'")
  await as('authenticated',alice); assert.equal(await count('myssp_submissions'),0); await assert.rejects(()=>save('one',2))
  await as('authenticated',admin)
  await db.exec("update myssp_participants set revoked=false,project_id='two' where user_id='"+alice+"'")
  await as('authenticated',alice); await assert.rejects(()=>save('one',2))
  await as('authenticated',admin)
  await assert.rejects(()=>db.query('select myssp_import_participants($1)',[[{name:'X',email:'x@example.com',project_id:'one'},{name:'Y',email:'y@example.com',project_id:'missing'}]]))
  assert.equal(await count('myssp_participants'),2) // import is atomic
  await db.close()
})
