-- Read optimisation only. Existing RLS, write permissions and deadlines stay in force.
begin;

alter table public.myssp_projects add column cache_version uuid not null default gen_random_uuid();
alter table public.myssp_participants add column cache_version uuid not null default gen_random_uuid();
alter table public.myssp_submissions add column cache_version uuid not null default gen_random_uuid();
alter table public.myssp_admin_profiles add column cache_version uuid not null default gen_random_uuid();

create function public.myssp_bump_cache_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.cache_version := gen_random_uuid();
  return new;
end $$;
revoke all on function public.myssp_bump_cache_version() from public;
create trigger myssp_cache_version before update on public.myssp_projects
  for each row execute function public.myssp_bump_cache_version();
create trigger myssp_cache_version before update on public.myssp_participants
  for each row execute function public.myssp_bump_cache_version();
create trigger myssp_cache_version before update on public.myssp_submissions
  for each row execute function public.myssp_bump_cache_version();
create trigger myssp_cache_version before update on public.myssp_admin_profiles
  for each row execute function public.myssp_bump_cache_version();

-- Return the complete list of accessible IDs on every check, but send large
-- records only when their version changes. Never trust client IDs for access:
-- SECURITY INVOKER applies the same table grants and RLS as direct reads.
create function public.myssp_backend_snapshot(known jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
  committee boolean := public.myssp_is_admin();
begin
  if jsonb_typeof(known) <> 'object' or octet_length(known::text) > 200000 then
    raise exception 'Invalid cache manifest';
  end if;
  select jsonb_build_object(
    'projects', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'version', p.cache_version,
      'record', case when known->'projects'->>p.id = p.cache_version::text then null else to_jsonb(p) end
    ) order by p.code) from public.myssp_projects p where not p.retired), '[]'::jsonb),
    'submissions', coalesce((select jsonb_agg(jsonb_build_object(
      'project_id', s.project_id, 'version', s.cache_version, 'revision', s.revision,
      'title', s.content->>'title', 'savedAt', s.content->>'savedAt',
      'slides', s.content->>'slides', 'paper', s.content->>'paper', 'video', s.content->>'video',
      'coverAlt', s.content->>'coverAlt', 'hasCover', coalesce(s.content->>'coverImage', '') <> ''
    )) from public.myssp_submissions s
      join public.myssp_projects p on p.id = s.project_id where not p.retired and p.deleted_at is null), '[]'::jsonb),
    'isAdmin', committee,
    'fields', coalesce((select jsonb_agg(jsonb_build_object('name',f.name,'prefix',f.prefix) order by f.created_at,f.name)
      from public.myssp_research_fields f), '[]'::jsonb),
    'deadlines', (select coalesce(jsonb_agg(d), '[]'::jsonb) from public.myssp_submission_deadlines() d),
    'people', '[]'::jsonb, 'mentors', '[]'::jsonb, 'mentorProjects', '[]'::jsonb,
    'cohorts', '[]'::jsonb, 'adminProfile', null
  ) into result;
  if (select auth.uid()) is not null then
    result := result || jsonb_build_object(
      'people', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'version', p.cache_version,
        'record', case when known->'people'->>p.id::text = p.cache_version::text then null else to_jsonb(p) end
      )) from public.myssp_participants p), '[]'::jsonb),
      'mentors', coalesce((select jsonb_agg(jsonb_build_object(
        'id',m.id,'user_id',m.user_id,'name',m.name,'email',m.email,'affiliation',m.affiliation,
        'revoked',m.revoked,'invited_at',m.invited_at,'deleted_at',m.deleted_at
      )) from public.myssp_mentors m), '[]'::jsonb),
      'mentorProjects', coalesce((select jsonb_agg(mp) from public.myssp_mentor_projects mp), '[]'::jsonb)
    );
    if committee then
      result := result || jsonb_build_object(
        'cohorts', coalesce((select jsonb_agg(jsonb_build_object('year',c.year,'name',c.name) order by c.year desc)
          from public.myssp_cohorts c), '[]'::jsonb),
        'adminProfile', (select jsonb_build_object('id',a.user_id,'version',a.cache_version,
          'record', case when known->>'adminProfile' = a.cache_version::text then null else to_jsonb(a) end)
          from public.myssp_admin_profiles a where a.user_id = (select auth.uid()))
      );
    end if;
  end if;
  return result;
end $$;
revoke all on function public.myssp_backend_snapshot(jsonb) from public;
grant execute on function public.myssp_backend_snapshot(jsonb) to anon, authenticated;

commit;
