import {readFileSync, writeFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
async function load(path) {
  const js=stripTypeScriptTypes(readFileSync(new URL(path,import.meta.url),'utf8'))
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}
const {projects,projectCodes}=await load('../src/data/competition-data.ts')
const {SELECTED}=await load('../src/data/selected.ts')
const codes=projectCodes(projects)
const boards=projects.filter(p=>p.status==='confirmed').map(p=>({...p,code:codes.get(p.id),year:2026,awards:[],team:SELECTED.filter(s=>s.code===codes.get(p.id))}))
const sqlQuote=s=>`'${String(s).replaceAll("'","''")}'`
const sql=`-- Mentor briefs and public team profiles only. No emails or access credentials.\n-- Existing records and publication settings are preserved.\ninsert into public.myssp_projects(id,code,payload) values\n${boards.map(b=>`(${sqlQuote(b.id)},${sqlQuote(b.code)},${sqlQuote(JSON.stringify(b))}::jsonb)`).join(',\n')}\non conflict(id) do nothing;\n`
writeFileSync(new URL('../supabase/migrations/202611040002_project_seed.sql',import.meta.url),sql)
console.log(`Prepared ${boards.length} projects, hidden and locked by default.`)
