-- Committee-only profile edits. Preserve photos and bios, and reject stale edits.
begin;
create function public.myssp_update_participant(
  participant uuid, full_name text, school text, project text, access_revoked boolean,
  expected_name text, expected_school text, expected_project text, expected_revoked boolean,
  expected_profile_name text
) returns void language plpgsql security definer set search_path='' as $$
declare current_person public.myssp_participants;
begin
  if not public.myssp_is_admin() then raise exception 'Committee access required'; end if;
  if full_name is null or length(trim(full_name)) not between 1 and 100
    or school is null or length(trim(school)) > 200 or access_revoked is null then
    raise exception 'Invalid participant details';
  end if;
  if not exists(select 1 from public.myssp_projects where id=project and not retired and deleted_at is null) then
    raise exception 'Project unavailable';
  end if;
  select * into current_person from public.myssp_participants where id=participant and deleted_at is null for update;
  if not found then raise exception 'Participant unavailable'; end if;
  if current_person.name is distinct from expected_name
    or coalesce(current_person.display_profile->>'name','') is distinct from expected_profile_name
    or coalesce(current_person.display_profile->>'school','') is distinct from expected_school
    or current_person.project_id is distinct from expected_project
    or current_person.revoked is distinct from expected_revoked then
    raise exception 'Participant changed. Refresh and try again.';
  end if;
  update public.myssp_participants set name=trim(full_name), project_id=project, revoked=access_revoked,
    display_profile=current_person.display_profile || jsonb_build_object('name',trim(full_name),'school',trim(school))
  where id=participant;
end $$;
revoke all on function public.myssp_update_participant(uuid,text,text,text,boolean,text,text,text,boolean,text) from public;
grant execute on function public.myssp_update_participant(uuid,text,text,text,boolean,text,text,text,boolean,text) to authenticated;
commit;
