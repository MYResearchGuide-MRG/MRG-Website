-- Mentor supervision is read-only and scoped to explicitly assigned projects.
begin;

create table public.myssp_mentors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 100),
  email text unique not null check (email = lower(trim(email)) and email ~ '^[^[:space:]@,]+@[^[:space:]@,]+\.[^[:space:]@,]+$' and length(email) <= 254),
  affiliation text not null default '' check (length(affiliation) <= 180),
  revoked boolean not null default false,
  invited_at timestamptz,
  invite_requested_at timestamptz
);
create table public.myssp_mentor_projects (
  mentor_id uuid not null references public.myssp_mentors(id) on delete cascade,
  project_id text not null references public.myssp_projects(id) on delete cascade,
  primary key (mentor_id, project_id)
);
create index myssp_mentor_projects_project on public.myssp_mentor_projects(project_id);

alter table public.myssp_mentors enable row level security;
alter table public.myssp_mentor_projects enable row level security;
revoke all on public.myssp_mentors, public.myssp_mentor_projects from anon, authenticated;
grant select on public.myssp_mentors, public.myssp_mentor_projects to authenticated;
grant all on public.myssp_mentors, public.myssp_mentor_projects to service_role;

create policy mentors_read on public.myssp_mentors for select to authenticated
using (public.myssp_is_admin() or (user_id = (select auth.uid()) and not revoked));
create policy mentor_projects_read on public.myssp_mentor_projects for select to authenticated
using (public.myssp_is_admin() or exists (
  select 1 from public.myssp_mentors m where m.id = mentor_id and m.user_id = (select auth.uid()) and not m.revoked
));

create function public.myssp_is_mentor(project text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.myssp_mentors m
    join public.myssp_mentor_projects mp on mp.mentor_id = m.id
    join public.myssp_projects p on p.id = mp.project_id
    where m.user_id = (select auth.uid()) and not m.revoked
      and mp.project_id = project and p.deleted_at is null and not p.retired
  );
$$;
revoke all on function public.myssp_is_mentor(text) from public;
grant execute on function public.myssp_is_mentor(text) to anon, authenticated;

alter policy projects_read on public.myssp_projects using (
  public.myssp_is_admin() or
  (deleted_at is null and not retired and (published or public.myssp_is_member(id) or public.myssp_is_mentor(id)))
);
alter policy submissions_read on public.myssp_submissions using (
  exists (select 1 from public.myssp_projects p where p.id = project_id and
    (public.myssp_is_admin() or
      (p.deleted_at is null and not p.retired and
        (p.published or public.myssp_is_member(p.id) or public.myssp_is_mentor(p.id)))))
);

create function public.myssp_save_mentor(
  mentor_id uuid, mentor_name text, mentor_email text, mentor_affiliation text,
  project_ids text[], access_revoked boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid; current_email text; linked_user_id uuid;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  mentor_name := trim(coalesce(mentor_name,''));
  mentor_email := lower(trim(coalesce(mentor_email,'')));
  mentor_affiliation := trim(coalesce(mentor_affiliation,''));
  if length(mentor_name) not between 1 and 100 or length(mentor_email) > 254
    or mentor_email !~ '^[^[:space:]@,]+@[^[:space:]@,]+\.[^[:space:]@,]+$'
    or length(mentor_affiliation) > 180 or access_revoked is null
    or project_ids is null or cardinality(project_ids) not between 1 and 20
    or cardinality(project_ids) <> (select count(distinct id) from unnest(project_ids) id)
  then raise exception 'Invalid mentor details'; end if;
  if exists (select 1 from unnest(project_ids) id where not exists (
    select 1 from public.myssp_projects p where p.id = id and not p.retired and p.deleted_at is null
  )) then raise exception 'Choose active projects'; end if;
  if exists (select 1 from public.myssp_participants p where p.email = mentor_email) then
    raise exception 'Email belongs to a participant';
  end if;
  if mentor_id is null then
    if exists (select 1 from auth.users u where lower(u.email) = mentor_email) then
      raise exception 'Email already has a sign-in account';
    end if;
    insert into public.myssp_mentors (name,email,affiliation,revoked)
    values (mentor_name,mentor_email,mentor_affiliation,access_revoked) returning id into saved_id;
  else
    select email,user_id into current_email,linked_user_id from public.myssp_mentors where id = mentor_id for update;
    if not found then raise exception 'Mentor not found'; end if;
    if linked_user_id is not null and current_email <> mentor_email then
      raise exception 'Pause this account and add the new email address';
    end if;
    if exists (select 1 from auth.users u where lower(u.email) = mentor_email
      and u.id is distinct from linked_user_id) then
      raise exception 'Email already has a sign-in account';
    end if;
    update public.myssp_mentors set name = mentor_name, email = mentor_email,
      affiliation = mentor_affiliation, revoked = access_revoked where id = mentor_id;
    saved_id := mentor_id;
  end if;
  delete from public.myssp_mentor_projects mp where mp.mentor_id = saved_id;
  insert into public.myssp_mentor_projects (mentor_id,project_id)
    select saved_id,id from unnest(project_ids) id;
  return saved_id;
end $$;
revoke all on function public.myssp_save_mentor(uuid,text,text,text,text[],boolean) from public;
grant execute on function public.myssp_save_mentor(uuid,text,text,text,text[],boolean) to authenticated;

create function public.myssp_import_mentors(rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare item jsonb; total integer := 0; ids text[];
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) not between 1 and 100 then
    raise exception 'Import 1 to 100 mentors';
  end if;
  for item in select value from jsonb_array_elements(rows) loop
    if jsonb_typeof(item->'project_ids') is distinct from 'array' then raise exception 'Projects required'; end if;
    select array_agg(value) into ids from jsonb_array_elements_text(item->'project_ids');
    perform public.myssp_save_mentor(null,item->>'name',item->>'email',item->>'affiliation',ids,false);
    total := total + 1;
  end loop;
  return total;
end $$;
revoke all on function public.myssp_import_mentors(jsonb) from public;
grant execute on function public.myssp_import_mentors(jsonb) to authenticated;

create function public.myssp_claim_mentor_invitation(target uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.myssp_mentors m set invite_requested_at = now()
  where m.id = target and not m.revoked
    and exists (select 1 from public.myssp_mentor_projects mp
      join public.myssp_projects p on p.id = mp.project_id
      where mp.mentor_id = m.id and p.deleted_at is null and not p.retired)
    and (m.invite_requested_at is null or m.invite_requested_at < now() - interval '60 seconds');
  return found;
end $$;
revoke all on function public.myssp_claim_mentor_invitation(uuid) from public;
grant execute on function public.myssp_claim_mentor_invitation(uuid) to service_role;

-- A split project carries its mentor assignments to the child pages. The
-- committee can then narrow an assignment in Mentors if the teams separate.
create function public.myssp_copy_mentor_assignments() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.parent_id is not null then
    insert into public.myssp_mentor_projects (mentor_id,project_id)
      select mentor_id,new.id from public.myssp_mentor_projects where project_id = new.parent_id
      on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.myssp_copy_mentor_assignments() from public;
create trigger myssp_copy_mentor_assignments after insert on public.myssp_projects
for each row execute function public.myssp_copy_mentor_assignments();

commit;
