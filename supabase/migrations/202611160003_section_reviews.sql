-- Split the single overall judge remark into one review per judging section.
-- Existing remarks are preserved in both new fields so released feedback does
-- not disappear when this migration is applied.
alter table public.myssp_judge_feedback
  add column research_remarks text not null default '',
  add column presentation_remarks text not null default '';

update public.myssp_judge_feedback
set research_remarks = remarks,
    presentation_remarks = remarks
where remarks <> '';

alter table public.myssp_judge_feedback
  drop constraint complete_when_submitted,
  add constraint complete_when_submitted check (submitted_at is null or (
    data_collection is not null and analysis is not null and findings_validity is not null
    and structure is not null and clarity is not null and qa_depth is not null
    and visual_aids is not null and time_management is not null
    and length(trim(research_remarks)) > 0
    and length(trim(presentation_remarks)) > 0
  ));

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
    submitted_at = coalesce(f.submitted_at, excluded.submitted_at), updated_at = now()
  returning f.submitted_at into saved;
  return saved;
exception when check_violation then
  raise exception 'Answer every score and add a review for both sections before submitting';
end $$;
revoke all on function public.myssp_save_judge_feedback(text,jsonb,boolean) from public;
grant execute on function public.myssp_save_judge_feedback(text,jsonb,boolean) to authenticated;

create or replace function public.myssp_project_feedback(project text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare released boolean; result jsonb;
begin
  if not (public.myssp_is_admin() or public.myssp_is_member(project)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select c.feedback_released into released from public.myssp_projects p
    join public.myssp_cohorts c on c.year = p.cohort_year where p.id = project;
  if not coalesce(released, false) then return jsonb_build_object('released', false); end if;
  select jsonb_build_object('released', true, 'reviews', coalesce(jsonb_agg(jsonb_build_object(
      'kind', j.kind,
      'data_collection', f.data_collection, 'analysis', f.analysis,
      'findings_validity', f.findings_validity, 'structure', f.structure,
      'clarity', f.clarity, 'qa_depth', f.qa_depth,
      'visual_aids', f.visual_aids, 'time_management', f.time_management,
      'researchRemarks', f.research_remarks, 'presentationRemarks', f.presentation_remarks) order by random()), '[]'::jsonb))
  into result
  from public.myssp_judge_feedback f
  join public.myssp_judges j on j.id = f.judge_id
  where f.project_id = project and f.submitted_at is not null;
  return result;
end $$;
revoke all on function public.myssp_project_feedback(text) from public, anon;
grant execute on function public.myssp_project_feedback(text) to authenticated;

commit;
