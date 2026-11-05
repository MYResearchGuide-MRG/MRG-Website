-- Run after 202611050001_participant_details.sql.
begin;
create table public.myssp_cohorts (
  year integer primary key check (year between 2026 and 2100),
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
alter table public.myssp_cohorts enable row level security;
revoke all on public.myssp_cohorts from anon, authenticated;
grant select on public.myssp_cohorts to authenticated;
create policy committee_cohorts on public.myssp_cohorts for select to authenticated using (public.myssp_is_admin());

update public.myssp_projects set payload=jsonb_set(payload,'{year}','2026') where payload->>'year' is null;
insert into public.myssp_cohorts(year,name)
  select distinct (payload->>'year')::integer, 'MYSSP '||(payload->>'year') from public.myssp_projects;
insert into public.myssp_cohorts(year,name) values(2026,'MYSSP 2026') on conflict do nothing;
alter table public.myssp_projects add column cohort_year integer generated always as ((payload->>'year')::integer) stored;
alter table public.myssp_projects alter column cohort_year set not null;
alter table public.myssp_projects add constraint myssp_project_cohort foreign key(cohort_year) references public.myssp_cohorts(year);
alter table public.myssp_projects drop constraint myssp_projects_code_key;
alter table public.myssp_projects add constraint myssp_year_project_code unique(cohort_year,code);

-- Keep project links, assignments and split teams bound to their original cohort.
create function public.myssp_check_project_cohort() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.id<>old.id or new.code<>old.code or new.payload->>'year' is distinct from old.payload->>'year') then
    raise exception 'Project identity and cohort cannot be changed';
  end if;
  if new.parent_id is not null and not exists(select 1 from public.myssp_projects p where p.id=new.parent_id and p.payload->>'year'=new.payload->>'year') then
    raise exception 'Split projects must remain in the parent cohort';
  end if;
  return new;
end $$;
create trigger myssp_project_cohort_guard before insert or update on public.myssp_projects
for each row execute function public.myssp_check_project_cohort();

create function public.myssp_create_cohort(cohort_year integer, cohort_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if cohort_year is null or cohort_year not between 2026 and 2100 or cohort_name is null or length(trim(cohort_name)) not between 1 and 80 then raise exception 'Invalid cohort'; end if;
  insert into public.myssp_cohorts(year,name) values(cohort_year,trim(cohort_name));
end $$;
revoke all on function public.myssp_create_cohort(integer,text) from public, anon;
grant execute on function public.myssp_create_cohort(integer,text) to authenticated;

create function public.myssp_save_project_brief(details jsonb, project text default null, expected jsonb default null) returns text
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
    or details->>'track' not in ('AI & Computer Sciences','Biology','Chemistry','Mathematics','Interdisciplinary & Social Sciences','Physics')
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
