-- Run once in the Supabase SQL editor. All projects start hidden and locked.
begin;
create table public.myssp_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.myssp_projects (
  id text primary key check (id ~ '^[a-z0-9-]{1,100}$'),
  code text unique not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  published boolean not null default false,
  editing_enabled boolean not null default false,
  retired boolean not null default false,
  parent_id text references public.myssp_projects(id)
);
create table public.myssp_participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (length(name) <= 100),
  email text unique not null check (email = lower(trim(email)) and email ~ '^[^[:space:]@,]+@[^[:space:]@,]+\.[^[:space:]@,]+$' and length(email) <= 254),
  project_id text not null references public.myssp_projects(id),
  revoked boolean not null default false,
  invited_at timestamptz,
  invite_requested_at timestamptz
);
create index myssp_participant_project on public.myssp_participants(project_id);
create table public.myssp_submissions (
  project_id text primary key references public.myssp_projects(id),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  revision integer not null default 1,
  constraint valid_submission check (
    jsonb_typeof(content) = 'object' and octet_length(content::text) <= 6000000
    and content->>'projectId' = project_id
    and content->>'version' = '1' and content->>'overviewFormat' = 'markdown'
    and length(trim(content->>'title')) between 1 and 240
    and length(trim(content->>'summary')) between 1 and 1500
    and length(content->>'question') <= 300
    and length(content->>'method') <= 2000 and length(content->>'findings') <= 2000
    and jsonb_typeof(content->'title') = 'string' and content->'title' <> 'null'::jsonb
    and jsonb_typeof(content->'summary') = 'string' and content->'summary' <> 'null'::jsonb
    and jsonb_typeof(content->'question') = 'string' and content->'question' <> 'null'::jsonb
    and jsonb_typeof(content->'method') = 'string' and content->'method' <> 'null'::jsonb
    and jsonb_typeof(content->'findings') = 'string' and content->'findings' <> 'null'::jsonb
    and jsonb_typeof(content->'slides') = 'string' and jsonb_typeof(content->'paper') = 'string' and jsonb_typeof(content->'video') = 'string'
    and content ?& array['title','summary','question','method','findings','overviewFormat','projectId','version','slides','paper','video']
  )
);

alter table public.myssp_admins enable row level security;
alter table public.myssp_projects enable row level security;
alter table public.myssp_participants enable row level security;
alter table public.myssp_submissions enable row level security;

create function public.myssp_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.myssp_admins where user_id = (select auth.uid()));
$$;
create function public.myssp_is_member(project text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.myssp_participants where user_id = (select auth.uid()) and project_id = project and not revoked);
$$;
revoke all on function public.myssp_is_admin() from public;
revoke all on function public.myssp_is_member(text) from public;
grant execute on function public.myssp_is_admin() to anon, authenticated;
grant execute on function public.myssp_is_member(text) to anon, authenticated;

-- No browser has write privileges on admin roles or participant auth IDs.
revoke all on public.myssp_admins, public.myssp_projects, public.myssp_participants, public.myssp_submissions from anon, authenticated;
grant select on public.myssp_projects, public.myssp_submissions to anon, authenticated;
grant select on public.myssp_participants to authenticated;
grant update(published,editing_enabled) on public.myssp_projects to authenticated;
grant update(project_id,revoked) on public.myssp_participants to authenticated;
grant all on public.myssp_admins, public.myssp_projects, public.myssp_participants, public.myssp_submissions to service_role;

create policy projects_read on public.myssp_projects for select to anon,authenticated
using (public.myssp_is_admin() or (not retired and (published or public.myssp_is_member(id))));
create policy projects_admin_update on public.myssp_projects for update to authenticated
using (public.myssp_is_admin()) with check (public.myssp_is_admin());
create policy participants_read on public.myssp_participants for select to authenticated
using (public.myssp_is_admin() or (user_id = (select auth.uid()) and not revoked));
create policy participants_admin_update on public.myssp_participants for update to authenticated
using (public.myssp_is_admin()) with check (public.myssp_is_admin() and exists(select 1 from public.myssp_projects p where p.id = project_id and not p.retired));
create policy submissions_read on public.myssp_submissions for select to anon,authenticated
using (exists(select 1 from public.myssp_projects p where p.id = project_id and not p.retired and (p.published or public.myssp_is_member(p.id) or public.myssp_is_admin())));
create policy submissions_insert on public.myssp_submissions for insert to authenticated
with check (public.myssp_is_member(project_id) and exists(select 1 from public.myssp_projects p where p.id = project_id and not p.retired and p.editing_enabled));
create policy submissions_update on public.myssp_submissions for update to authenticated
using (public.myssp_is_member(project_id) and exists(select 1 from public.myssp_projects p where p.id = project_id and not p.retired and p.editing_enabled))
with check (public.myssp_is_member(project_id) and exists(select 1 from public.myssp_projects p where p.id = project_id and not p.retired and p.editing_enabled));

