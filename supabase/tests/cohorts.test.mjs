import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const admin='00000000-0000-0000-0000-000000000001'
const student='00000000-0000-0000-0000-000000000002'
const migration=name=>readFileSync(new URL(`../migrations/${name}.sql`,import.meta.url),'utf8')

test('cohorts isolate project codes and access; committee creation keeps new work private',async()=>{
  const db=new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;`)
    await db.exec(migration('202611040001_myssp_access'))
    await db.exec(`insert into auth.users values('${admin}'),('${student}'); insert into myssp_admins values('${admin}');
      insert into myssp_projects(id,code,payload) values('legacy','A-1','{"title":"Legacy research","team":[]}');`)
    await db.exec(migration('202611040003_roster_and_trash'))
    await db.exec(migration('202611050001_participant_details'))
    await db.exec(migration('202611050002_cohorts_and_projects'))
    await db.exec(migration('202611060001_research_fields'))
    await db.query('insert into myssp_participants(name,email,user_id,project_id) values($1,$2,$3,$4)',['Test student','student@example.com',student,'legacy'])
    async function as(role,id=''){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role}`)}
    const createField=(name='Engineering',prefix='ENG')=>db.query('select myssp_create_research_field($1,$2) as field',[name,prefix])
    const cohort=(year=2027)=>db.query('select myssp_create_cohort($1,$2)',[year,`MYSSP ${year}`])
    const input={year:2027,code:'A-1',title:'New research',track:'AI & Computer Sciences',mentor:'Mentor',affiliation:'University',description:'Research question'}
    const save=(details=input,id=null,expected=null)=>db.query('select myssp_save_project_brief($1,$2,$3) as id',[details,id,expected])
    await as('anon'); await assert.rejects(()=>cohort()); await assert.rejects(()=>save()); await assert.rejects(()=>createField())
    assert.equal((await db.query('select * from myssp_research_fields')).rows.length,6)
    await as('authenticated',student); await assert.rejects(()=>cohort()); await assert.rejects(()=>save()); await assert.rejects(()=>createField())
    await assert.rejects(()=>db.exec("insert into myssp_research_fields(name,prefix) values('Injected','INJ')"))
    await as('authenticated',admin)
    assert.equal((await db.query("select cohort_year from myssp_projects where id='legacy'")).rows[0].cohort_year,2026)
    await cohort(); await assert.rejects(()=>cohort());
    assert.deepEqual((await createField('  Engineering  Systems  ',' eng ')).rows[0].field,{name:'Engineering Systems',prefix:'ENG'})
    await assert.rejects(()=>createField('engineering systems'))
    await assert.rejects(()=>createField('All fields'))
    await assert.rejects(()=>createField('Biology'))
    await assert.rejects(()=>createField('x'))
    await assert.rejects(()=>createField('X'.repeat(81)))
    await assert.rejects(()=>createField('Bad\nfield'))
    await assert.rejects(()=>createField('Bad prefix','123'))
    await assert.rejects(()=>db.exec("update myssp_research_fields set prefix='X'"))
    const customId=(await save({...input,track:'Engineering Systems',code:'ENG-1'})).rows[0].id
    assert.equal((await db.query('select payload from myssp_projects where id=$1',[customId])).rows[0].payload.track,'Engineering Systems')
    await as('anon')
    assert.equal((await db.query('select prefix from myssp_research_fields where name=$1',['Engineering Systems'])).rows[0].prefix,'ENG')
    assert.equal((await db.query('select id from myssp_projects where id=$1',[customId])).rows.length,0)
    await as('authenticated',admin)
     await assert.rejects(()=>cohort(1900))
    await assert.rejects(()=>save({...input,year:2028})); await assert.rejects(()=>save({...input,title:''}))
    await assert.rejects(()=>save({...input,track:'Made up'})); await assert.rejects(()=>save({...input,code:'A-1;delete'}))
    const id=(await save({...input,published:true,editing_enabled:true,team:[{name:'Injected'}]})).rows[0].id
    const record=(await db.query('select * from myssp_projects where id=$1',[id])).rows[0]
    assert.equal(record.published,false); assert.equal(record.editing_enabled,false); assert.deepEqual(record.payload.team,[])
    assert.equal(record.cohort_year,2027)
    assert.equal((await db.query("select count(*)::integer as n from myssp_projects where code='A-1'")).rows[0].n,2)
    await assert.rejects(()=>save()) // same code in the same year
    await as('anon'); assert.equal((await db.query('select id from myssp_projects')).rows.length,0)
    await as('authenticated',student)
    assert.deepEqual((await db.query('select id from myssp_projects')).rows.map(r=>r.id),['legacy'])
    await assert.rejects(()=>save({...input,title:'Forbidden'},id,input))
    await as('authenticated',admin)
    const changed={...input,title:'Updated brief'}
    await save(changed,id,input)
    await assert.rejects(()=>save(input,id,input)) // stale edit
    await assert.rejects(()=>save({...changed,year:2026},id,changed))
    await assert.rejects(()=>save({...changed,code:'A-2'},id,changed))
    await db.query('select myssp_import_participants($1)',[[{name:'Future student',email:'future@example.com',project_id:id}]])
    const future=(await db.query('select id from myssp_participants where project_id=$1',[id])).rows[0]
    assert.equal((await db.query('select payload from myssp_projects where id=$1',[id])).rows[0].payload.team[0].name,'Future student')
    await save({...changed,mentor:'New mentor'},id,changed)
    assert.equal((await db.query('select payload from myssp_projects where id=$1',[id])).rows[0].payload.team[0].name,'Future student')
    const children=['A','B'].map(s=>({id:`child-${s.toLowerCase()}`,code:`A-1${s}`,payload:{...record.payload,title:`Team ${s}`,year:2027}}))
    await assert.rejects(()=>db.query('select myssp_split_project($1,$2,$3)',[id,children.map(c=>({...c,payload:{...c.payload,year:2026}})),{[future.id]:'child-a'}]))
    await db.query('select myssp_split_project($1,$2,$3)',[id,children,{[future.id]:'child-a'}])
    assert.equal((await db.query("select cohort_year from myssp_projects where id='child-a'")).rows[0].cohort_year,2027)
    await assert.rejects(()=>save()) // retired code stays reserved
    await db.exec("update myssp_projects set published=true where id='child-a'")
    await as('anon')
    assert.deepEqual((await db.query('select id from myssp_projects')).rows.map(r=>r.id),['child-a'])
  } finally { await db.close() }
})
