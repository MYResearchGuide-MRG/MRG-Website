-- Judges who cannot attend Demo Day review the research only. Their reviews
-- have no presentation scores or presentation review, are marked research_only,
-- and count towards a project's research average but not its presentation
-- average. Also lets the committee return a submitted review to a draft.
-- Apply after 202611230001_lineup_starts_judging.sql.
begin;

alter table public.myssp_judges
  add column attends_demo_day boolean not null default true;

-- Stored on each review so a review keeps its own format and completeness
-- stays a row rule.
alter table public.myssp_judge_feedback
  add column research_only boolean not null default false;

alter table public.myssp_judge_feedback drop constraint complete_when_submitted;
alter table public.myssp_judge_feedback add constraint research_only_has_no_presentation
  check (not research_only or (structure is null and clarity is null and qa_depth is null
    and visual_aids is null and time_management is null and presentation_remarks = ''));
alter table public.myssp_judge_feedback add constraint complete_when_submitted
  check (submitted_at is null or (
    data_collection is not null and analysis is not null and findings_validity is not null
    and length(trim(research_remarks)) > 0
    and (research_only or (structure is not null and clarity is not null and qa_depth is not null
      and visual_aids is not null and time_management is not null
      and length(trim(presentation_remarks)) > 0))));

create or replace function public.myssp_review_complete(f public.myssp_judge_feedback) returns boolean
language sql immutable set search_path = '' as $$
  select f.data_collection is not null and f.analysis is not null and f.findings_validity is not null
    and length(trim(f.research_remarks)) > 0
    and (f.research_only or (f.structure is not null and f.clarity is not null and f.qa_depth is not null
      and f.visual_aids is not null and f.time_management is not null
      and length(trim(f.presentation_remarks)) > 0));
$$;