create function public.myssp_import_participants(rows jsonb) returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; total integer := 0;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) not between 1 and 200 then raise exception 'Import 1 to 200 rows'; end if;
  for r in select value from jsonb_array_elements(rows) loop
    if not exists(select 1 from public.myssp_projects where id = r->>'project_id' and not retired) then raise exception 'Unknown project'; end if;
    insert into public.myssp_participants(name,email,project_id) values(trim(r->>'name'),lower(trim(r->>'email')),r->>'project_id');
    total := total + 1;
  end loop;
  return total;
end;
$$;

-- Save through one transaction: no direct client table writes, no silent overwrites.
create function public.myssp_save_submission(project text, body jsonb, expected_revision integer) returns void language plpgsql security definer set search_path = '' as $$
declare current_revision integer;
begin
  if expected_revision is null or expected_revision < 0 then raise exception 'Revision required'; end if;
  if body is null or jsonb_typeof(body) <> 'object' or exists (
    select 1 from unnest(array['title','summary','question','method','findings','overviewFormat','projectId','slides','paper','video']) as field
    where jsonb_typeof(body->field) is distinct from 'string'
  ) or body->'version' is distinct from '1'::jsonb then raise exception 'Invalid submission'; end if;
  perform 1 from public.myssp_projects where id=project and editing_enabled and not retired for share;
  if not found or not public.myssp_is_member(project) then raise exception 'Editing not allowed' using errcode='42501'; end if;
  perform 1 from public.myssp_participants where user_id=(select auth.uid()) and project_id=project and not revoked for share;
  if not found then raise exception 'Access revoked' using errcode='42501'; end if;
  select revision into current_revision from public.myssp_submissions where project_id=project for update;
  if coalesce(current_revision,0) <> expected_revision then raise exception 'A teammate saved a newer version'; end if;
  if current_revision is null then
    insert into public.myssp_submissions(project_id,content) values(project,body);
  else
    update public.myssp_submissions set content=body,revision=revision+1,updated_at=now() where project_id=project;
  end if;
end;
$$;

create function public.myssp_split_project(parent text, children jsonb, assignments jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare r jsonb; old_project public.myssp_projects; member public.myssp_participants; child_ids text[];
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  select * into old_project from public.myssp_projects where id=parent and not retired for update;
  if not found then raise exception 'Project unavailable'; end if;
  if jsonb_typeof(children) <> 'array' or jsonb_array_length(children) not between 2 and 6 or jsonb_typeof(assignments) <> 'object' then raise exception 'Invalid split'; end if;
  select array_agg(value->>'id') into child_ids from jsonb_array_elements(children);
  for member in select * from public.myssp_participants where project_id=parent for update loop
    if not coalesce((assignments->>member.id::text) = any(child_ids),false) then raise exception 'Assign every participant'; end if;
  end loop;
  for r in select value from jsonb_array_elements(children) loop
    if r->>'code' not like old_project.code || '%' or length(trim(r->'payload'->>'title')) not between 1 and 240 then raise exception 'Invalid child project'; end if;
    insert into public.myssp_projects(id,code,payload,parent_id) values(r->>'id',r->>'code',r->'payload',parent);
  end loop;
  update public.myssp_participants set project_id=assignments->>id::text where project_id=parent;
  update public.myssp_projects set retired=true,published=false,editing_enabled=false where id=parent;
end;
$$;

-- Claim invitation deliveries atomically. This also enforces a resend cooldown.
create function public.myssp_claim_invitation(person uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.myssp_participants set invite_requested_at=now()
  where id=person and not revoked and (invite_requested_at is null or invite_requested_at < now()-interval '60 seconds');
  return found;
end;
$$;
-- Recover an existing Auth account after an interrupted invitation, without
-- exposing the Auth directory to browsers or downloading every user's record.
create function public.myssp_auth_user_for_email(address text) returns uuid language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email)=lower(address) limit 1;
$$;
revoke all on function public.myssp_auth_user_for_email(text) from public;
grant execute on function public.myssp_auth_user_for_email(text) to service_role;
revoke all on function public.myssp_import_participants(jsonb), public.myssp_split_project(text,jsonb,jsonb), public.myssp_claim_invitation(uuid), public.myssp_save_submission(text,jsonb,integer) from public;
grant execute on function public.myssp_import_participants(jsonb), public.myssp_split_project(text,jsonb,jsonb), public.myssp_save_submission(text,jsonb,integer) to authenticated;
grant execute on function public.myssp_claim_invitation(uuid) to service_role;
commit;
