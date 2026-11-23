-- Reduce transferred images and redundant writes without changing stored work,
-- permissions, review revisions or publication. Older clients retain their API.
begin;

create function public.myssp_backend_snapshot_v2(known jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
  entry jsonb;
  entries jsonb := '[]'::jsonb;
  profiles jsonb;
begin
  -- The original SECURITY INVOKER snapshot supplies the authoritative RLS-scoped
  -- manifest. Never use client-supplied IDs as permission to read a row.
  result := public.myssp_backend_snapshot(known);
  for entry in select value from jsonb_array_elements(result->'projects') loop
    if jsonb_typeof(entry->'record') = 'object'
      and exists(select 1 from public.myssp_submissions s
        where s.project_id=entry->>'id' and jsonb_typeof(s.content->'teamMembers')='array')
      and jsonb_typeof(entry#>'{record,payload,team}')='array' then
      -- Project pages already load the full saved submission before rendering
      -- its team. Keep fallback photos for projects without a submission.
      select coalesce(jsonb_agg(value-'photo' order by ordinality),'[]'::jsonb)
        into profiles from jsonb_array_elements(entry#>'{record,payload,team}') with ordinality;
      entry := jsonb_set(entry,'{record,payload,team}',profiles);
    end if;
    entries := entries || jsonb_build_array(entry);
  end loop;
  result := jsonb_set(result,'{projects}',entries);
  entries := '[]'::jsonb;
  for entry in select value from jsonb_array_elements(result->'people') loop
    -- Participant management uses names/schools, not portraits. Keep the signed
    -- in participant's own photo for their profile and header menu.
    if jsonb_typeof(entry->'record')='object'
      and entry#>>'{record,user_id}' is distinct from (select auth.uid())::text then
      entry := entry #- '{record,display_profile,photo}';
    end if;
    entries := entries || jsonb_build_array(entry);
  end loop;
  return jsonb_set(result,'{people}',entries);
end $$;
revoke all on function public.myssp_backend_snapshot_v2(jsonb) from public;
grant execute on function public.myssp_backend_snapshot_v2(jsonb) to anon, authenticated;

-- Ignore no-op writes when deciding whether clients need a fresh record.
create or replace function public.myssp_bump_cache_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (to_jsonb(new)-'cache_version') is not distinct from (to_jsonb(old)-'cache_version') then
    new.cache_version := old.cache_version;
  else
    new.cache_version := gen_random_uuid();
  end if;
  return new;
end $$;

-- Still validate every submitted team profile. Only write profile copies when
-- they changed, so editing a paragraph does not rewrite every student's photo.
create or replace function public.myssp_capture_team_profiles() returns trigger
language plpgsql security definer set search_path='' as $$
declare member jsonb; expected jsonb; actual jsonb; team jsonb; project_code text;
begin
  if jsonb_typeof(new.content->'teamMembers') is distinct from 'array' then raise exception 'Team profiles required'; end if;
  select coalesce(jsonb_agg(id::text order by roster_order,id),'[]') into expected
  from public.myssp_participants where project_id=new.project_id and deleted_at is null;
  select coalesce(jsonb_agg(value->>'id'),'[]') into actual from jsonb_array_elements(new.content->'teamMembers');
  if actual <> expected then raise exception 'The committee changed this team. Reload before saving.'; end if;
  for member in select value from jsonb_array_elements(new.content->'teamMembers') loop
    if exists(select 1 from unnest(array['id','name','school','bio','photo']) as field
      where jsonb_typeof(member->field) is distinct from 'string')
      or length(trim(member->>'name')) not between 1 and 100
      or length(member->>'school') > 200 or length(member->>'bio') > 500
      or length(member->>'photo') > 350000
      or (member->>'photo' <> '' and member->>'photo' !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+=*$')
      or (member - array['id','name','school','bio','photo']) <> '{}'::jsonb then
      raise exception 'Invalid team profile';
    end if;
    update public.myssp_participants set display_profile=member-'id'
      where id=(member->>'id')::uuid and project_id=new.project_id and deleted_at is null
        and display_profile is distinct from member-'id';
  end loop;
  select code into project_code from public.myssp_projects where id=new.project_id;
  select coalesce(jsonb_agg(jsonb_build_object('memberId',value->>'id','code',project_code,
    'name',value->>'name','school',value->>'school','bio',value->>'bio','photo',value->>'photo','programme','')),'[]') into team
    from jsonb_array_elements(new.content->'teamMembers');
  update public.myssp_projects set payload=jsonb_set(payload,'{team}',team)
    where id=new.project_id and payload->'team' is distinct from team;
  return new;
end $$;

notify pgrst, 'reload schema';
commit;
