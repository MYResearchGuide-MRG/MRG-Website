-- Participants may edit their own public name and portrait, even while their
-- team's project editor is locked. Assignment and access remain committee only.
begin;

create function public.myssp_update_own_profile(full_name text, profile_photo text)
returns void language plpgsql security definer set search_path = '' as $$
declare person public.myssp_participants%rowtype;
begin
  if (select auth.uid()) is null or public.myssp_is_admin() then
    raise exception 'Participant sign-in required' using errcode = '42501';
  end if;
  if length(trim(coalesce(full_name, ''))) not between 1 and 100
    or length(coalesce(profile_photo, '')) > 350000
    or (coalesce(profile_photo, '') <> '' and profile_photo !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+=*$') then
    raise exception 'Invalid profile';
  end if;
  select * into person from public.myssp_participants
    where user_id = (select auth.uid()) and not revoked and deleted_at is null
    order by roster_order limit 1 for update;
  if not found or not exists (
    select 1 from public.myssp_projects p
    where p.id = person.project_id and not p.retired and p.deleted_at is null
  ) then
    raise exception 'No active project assignment' using errcode = '42501';
  end if;
  update public.myssp_participants set name = trim(full_name),
    display_profile = coalesce(display_profile, '{}'::jsonb)
      || jsonb_build_object('name', trim(full_name), 'photo', profile_photo)
    where id = person.id;
  perform public.myssp_sync_team(person.project_id);
end $$;

revoke all on function public.myssp_update_own_profile(text, text) from public;
grant execute on function public.myssp_update_own_profile(text, text) to authenticated;
commit;
