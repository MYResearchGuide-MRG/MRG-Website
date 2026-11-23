-- A saved lineup starts marking immediately. Feedback remains private until
-- the committee releases it; the committee can still close and reopen marking.
begin;

create or replace function public.myssp_set_judging_lineup(cohort integer, project_ids text[])
returns void language plpgsql security definer set search_path = '' as $$
declare is_open boolean; is_released boolean;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  -- Save the lineup and enable marking in one transaction. Serialize with the
  -- committee's close/release controls, which lock this same cohort row.
  select c.judging_open, c.feedback_released into is_open, is_released
    from public.myssp_cohorts c where c.year = cohort for update;
  if not found then raise exception 'Cohort not found'; end if;
  if is_open then raise exception 'Close judging before changing the lineup'; end if;
  if is_released then raise exception 'Hide released feedback before changing the lineup'; end if;
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
  update public.myssp_cohorts set judging_open = cardinality(project_ids) > 0
    where year = cohort;
end $$;
revoke all on function public.myssp_set_judging_lineup(integer,text[]) from public;
grant execute on function public.myssp_set_judging_lineup(integer,text[]) to authenticated;

-- Enable the already-prepared 2026 lineup. Do not reopen released results or
-- other cohorts, and do not change project publication or student editing.
update public.myssp_cohorts c set judging_open = true
where c.year = 2026 and not c.judging_open and not c.feedback_released
  and exists (
    select 1 from public.myssp_judging_lineup l
    join public.myssp_projects p on p.id = l.project_id
    where l.cohort_year = c.year and p.deleted_at is null and not p.retired
  );

commit;
