-- The presentation lineup is locked while judging is open, so judges never see
-- projects appear, disappear or change order mid-session. Opening judging also
-- needs a lineup to judge. Closing judging unlocks the lineup again.

create or replace function public.myssp_set_judging_lineup(cohort integer, project_ids text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  -- Lock the cohort row so this cannot race with opening judging.
  if exists (select 1 from public.myssp_cohorts c where c.year = cohort and c.judging_open for update)
  then raise exception 'Close judging before changing the lineup'; end if;
  if project_ids is null or cardinality(project_ids) > 200
    or cardinality(project_ids) <> (select count(distinct id) from unnest(project_ids) id)
  then raise exception 'Invalid lineup'; end if;
  if exists (select 1 from unnest(project_ids) as t(pid) where not exists (
    select 1 from public.myssp_projects p where p.id = t.pid and p.cohort_year = cohort
      and not p.retired and p.deleted_at is null
  )) then raise exception 'Choose active projects from this cohort'; end if;
  delete from public.myssp_judging_lineup where cohort_year = cohort;
  insert into public.myssp_judging_lineup (project_id, cohort_year, position)
    select id, cohort, ord::integer from unnest(project_ids) with ordinality as t(id, ord);
end $$;
revoke all on function public.myssp_set_judging_lineup(integer,text[]) from public;
grant execute on function public.myssp_set_judging_lineup(integer,text[]) to authenticated;

create or replace function public.myssp_set_judging_state(cohort integer, open_judging boolean, release_feedback boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare was_open boolean;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if open_judging is null or release_feedback is null then raise exception 'Choose both switches'; end if;
  select c.judging_open into was_open from public.myssp_cohorts c where c.year = cohort for update;
  if not found then raise exception 'Cohort not found'; end if;
  if open_judging and not was_open
    and not exists (select 1 from public.myssp_judging_lineup l where l.cohort_year = cohort)
  then raise exception 'Set the lineup before opening judging'; end if;
  update public.myssp_cohorts set judging_open = open_judging, feedback_released = release_feedback
  where year = cohort;
end $$;
revoke all on function public.myssp_set_judging_state(integer,boolean,boolean) from public;
grant execute on function public.myssp_set_judging_state(integer,boolean,boolean) to authenticated;
