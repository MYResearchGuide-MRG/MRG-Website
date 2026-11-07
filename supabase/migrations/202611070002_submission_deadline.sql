-- Apply after the cohort and self-profile migrations. No cron job is needed:
-- each write is checked against database time, including already-open sessions.
begin;

alter table public.myssp_cohorts add column submission_closes_at timestamptz;
update public.myssp_cohorts set submission_closes_at='2026-11-21 00:00:00+08' where year=2026;

-- Public schedule only. No account or unpublished project data is returned.
create function public.myssp_submission_deadlines()
returns table(year integer, closes_at timestamptz)
language sql stable security definer set search_path='' as $$
  select c.year,c.submission_closes_at from public.myssp_cohorts c;
$$;
revoke all on function public.myssp_submission_deadlines() from public;
grant execute on function public.myssp_submission_deadlines() to anon,authenticated;

create function public.myssp_require_submission_open(project text)
returns void language plpgsql security definer set search_path='' as $$
declare cutoff timestamptz;
begin
  select c.submission_closes_at into cutoff from public.myssp_projects p
    join public.myssp_cohorts c on c.year=p.cohort_year where p.id=project;
  if cutoff is not null and clock_timestamp() >= cutoff then
    raise exception 'The submission deadline has passed. Contact the committee for corrections.' using errcode='42501';
  end if;
end $$;
revoke all on function public.myssp_require_submission_open(text) from public,anon,authenticated;

alter function public.myssp_save_submission(text,jsonb,integer) rename to myssp_save_submission_before_deadline;
revoke all on function public.myssp_save_submission_before_deadline(text,jsonb,integer) from public,anon,authenticated;
create function public.myssp_save_submission(project text,body jsonb,expected_revision integer)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.myssp_is_member(project) then raise exception 'Editing not allowed' using errcode='42501'; end if;
  perform public.myssp_require_submission_open(project);
  perform public.myssp_save_submission_before_deadline(project,body,expected_revision);
end $$;
revoke all on function public.myssp_save_submission(text,jsonb,integer) from public,anon;
grant execute on function public.myssp_save_submission(text,jsonb,integer) to authenticated;

-- Profile changes also rewrite the student team on the project page.
alter function public.myssp_update_own_profile(text,text) rename to myssp_update_own_profile_before_deadline;
revoke all on function public.myssp_update_own_profile_before_deadline(text,text) from public,anon,authenticated;
create function public.myssp_update_own_profile(full_name text,profile_photo text)
returns void language plpgsql security definer set search_path='' as $$
declare assigned_project text;
begin
  select p.project_id into assigned_project from public.myssp_participants p
    where p.user_id=(select auth.uid()) and not p.revoked and p.deleted_at is null
    order by p.roster_order limit 1;
  if assigned_project is null then raise exception 'No active project assignment' using errcode='42501'; end if;
  perform public.myssp_require_submission_open(assigned_project);
  perform public.myssp_update_own_profile_before_deadline(full_name,profile_photo);
end $$;
revoke all on function public.myssp_update_own_profile(text,text) from public,anon;
grant execute on function public.myssp_update_own_profile(text,text) to authenticated;

-- Recheck at the write itself in case a request waited on another transaction.
-- Committee roster corrections and project management remain available.
create function public.myssp_submission_deadline_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is not null and not public.myssp_is_admin() then
    perform public.myssp_require_submission_open(new.project_id);
  end if;
  return new;
end $$;
revoke all on function public.myssp_submission_deadline_guard() from public,anon,authenticated;
create trigger myssp_00_submission_deadline before insert or update on public.myssp_submissions
  for each row execute function public.myssp_submission_deadline_guard();
create trigger myssp_00_profile_deadline before update of name,display_profile on public.myssp_participants
  for each row execute function public.myssp_submission_deadline_guard();

commit;
