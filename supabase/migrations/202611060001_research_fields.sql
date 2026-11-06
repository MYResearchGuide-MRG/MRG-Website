-- Shared research fields for committee editors, Projects and Project Archive.
begin;
create table public.myssp_research_fields (
  name text primary key check (
    length(name) between 2 and 80 and name = trim(name)
    and name !~ '[[:cntrl:]]' and name !~ '  '
    and lower(name) not in ('all', 'all fields')
  ),
  prefix text not null check (prefix ~ '^[A-Z]{1,5}$'),
  created_at timestamptz not null default now()
);
create unique index myssp_research_fields_name_unique on public.myssp_research_fields(lower(name));
alter table public.myssp_research_fields enable row level security;
revoke all on public.myssp_research_fields from anon, authenticated;
grant select on public.myssp_research_fields to anon, authenticated;
create policy read_research_fields on public.myssp_research_fields for select to anon, authenticated using (true);

insert into public.myssp_research_fields(name,prefix) values
  ('AI & Computer Sciences','A'), ('Biology','B'), ('Chemistry','C'),
  ('Mathematics','M'), ('Interdisciplinary & Social Sciences','I'), ('Physics','P');
-- Preserve any valid fields already used by projects.
insert into public.myssp_research_fields(name,prefix)
  select distinct payload->>'track', 'R' from public.myssp_projects
  where length(payload->>'track') between 2 and 80
    and payload->>'track' = trim(payload->>'track')
    and payload->>'track' !~ '[[:cntrl:]]' and payload->>'track' !~ '  '
    and lower(payload->>'track') not in ('all','all fields')
  on conflict do nothing;

create function public.myssp_create_research_field(field_name text, code_prefix text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare normalized_name text; normalized_prefix text;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if field_name is null or code_prefix is null or field_name ~ '[[:cntrl:]]' then
    raise exception 'Invalid research field';
  end if;
  normalized_name := regexp_replace(trim(field_name),'[[:space:]]+',' ','g');
  normalized_prefix := upper(trim(code_prefix));
  if length(normalized_name) not between 2 and 80 or lower(normalized_name) in ('all','all fields')
    or normalized_prefix !~ '^[A-Z]{1,5}$' then raise exception 'Invalid research field'; end if;
  insert into public.myssp_research_fields(name,prefix) values(normalized_name,normalized_prefix);
  return jsonb_build_object('name',normalized_name,'prefix',normalized_prefix);
end $$;
revoke all on function public.myssp_create_research_field(text,text) from public, anon;
grant execute on function public.myssp_create_research_field(text,text) to authenticated;

-- The existing project-save function is replaced below, retaining its privacy,
-- immutable identity, permission and concurrent-edit protections.

create or replace function public.myssp_save_project_brief(details jsonb, project text default null, expected jsonb default null) returns text
language plpgsql security definer set search_path='' as $$
declare
  selected_year integer;
  code_value text;
  new_id text;
  brief jsonb;
  previous public.myssp_projects;
  field text;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if jsonb_typeof(details) is distinct from 'object' or octet_length(details::text)>20000 then raise exception 'Invalid project'; end if;
  foreach field in array array['code','title','track','mentor','affiliation','description'] loop
    if jsonb_typeof(details->field) is distinct from 'string' then raise exception 'Invalid project field'; end if;
  end loop;
  if coalesce(details->>'year','') !~ '^[0-9]{4}$' then raise exception 'Invalid year'; end if;
  selected_year := (details->>'year')::integer;
  if not exists(select 1 from public.myssp_cohorts where year=selected_year) then raise exception 'Create the cohort first'; end if;
  code_value := details->>'code';
  if code_value !~ '^[A-Z]{1,5}-[0-9]{1,4}[A-Z]{0,2}$'
    or length(trim(details->>'title')) not between 1 and 240
    or length(details->>'mentor')>200 or length(details->>'affiliation')>300 or length(details->>'description')>4000
    or not exists(select 1 from public.myssp_research_fields where name=details->>'track')
    then raise exception 'Invalid project details'; end if;
  brief := jsonb_build_object('title',trim(details->>'title'),'track',details->>'track','mentor',trim(details->>'mentor'),
    'affiliation',trim(details->>'affiliation'),'description',trim(details->>'description'));
  if project is not null then
    select * into previous from public.myssp_projects where id=project and not retired and deleted_at is null for update;
    if not found then raise exception 'Project unavailable'; end if;
    if previous.code<>code_value or previous.cohort_year<>selected_year then raise exception 'Code and cohort cannot be changed'; end if;
    if expected is null then raise exception 'Reload project before editing'; end if;
    foreach field in array array['title','track','mentor','affiliation','description'] loop
      if previous.payload->field is distinct from expected->field then raise exception 'Project changed; reload before editing'; end if;
    end loop;
    update public.myssp_projects set payload=payload||brief where id=project;
    return project;
  end if;
  new_id := 'myssp-'||selected_year||'-'||lower(code_value)||'-'||substr(gen_random_uuid()::text,1,8);
  insert into public.myssp_projects(id,code,payload,published,editing_enabled)
    values(new_id,code_value,brief||jsonb_build_object('id',new_id,'code',code_value,'year',selected_year,
      'type',details->>'track','mentorBio','','photo','','institution','External','participants','','timeInvestment','',
      'skillsDescription','','skills','[]'::jsonb,'prepWork','[]'::jsonb,'tasks','[]'::jsonb,'deliverables','[]'::jsonb,
      'status','confirmed','awards','[]'::jsonb,'team','[]'::jsonb),false,false);
  return new_id;
end $$;
revoke all on function public.myssp_save_project_brief(jsonb,text,jsonb) from public, anon;
grant execute on function public.myssp_save_project_brief(jsonb,text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
