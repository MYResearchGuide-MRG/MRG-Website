-- Recoverable mentor deletion and committee-managed email corrections.
begin;
alter table public.myssp_mentors add column deleted_at timestamptz;
alter table public.myssp_mentors add column access_revision integer not null default 0;

alter policy mentors_read on public.myssp_mentors using (
  public.myssp_is_admin() or (user_id = (select auth.uid()) and not revoked and deleted_at is null)
);
alter policy mentor_projects_read on public.myssp_mentor_projects using (
  public.myssp_is_admin() or exists (
    select 1 from public.myssp_mentors m where m.id = mentor_id
      and m.user_id = (select auth.uid()) and not m.revoked and m.deleted_at is null
  )
);
create or replace function public.myssp_is_mentor(project text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.myssp_mentors m
    join public.myssp_mentor_projects mp on mp.mentor_id = m.id
    join public.myssp_projects p on p.id = mp.project_id
    where m.user_id = (select auth.uid()) and not m.revoked and m.deleted_at is null
      and mp.project_id = project and p.deleted_at is null and not p.retired
  );
$$;

create or replace function public.myssp_save_mentor(
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
  if exists (select 1 from public.myssp_mentors m where m.email = mentor_email and m.id is distinct from mentor_id) then
    raise exception 'Email already belongs to a mentor. Check Deleted mentors if the account is not listed.';
  end if;
  if mentor_id is null then
    if exists (select 1 from auth.users u where lower(u.email) = mentor_email) then
      raise exception 'Email already has a sign-in account';
    end if;
    insert into public.myssp_mentors (name,email,affiliation,revoked)
    values (mentor_name,mentor_email,mentor_affiliation,access_revoked) returning id into saved_id;
  else
    select email,user_id into current_email,linked_user_id from public.myssp_mentors where id = mentor_id and deleted_at is null for update;
    if not found then raise exception 'Mentor not found'; end if;
    if exists (select 1 from auth.users u where lower(u.email) = mentor_email
      and (current_email <> mentor_email or u.id is distinct from linked_user_id)) then
      raise exception 'Email already has a sign-in account';
    end if;
    update public.myssp_mentors set name = mentor_name, email = mentor_email,
      affiliation = mentor_affiliation, revoked = access_revoked,
      -- Detach the old identity atomically. Its existing sessions immediately
      -- lose project access through RLS. A new invitation creates a new login.
      user_id = case when current_email <> mentor_email then null else user_id end,
      invited_at = case when current_email <> mentor_email then null else invited_at end,
      invite_requested_at = case when current_email <> mentor_email then null else invite_requested_at end,
      access_revision = access_revision + case when current_email <> mentor_email or revoked <> access_revoked then 1 else 0 end
    where id = mentor_id;
    saved_id := mentor_id;
  end if;
  delete from public.myssp_mentor_projects mp where mp.mentor_id = saved_id;
  insert into public.myssp_mentor_projects (mentor_id,project_id)
    select saved_id,id from unnest(project_ids) id;
  return saved_id;
end $$;
revoke all on function public.myssp_save_mentor(uuid,text,text,text,text[],boolean) from public;
grant execute on function public.myssp_save_mentor(uuid,text,text,text,text[],boolean) to authenticated;

create or replace function public.myssp_claim_mentor_invitation(target uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.myssp_mentors m set invite_requested_at = now()
  where m.id = target and not m.revoked and m.deleted_at is null
    and exists (select 1 from public.myssp_mentor_projects mp
      join public.myssp_projects p on p.id = mp.project_id
      where mp.mentor_id = m.id and p.deleted_at is null and not p.retired)
    and (m.invite_requested_at is null or m.invite_requested_at < now() - interval '60 seconds');
  return found;
end $$;
revoke all on function public.myssp_claim_mentor_invitation(uuid) from public;
grant execute on function public.myssp_claim_mentor_invitation(uuid) to service_role;

-- Retain assignments and invitation state so a committee member can restore
-- an accidental deletion. This never deletes projects, submissions or Auth users.
create function public.myssp_set_mentor_deleted(target uuid, remove boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if remove is null then raise exception 'Choose delete or restore'; end if;
  perform 1 from public.myssp_mentors where id = target for update;
  if not found then raise exception 'Mentor not found'; end if;
  update public.myssp_mentors set
    deleted_at = case when remove then now() else null end,
    access_revision = access_revision + 1
  where id = target and (deleted_at is not null) <> remove;
end $$;
revoke all on function public.myssp_set_mentor_deleted(uuid,boolean) from public;
grant execute on function public.myssp_set_mentor_deleted(uuid,boolean) to authenticated;

-- Defence in depth against an invitation already running during an email edit.
create function public.myssp_check_mentor_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null and new.user_id is distinct from old.user_id then
    if new.deleted_at is not null or new.revoked or not exists (
      select 1 from auth.users u where u.id = new.user_id and lower(u.email) = new.email
    ) then raise exception 'Mentor details changed. Refresh before inviting again.'; end if;
  end if;
  return new;
end $$;
revoke all on function public.myssp_check_mentor_identity() from public;
create trigger myssp_check_mentor_identity before update of user_id on public.myssp_mentors
for each row execute function public.myssp_check_mentor_identity();
commit;
