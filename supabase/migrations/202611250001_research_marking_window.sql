-- Independent research-only marking for judges who cannot attend Demo Day.
begin;
alter table public.myssp_cohorts
  add column research_marking boolean,
  add column research_closes_at timestamptz,
  add constraint research_window_has_deadline check (research_marking is not true or research_closes_at is not null),
  add constraint research_closed_before_release check (not feedback_released or research_marking is not true);
-- NULL follows the general switch until the committee chooses a separate window.
update public.myssp_cohorts set research_marking=judging_open,
  research_closes_at='2026-11-28 16:00:00+08' where year=2026;

create function public.myssp_judging_windows()
returns table(year integer, judging_open boolean, feedback_released boolean, research_marking boolean, research_closes_at timestamptz)
language sql stable security definer set search_path='' as $$
  select c.year,c.judging_open,c.feedback_released,c.research_marking,c.research_closes_at from public.myssp_cohorts c;
$$;
revoke all on function public.myssp_judging_windows() from public;
grant execute on function public.myssp_judging_windows() to authenticated;

create function public.myssp_set_research_judging_window(cohort integer, enabled boolean, closes_at timestamptz,
  expected_enabled boolean, expected_closes_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare c public.myssp_cohorts;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  select * into strict c from public.myssp_cohorts where year=cohort for update;
  if c.research_marking is distinct from expected_enabled or c.research_closes_at is distinct from expected_closes_at then
    raise exception 'Another committee member changed this window. Refresh before saving.' using errcode='40001';
  end if;
  if c.feedback_released then raise exception 'Hide released feedback before changing the research window'; end if;
  if closes_at is null or not isfinite(closes_at) or (enabled is distinct from false and closes_at <= clock_timestamp()) then
    raise exception 'Choose a future closing time';
  end if;
  if enabled is true and not exists (select 1 from public.myssp_judging_lineup where cohort_year=cohort) then
    raise exception 'Save the project lineup before starting research-only marking';
  end if;
  update public.myssp_cohorts set research_marking=enabled,research_closes_at=closes_at where year=cohort;
end $$;
revoke all on function public.myssp_set_research_judging_window(integer,boolean,timestamptz,boolean,timestamptz) from public;
grant execute on function public.myssp_set_research_judging_window(integer,boolean,timestamptz,boolean,timestamptz) to authenticated;

create function public.myssp_marking_allowed(c public.myssp_cohorts, attends boolean)
returns boolean language sql volatile set search_path='' as $$
  select not c.feedback_released and case when attends then c.judging_open
    else coalesce(c.research_marking,c.judging_open)
      and (c.research_closes_at is null or clock_timestamp() < c.research_closes_at) end;
$$;
revoke all on function public.myssp_marking_allowed(public.myssp_cohorts,boolean) from public;

create or replace function public.myssp_save_judge_feedback(project text, answers jsonb, submit boolean)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare me uuid := public.myssp_current_judge(); window_state public.myssp_cohorts; saved timestamptz; remote boolean;
  score_keys constant text[] := array['data_collection','analysis','findings_validity','structure',
    'clarity','qa_depth','visual_aids','time_management'];
  presentation_keys constant text[] := array['structure','clarity','qa_depth','visual_aids',
    'time_management','presentation_remarks'];
  remark_keys constant text[] := array['research_remarks','presentation_remarks'];
  k text; v jsonb;
begin
  if me is null then raise exception 'Judge access required' using errcode = '42501'; end if;
  if submit is null or answers is null or jsonb_typeof(answers) <> 'object' then
    raise exception 'Invalid feedback';
  end if;
  if not public.myssp_is_judge(project) then raise exception 'Project is not in your lineup' using errcode = '42501'; end if;
  -- Share-lock the cohort so closing judging waits for this save.
  select c.* into strict window_state from public.myssp_projects p
    join public.myssp_cohorts c on c.year = p.cohort_year where p.id = project for share of c;
  -- Share-lock the judge so an attendance change waits for this save.
  select not j.attends_demo_day into remote from public.myssp_judges j where j.id = me for share;
  -- Lock the row so a submit cannot race with an autosave of the same review.
  perform 1 from public.myssp_judge_feedback f
    where f.judge_id = me and f.project_id = project and f.submitted_at is not null for update;
  if not public.myssp_marking_allowed(window_state,not remote) then raise exception 'Judging is closed' using errcode='42501'; end if;
  if found then raise exception 'Review already submitted' using errcode = '42501'; end if;
  for k in select jsonb_object_keys(answers) loop
    if not (k = any(score_keys) or k = any(remark_keys)) then raise exception 'Unknown field %', k; end if;
  end loop;
  if remote then answers := answers - presentation_keys; end if;
  foreach k in array score_keys loop
    v := answers->k;
    if v is not null and v <> 'null'::jsonb and (jsonb_typeof(v) <> 'number' or v::text !~ '^[1-5]$') then
      raise exception 'Scores must be whole numbers from 1 to 5';
    end if;
  end loop;
  foreach k in array remark_keys loop
    if answers ? k and jsonb_typeof(answers->k) <> 'string' then raise exception 'Remarks must be text'; end if;
  end loop;

  insert into public.myssp_judge_feedback as f (judge_id, project_id, data_collection, analysis,
    findings_validity, structure, clarity, qa_depth, visual_aids, time_management,
    research_remarks, presentation_remarks, research_only, submitted_at, updated_at)
  values (me, project,
    (nullif(answers->'data_collection','null'::jsonb))::text::smallint,
    (nullif(answers->'analysis','null'::jsonb))::text::smallint,
    (nullif(answers->'findings_validity','null'::jsonb))::text::smallint,
    (nullif(answers->'structure','null'::jsonb))::text::smallint,
    (nullif(answers->'clarity','null'::jsonb))::text::smallint,
    (nullif(answers->'qa_depth','null'::jsonb))::text::smallint,
    (nullif(answers->'visual_aids','null'::jsonb))::text::smallint,
    (nullif(answers->'time_management','null'::jsonb))::text::smallint,
    coalesce(answers->>'research_remarks', ''),
    coalesce(answers->>'presentation_remarks', ''),
    remote,
    case when submit then now() end, now())
  on conflict (judge_id, project_id) do update set
    data_collection = excluded.data_collection, analysis = excluded.analysis,
    findings_validity = excluded.findings_validity, structure = excluded.structure,
    clarity = excluded.clarity, qa_depth = excluded.qa_depth,
    visual_aids = excluded.visual_aids, time_management = excluded.time_management,
    research_remarks = excluded.research_remarks,
    presentation_remarks = excluded.presentation_remarks,
    research_only = excluded.research_only,
    submitted_at = excluded.submitted_at, updated_at = now()
  where f.submitted_at is null
  returning f.submitted_at into saved;
  if not found then raise exception 'Review already submitted' using errcode = '42501'; end if;
  return saved;
exception when check_violation then
  raise exception 'Answer every score and add a review for each section before submitting';
end $$;

create or replace function public.myssp_submit_judge_reviews() returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.myssp_current_judge(); judge_cohort integer; attends boolean; window_state public.myssp_cohorts; total integer;
begin
  if me is null then raise exception 'Judge access required' using errcode = '42501'; end if;
  select c.* into strict window_state from public.myssp_cohorts c join public.myssp_judges j on j.cohort_year=c.year where j.id=me for share of c;
  select j.cohort_year,j.attends_demo_day into strict judge_cohort,attends from public.myssp_judges j
    where j.id=me and not j.revoked and j.deleted_at is null for share;
  -- Lock this judge's reviews so an autosave cannot change one mid-submit.
  perform 1 from public.myssp_judge_feedback f where f.judge_id = me for update;
  if not public.myssp_marking_allowed(window_state,attends) then raise exception 'Judging is closed' using errcode='42501'; end if;
  select count(*) into total from public.myssp_judging_lineup l
    join public.myssp_projects p on p.id = l.project_id
    where l.cohort_year = judge_cohort and p.deleted_at is null and not p.retired;
  if exists (
    select 1 from public.myssp_judging_lineup l
    join public.myssp_projects p on p.id = l.project_id
    left join public.myssp_judge_feedback f on f.judge_id = me and f.project_id = l.project_id
    where l.cohort_year = judge_cohort and p.deleted_at is null and not p.retired
      and (f.project_id is null or not public.myssp_review_complete(f))
  ) then raise exception 'Complete every team''s review before submitting all reviews'; end if;
  update public.myssp_judge_feedback f set submitted_at = now(), updated_at = now()
  from public.myssp_judging_lineup l
  where f.judge_id = me and f.submitted_at is null
    and l.project_id = f.project_id and l.cohort_year = judge_cohort;
  return total;
end $$;

create or replace function public.myssp_set_judging_state(cohort integer, open_judging boolean, release_feedback boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare was_open boolean; research_override boolean;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if open_judging is null or release_feedback is null then raise exception 'Choose both switches'; end if;
  if open_judging and release_feedback then raise exception 'Close judging before releasing feedback'; end if;
  select c.judging_open,c.research_marking into was_open,research_override from public.myssp_cohorts c where c.year = cohort for update;
  if not found then raise exception 'Cohort not found'; end if;
  if open_judging and not was_open
    and not exists (select 1 from public.myssp_judging_lineup l where l.cohort_year = cohort)
  then raise exception 'Set the lineup before opening judging'; end if;
  if (was_open and not open_judging) or release_feedback then
    update public.myssp_judge_feedback f set submitted_at = now(), updated_at = now()
    from public.myssp_judges j, public.myssp_judging_lineup l
    where j.id = f.judge_id and j.cohort_year = cohort and not j.revoked and j.deleted_at is null
      and l.project_id = f.project_id and l.cohort_year = cohort
      and ((was_open and not open_judging and (j.attends_demo_day or research_override is null))
        or (release_feedback and not j.attends_demo_day))
      and f.submitted_at is null and public.myssp_review_complete(f);
  end if;
  update public.myssp_cohorts set judging_open = open_judging, feedback_released = release_feedback,
    research_marking = case when release_feedback and research_override is true then false else research_override end
  where year = cohort;
end $$;

create function public.myssp_save_judging_lineup(cohort integer, project_ids text[], start_marking boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare is_open boolean; is_released boolean;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  -- Save the lineup and enable marking in one transaction. Serialize with the
  -- committee's close/release controls, which lock this same cohort row.
  select c.judging_open or public.myssp_marking_allowed(c,false), c.feedback_released into is_open, is_released
    from public.myssp_cohorts c where c.year = cohort for update;
  if not found then raise exception 'Cohort not found'; end if;
  if is_open then raise exception 'Close judging before changing the lineup'; end if;
  if is_released then raise exception 'Hide released feedback before changing the lineup'; end if;
  if start_marking is null or project_ids is null or cardinality(project_ids) > 200
    or cardinality(project_ids) <> (select count(distinct id) from unnest(project_ids) id)
  then raise exception 'Invalid lineup'; end if;
  if exists (select 1 from unnest(project_ids) as t(pid) where not exists (
    select 1 from public.myssp_projects p where p.id = t.pid and p.cohort_year = cohort
      and not p.retired and p.deleted_at is null
  )) then raise exception 'Choose active projects from this cohort'; end if;
  delete from public.myssp_judging_lineup where cohort_year = cohort;
  insert into public.myssp_judging_lineup (project_id, cohort_year, position)
    select id, cohort, ord::integer from unnest(project_ids) with ordinality as t(id, ord);
  update public.myssp_cohorts set judging_open = start_marking and cardinality(project_ids) > 0
    where year = cohort;
end $$;

revoke all on function public.myssp_save_judging_lineup(integer,text[],boolean) from public;
grant execute on function public.myssp_save_judging_lineup(integer,text[],boolean) to authenticated;
create or replace function public.myssp_set_judging_lineup(cohort integer,project_ids text[])
returns void language sql security definer set search_path='' as $$
  select public.myssp_save_judging_lineup(cohort,project_ids,true);
$$;

notify pgrst, 'reload schema';
commit;
