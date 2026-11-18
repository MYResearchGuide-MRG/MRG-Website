-- Judges now submit every review together, and a submitted review is final.
-- 1. Saving rejects any change to a review that has already been submitted.
-- 2. Closing judging submits every complete review that is still a draft, so
--    judges who ran out of time still count. Incomplete drafts stay drafts
--    (the complete_when_submitted check would reject them anyway).

create or replace function public.myssp_save_judge_feedback(project text, answers jsonb, submit boolean)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare me uuid := public.myssp_current_judge(); is_open boolean; saved timestamptz;
  score_keys constant text[] := array['data_collection','analysis','findings_validity','structure',
    'clarity','qa_depth','visual_aids','time_management'];
  remark_keys constant text[] := array['research_remarks','presentation_remarks'];
  k text; v jsonb;
begin
  if me is null then raise exception 'Judge access required' using errcode = '42501'; end if;
  if submit is null or answers is null or jsonb_typeof(answers) <> 'object' then
    raise exception 'Invalid feedback';
  end if;
  if not public.myssp_is_judge(project) then raise exception 'Project is not in your lineup' using errcode = '42501'; end if;
  select c.judging_open into is_open from public.myssp_projects p
    join public.myssp_cohorts c on c.year = p.cohort_year where p.id = project;
  if not is_open then raise exception 'Judging is closed' using errcode = '42501'; end if;
  -- Lock the row so a submit cannot race with an autosave of the same review.
  perform 1 from public.myssp_judge_feedback f
    where f.judge_id = me and f.project_id = project and f.submitted_at is not null for update;
  if found then raise exception 'Review already submitted' using errcode = '42501'; end if;
  for k in select jsonb_object_keys(answers) loop
    if not (k = any(score_keys) or k = any(remark_keys) or k = 'remarks') then raise exception 'Unknown field %', k; end if;
  end loop;
  foreach k in array score_keys loop
    v := answers->k;
    if v is not null and v <> 'null'::jsonb and (jsonb_typeof(v) <> 'number' or v::text !~ '^[1-5]$') then
      raise exception 'Scores must be whole numbers from 1 to 5';
    end if;
  end loop;
  foreach k in array remark_keys loop
    if answers ? k and jsonb_typeof(answers->k) <> 'string' then raise exception 'Remarks must be text'; end if;
  end loop;
  if answers ? 'remarks' and jsonb_typeof(answers->'remarks') <> 'string' then
    raise exception 'Remarks must be text';
  end if;

  insert into public.myssp_judge_feedback as f (judge_id, project_id, data_collection, analysis,
    findings_validity, structure, clarity, qa_depth, visual_aids, time_management,
    remarks, research_remarks, presentation_remarks, submitted_at, updated_at)
  values (me, project,
    (nullif(answers->'data_collection','null'::jsonb))::text::smallint,
    (nullif(answers->'analysis','null'::jsonb))::text::smallint,
    (nullif(answers->'findings_validity','null'::jsonb))::text::smallint,
    (nullif(answers->'structure','null'::jsonb))::text::smallint,
    (nullif(answers->'clarity','null'::jsonb))::text::smallint,
    (nullif(answers->'qa_depth','null'::jsonb))::text::smallint,
    (nullif(answers->'visual_aids','null'::jsonb))::text::smallint,
    (nullif(answers->'time_management','null'::jsonb))::text::smallint,
    left(coalesce(answers->>'remarks', concat_ws(E'\n\n', answers->>'research_remarks', answers->>'presentation_remarks')), 5000),
    coalesce(answers->>'research_remarks', answers->>'remarks', ''),
    coalesce(answers->>'presentation_remarks', answers->>'remarks', ''),
    case when submit then now() end, now())
  on conflict (judge_id, project_id) do update set
    data_collection = excluded.data_collection, analysis = excluded.analysis,
    findings_validity = excluded.findings_validity, structure = excluded.structure,
    clarity = excluded.clarity, qa_depth = excluded.qa_depth,
    visual_aids = excluded.visual_aids, time_management = excluded.time_management,
    remarks = excluded.remarks, research_remarks = excluded.research_remarks,
    presentation_remarks = excluded.presentation_remarks,
    submitted_at = excluded.submitted_at, updated_at = now()
  where f.submitted_at is null
  returning f.submitted_at into saved;
  if not found then raise exception 'Review already submitted' using errcode = '42501'; end if;
  return saved;
exception when check_violation then
  raise exception 'Answer every score and add a review for both sections before submitting';
end $$;
revoke all on function public.myssp_save_judge_feedback(text,jsonb,boolean) from public;
grant execute on function public.myssp_save_judge_feedback(text,jsonb,boolean) to authenticated;

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
  if was_open and not open_judging then
    update public.myssp_judge_feedback f set submitted_at = now()
    from public.myssp_projects p
    where p.id = f.project_id and p.cohort_year = cohort and f.submitted_at is null
      and f.data_collection is not null and f.analysis is not null and f.findings_validity is not null
      and f.structure is not null and f.clarity is not null and f.qa_depth is not null
      and f.visual_aids is not null and f.time_management is not null
      and length(trim(f.research_remarks)) > 0 and length(trim(f.presentation_remarks)) > 0;
  end if;
  update public.myssp_cohorts set judging_open = open_judging, feedback_released = release_feedback
  where year = cohort;
end $$;
revoke all on function public.myssp_set_judging_state(integer,boolean,boolean) from public;
grant execute on function public.myssp_set_judging_state(integer,boolean,boolean) to authenticated;