-- Adds judge_attends. Null keeps the current setting (new judges attend), so
-- callers that do not know about attendance never change it. Attendance is
-- fixed once the judge has submitted a review; changing it moves their drafts
-- to the new format.
drop function public.myssp_save_judge(uuid,integer,text,text,text,boolean,text);
create function public.myssp_save_judge(
  judge_id uuid, judge_cohort integer, judge_name text, judge_email text, judge_affiliation text,
  access_revoked boolean, judge_kind text default 'main', judge_attends boolean default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid; current_email text; linked_user_id uuid; current_attends boolean;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  judge_name := trim(coalesce(judge_name,''));
  judge_email := lower(trim(coalesce(judge_email,'')));
  judge_affiliation := trim(coalesce(judge_affiliation,''));
  if length(judge_name) not between 1 and 100 or length(judge_email) > 254
    or judge_email !~ '^[^[:space:]@,]+@[^[:space:]@,]+\.[^[:space:]@,]+$'
    or length(judge_affiliation) > 180 or access_revoked is null
    or judge_kind is null or judge_kind not in ('main', 'special')
  then raise exception 'Invalid judge details'; end if;
  if not exists (select 1 from public.myssp_cohorts c where c.year = judge_cohort) then
    raise exception 'Cohort not found';
  end if;
  if exists (select 1 from public.myssp_participants p where p.email = judge_email) then
    raise exception 'Email belongs to a participant';
  end if;
  if exists (select 1 from public.myssp_mentors m where m.email = judge_email) then
    raise exception 'Email belongs to a mentor';
  end if;
  if exists (select 1 from public.myssp_judges j where j.email = judge_email and j.id is distinct from judge_id) then
    raise exception 'Email already belongs to a judge. Check Deleted judges if the account is not listed.';
  end if;
  if judge_id is null then
    if exists (select 1 from auth.users u where lower(u.email) = judge_email) then
      raise exception 'Email already has a sign-in account';
    end if;
    insert into public.myssp_judges (cohort_year,name,email,affiliation,revoked,kind,attends_demo_day)
    values (judge_cohort,judge_name,judge_email,judge_affiliation,access_revoked,judge_kind,coalesce(judge_attends,true))
    returning id into saved_id;
  else
    select email,user_id,attends_demo_day into current_email,linked_user_id,current_attends
      from public.myssp_judges where id = judge_id and deleted_at is null for update;
    if not found then raise exception 'Judge not found'; end if;
    if exists (select 1 from auth.users u where lower(u.email) = judge_email
      and (current_email <> judge_email or u.id is distinct from linked_user_id)) then
      raise exception 'Email already has a sign-in account';
    end if;
    judge_attends := coalesce(judge_attends, current_attends);
    if judge_attends <> current_attends then
      -- Wait for any save in progress, then check nothing is final yet.
      perform 1 from public.myssp_judge_feedback f where f.judge_id = myssp_save_judge.judge_id for update;
      if exists (select 1 from public.myssp_judge_feedback f
        where f.judge_id = myssp_save_judge.judge_id and f.submitted_at is not null) then
        raise exception 'This judge has submitted reviews, so Demo Day attendance can no longer change';
      end if;
      update public.myssp_judge_feedback f set research_only = not judge_attends,
        structure = case when judge_attends then f.structure end,
        clarity = case when judge_attends then f.clarity end,
        qa_depth = case when judge_attends then f.qa_depth end,
        visual_aids = case when judge_attends then f.visual_aids end,
        time_management = case when judge_attends then f.time_management end,
        presentation_remarks = case when judge_attends then f.presentation_remarks else '' end,
        updated_at = now()
      where f.judge_id = myssp_save_judge.judge_id;
    end if;
    update public.myssp_judges set cohort_year = judge_cohort, name = judge_name, email = judge_email,
      affiliation = judge_affiliation, revoked = access_revoked, kind = judge_kind,
      attends_demo_day = judge_attends,
      user_id = case when current_email <> judge_email then null else user_id end,
      invited_at = case when current_email <> judge_email then null else invited_at end,
      invite_requested_at = case when current_email <> judge_email then null else invite_requested_at end,
      access_revision = access_revision + case when current_email <> judge_email or revoked <> access_revoked then 1 else 0 end
    where id = judge_id;
    saved_id := judge_id;
  end if;
  return saved_id;
end $$;
revoke all on function public.myssp_save_judge(uuid,integer,text,text,text,boolean,text,boolean) from public;
grant execute on function public.myssp_save_judge(uuid,integer,text,text,text,boolean,text,boolean) to authenticated;

-- CSV import: optional attends_demo_day (true or false), default true.
create or replace function public.myssp_import_judges(rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare item jsonb; total integer := 0;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) not between 1 and 100 then
    raise exception 'Import 1 to 100 judges';
  end if;
  for item in select value from jsonb_array_elements(rows) loop
    if item ? 'attends_demo_day' and jsonb_typeof(item->'attends_demo_day') <> 'boolean' then
      raise exception 'Demo Day attendance must be true or false';
    end if;
    perform public.myssp_save_judge(
      null,
      (item->>'cohort_year')::integer,
      item->>'name', item->>'email', item->>'affiliation', false,
      coalesce(item->>'kind', 'main'),
      coalesce((item->'attends_demo_day')::text::boolean, true)
    );
    total := total + 1;
  end loop;
  return total;
end $$;

-- Same as before, except that a judge who is not attending Demo Day saves a
-- research-only review: any presentation answers are dropped rather than
-- rejected, so a judge whose page predates an attendance change can still save.
create or replace function public.myssp_save_judge_feedback(project text, answers jsonb, submit boolean)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare me uuid := public.myssp_current_judge(); is_open boolean; saved timestamptz; remote boolean;
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
  select c.judging_open into is_open from public.myssp_projects p
    join public.myssp_cohorts c on c.year = p.cohort_year where p.id = project for share of c;
  if not is_open then raise exception 'Judging is closed' using errcode = '42501'; end if;
  -- Share-lock the judge so an attendance change waits for this save.
  select not j.attends_demo_day into remote from public.myssp_judges j where j.id = me for share;
  -- Lock the row so a submit cannot race with an autosave of the same review.
  perform 1 from public.myssp_judge_feedback f
    where f.judge_id = me and f.project_id = project and f.submitted_at is not null for update;
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

-- Committee only: returns a submitted review to a draft so the judge can
-- change and resubmit it. Scores and remarks are kept. Not allowed once
-- feedback is released, so teams never see a review disappear.
create function public.myssp_unsubmit_judge_feedback(target_judge uuid, project text) returns void
language plpgsql security definer set search_path = '' as $$
declare released boolean;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  -- Share-lock the cohort so feedback cannot be released mid-change.
  select c.feedback_released into released from public.myssp_projects p
    join public.myssp_cohorts c on c.year = p.cohort_year where p.id = project for share of c;
  if coalesce(released, false) then
    raise exception 'Hide feedback from teams before returning a review to draft';
  end if;
  update public.myssp_judge_feedback f set submitted_at = null, updated_at = now()
  where f.judge_id = target_judge and f.project_id = project and f.submitted_at is not null;
  if not found then raise exception 'Submitted review not found'; end if;
end $$;
revoke all on function public.myssp_unsubmit_judge_feedback(uuid,text) from public, anon;
grant execute on function public.myssp_unsubmit_judge_feedback(uuid,text) to authenticated;

-- Adds researchOnly so teams see which reviews had no presentation part.
create or replace function public.myssp_project_feedback(project text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare released boolean; result jsonb;
begin
  if not (public.myssp_is_admin() or public.myssp_is_member(project) or public.myssp_is_mentor(project)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select c.feedback_released into released from public.myssp_projects p
    join public.myssp_cohorts c on c.year = p.cohort_year where p.id = project;
  if not coalesce(released, false) then return jsonb_build_object('released', false); end if;
  select jsonb_build_object('released', true, 'reviews', coalesce(jsonb_agg(jsonb_build_object(
      'kind', j.kind, 'researchOnly', f.research_only,
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

commit;
