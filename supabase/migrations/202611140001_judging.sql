-- Demo Day judging: judge accounts, one presentation lineup per cohort,
-- per-judge feedback, and an anonymous released view for each team.
-- Apply after 202611070003_mentor_account_management.sql.
begin;

-- Presentation order, one lineup per cohort. Created first because judge
-- access is defined by it; its policies and setter are further down.
create table public.myssp_judging_lineup (
  project_id text primary key references public.myssp_projects(id) on delete cascade,
  cohort_year integer not null references public.myssp_cohorts(year),
  position integer not null check (position >= 1),
  unique (cohort_year, position)
);

-- Judges ---------------------------------------------------------------------
-- Same account lifecycle as mentors (invite, pause, delete/restore). A judge
-- belongs to one cohort and reads only that cohort's Demo Day lineup. For a
-- returning judge, the committee moves the account to the new cohort.
create table public.myssp_judges (
  id uuid primary key default gen_random_uuid(),
  cohort_year integer not null references public.myssp_cohorts(year),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 100),
  email text unique not null check (email = lower(trim(email)) and email ~ '^[^[:space:]@,]+@[^[:space:]@,]+\.[^[:space:]@,]+$' and length(email) <= 254),
  affiliation text not null default '' check (length(affiliation) <= 180),
  revoked boolean not null default false,
  deleted_at timestamptz,
  invited_at timestamptz,
  invite_requested_at timestamptz,
  access_revision integer not null default 0
);
alter table public.myssp_judges enable row level security;
revoke all on public.myssp_judges from anon, authenticated;
grant select on public.myssp_judges to authenticated;
grant all on public.myssp_judges to service_role;
create policy judges_read on public.myssp_judges for select to authenticated
using (public.myssp_is_admin() or (user_id = (select auth.uid()) and not revoked and deleted_at is null));

create function public.myssp_current_judge() returns uuid
language sql stable security definer set search_path = '' as $$
  select j.id from public.myssp_judges j
  where j.user_id = (select auth.uid()) and not j.revoked and j.deleted_at is null;
$$;
revoke all on function public.myssp_current_judge() from public;
-- Called by row policies as the requesting user; returns only their own judge id.
grant execute on function public.myssp_current_judge() to authenticated;

-- True when the caller is an active judge and the project is an active
-- project in the lineup of that judge's cohort.
create function public.myssp_is_judge(project text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.myssp_judges j
    join public.myssp_judging_lineup l on l.cohort_year = j.cohort_year
    join public.myssp_projects p on p.id = l.project_id
    where j.user_id = (select auth.uid()) and not j.revoked and j.deleted_at is null
      and l.project_id = project and p.deleted_at is null and not p.retired
  );
$$;
revoke all on function public.myssp_is_judge(text) from public;
grant execute on function public.myssp_is_judge(text) to anon, authenticated;

-- Judges can read lineup project pages and submissions, published or not.
alter policy projects_read on public.myssp_projects using (
  public.myssp_is_admin() or
  (deleted_at is null and not retired and
    (published or public.myssp_is_member(id) or public.myssp_is_mentor(id) or public.myssp_is_judge(id)))
);
alter policy submissions_read on public.myssp_submissions using (
  exists (select 1 from public.myssp_projects p where p.id = project_id and
    (public.myssp_is_admin() or
      (p.deleted_at is null and not p.retired and
        (p.published or public.myssp_is_member(p.id) or public.myssp_is_mentor(p.id) or public.myssp_is_judge(p.id)))))
);

create function public.myssp_save_judge(
  judge_id uuid, judge_cohort integer, judge_name text, judge_email text, judge_affiliation text, access_revoked boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid; current_email text; linked_user_id uuid;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  judge_name := trim(coalesce(judge_name,''));
  judge_email := lower(trim(coalesce(judge_email,'')));
  judge_affiliation := trim(coalesce(judge_affiliation,''));
  if length(judge_name) not between 1 and 100 or length(judge_email) > 254
    or judge_email !~ '^[^[:space:]@,]+@[^[:space:]@,]+\.[^[:space:]@,]+$'
    or length(judge_affiliation) > 180 or access_revoked is null
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
    insert into public.myssp_judges (cohort_year,name,email,affiliation,revoked)
    values (judge_cohort,judge_name,judge_email,judge_affiliation,access_revoked) returning id into saved_id;
  else
    select email,user_id into current_email,linked_user_id from public.myssp_judges
      where id = judge_id and deleted_at is null for update;
    if not found then raise exception 'Judge not found'; end if;
    if exists (select 1 from auth.users u where lower(u.email) = judge_email
      and (current_email <> judge_email or u.id is distinct from linked_user_id)) then
      raise exception 'Email already has a sign-in account';
    end if;
    update public.myssp_judges set cohort_year = judge_cohort, name = judge_name, email = judge_email,
      affiliation = judge_affiliation, revoked = access_revoked,
      user_id = case when current_email <> judge_email then null else user_id end,
      invited_at = case when current_email <> judge_email then null else invited_at end,
      invite_requested_at = case when current_email <> judge_email then null else invite_requested_at end,
      access_revision = access_revision + case when current_email <> judge_email or revoked <> access_revoked then 1 else 0 end
    where id = judge_id;
    saved_id := judge_id;
  end if;
  return saved_id;
end $$;
revoke all on function public.myssp_save_judge(uuid,integer,text,text,text,boolean) from public;
grant execute on function public.myssp_save_judge(uuid,integer,text,text,text,boolean) to authenticated;

-- Deleting removes sign-in access only. Submitted reviews stay visible to the
-- teams that received them, including in later years.
create function public.myssp_set_judge_deleted(target uuid, remove boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if remove is null then raise exception 'Choose delete or restore'; end if;
  perform 1 from public.myssp_judges where id = target for update;
  if not found then raise exception 'Judge not found'; end if;
  update public.myssp_judges set
    deleted_at = case when remove then now() else null end,
    access_revision = access_revision + 1
  where id = target and (deleted_at is not null) <> remove;
end $$;
revoke all on function public.myssp_set_judge_deleted(uuid,boolean) from public;
grant execute on function public.myssp_set_judge_deleted(uuid,boolean) to authenticated;

create function public.myssp_claim_judge_invitation(target uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.myssp_judges j set invite_requested_at = now()
  where j.id = target and not j.revoked and j.deleted_at is null
    and (j.invite_requested_at is null or j.invite_requested_at < now() - interval '60 seconds');
  return found;
end $$;
revoke all on function public.myssp_claim_judge_invitation(uuid) from public;
grant execute on function public.myssp_claim_judge_invitation(uuid) to service_role;

create function public.myssp_check_judge_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null and new.user_id is distinct from old.user_id then
    if new.deleted_at is not null or new.revoked or not exists (
      select 1 from auth.users u where u.id = new.user_id and lower(u.email) = new.email
    ) then raise exception 'Judge details changed. Refresh before inviting again.'; end if;
  end if;
  return new;
end $$;
revoke all on function public.myssp_check_judge_identity() from public;
create trigger myssp_check_judge_identity before update of user_id on public.myssp_judges
for each row execute function public.myssp_check_judge_identity();

-- Judging switches -------------------------------------------------------------
-- judging_open: judges may save and submit feedback.
-- feedback_released: teams see anonymised averages and remarks.
alter table public.myssp_cohorts add column judging_open boolean not null default false;
alter table public.myssp_cohorts add column feedback_released boolean not null default false;

create function public.myssp_judging_state()
returns table(year integer, judging_open boolean, feedback_released boolean)
language sql stable security definer set search_path = '' as $$
  select c.year, c.judging_open, c.feedback_released from public.myssp_cohorts c;
$$;
revoke all on function public.myssp_judging_state() from public;
grant execute on function public.myssp_judging_state() to anon, authenticated;

create function public.myssp_set_judging_state(cohort integer, open_judging boolean, release_feedback boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if open_judging is null or release_feedback is null then raise exception 'Choose both switches'; end if;
  update public.myssp_cohorts set judging_open = open_judging, feedback_released = release_feedback
  where year = cohort;
  if not found then raise exception 'Cohort not found'; end if;
end $$;
revoke all on function public.myssp_set_judging_state(integer,boolean,boolean) from public;
grant execute on function public.myssp_set_judging_state(integer,boolean,boolean) to authenticated;

-- Presentation lineup ------------------------------------------------------------
alter table public.myssp_judging_lineup enable row level security;
revoke all on public.myssp_judging_lineup from anon, authenticated;
grant select on public.myssp_judging_lineup to authenticated;
grant all on public.myssp_judging_lineup to service_role;
create policy judging_lineup_read on public.myssp_judging_lineup for select to authenticated
using (public.myssp_is_admin() or exists (
  select 1 from public.myssp_judges j where j.id = public.myssp_current_judge()
    and j.cohort_year = myssp_judging_lineup.cohort_year
));

-- Replaces the whole lineup for one cohort, in the given order.
create function public.myssp_set_judging_lineup(cohort integer, project_ids text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
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

-- Feedback ---------------------------------------------------------------------
-- Columns mirror src/components/judging/form.ts. Drafts may be incomplete;
-- a submitted review must have every score and a remark.
create table public.myssp_judge_feedback (
  -- Judges are only ever soft-deleted; never let a hard delete erase reviews.
  judge_id uuid not null references public.myssp_judges(id) on delete restrict,
  project_id text not null references public.myssp_projects(id) on delete cascade,
  data_collection smallint check (data_collection between 1 and 5),
  analysis smallint check (analysis between 1 and 5),
  findings_validity smallint check (findings_validity between 1 and 5),
  structure smallint check (structure between 1 and 5),
  clarity smallint check (clarity between 1 and 5),
  qa_depth smallint check (qa_depth between 1 and 5),
  visual_aids smallint check (visual_aids between 1 and 5),
  time_management smallint check (time_management between 1 and 5),
  remarks text not null default '' check (length(remarks) <= 5000),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (judge_id, project_id),
  constraint complete_when_submitted check (submitted_at is null or (
    data_collection is not null and analysis is not null and findings_validity is not null
    and structure is not null and clarity is not null and qa_depth is not null
    and visual_aids is not null and time_management is not null
    and length(trim(remarks)) > 0))
);
create index myssp_judge_feedback_project on public.myssp_judge_feedback(project_id);
alter table public.myssp_judge_feedback enable row level security;
revoke all on public.myssp_judge_feedback from anon, authenticated;
grant select on public.myssp_judge_feedback to authenticated;
grant all on public.myssp_judge_feedback to service_role;
-- Teams never read this table. They use myssp_project_feedback below.
create policy judge_feedback_read on public.myssp_judge_feedback for select to authenticated
using (public.myssp_is_admin() or judge_id = public.myssp_current_judge());

-- Saves the caller's own review. submit=true marks it submitted (and requires
-- it to be complete). Once submitted, a review stays submitted; later saves
-- must keep it complete. All writes stop when the committee closes judging.
create function public.myssp_save_judge_feedback(project text, answers jsonb, submit boolean)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare me uuid := public.myssp_current_judge(); is_open boolean; saved timestamptz;
  score_keys constant text[] := array['data_collection','analysis','findings_validity','structure',
    'clarity','qa_depth','visual_aids','time_management'];
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
    if k <> 'remarks' and not k = any(score_keys) then raise exception 'Unknown field %', k; end if;
  end loop;
  foreach k in array score_keys loop
    v := answers->k;
    if v is not null and v <> 'null'::jsonb and (jsonb_typeof(v) <> 'number' or v::text !~ '^[1-5]$') then
      raise exception 'Scores must be whole numbers from 1 to 5';
    end if;
  end loop;
  if answers ? 'remarks' and jsonb_typeof(answers->'remarks') <> 'string' then
    raise exception 'Remarks must be text';
  end if;

  insert into public.myssp_judge_feedback as f (judge_id, project_id, data_collection, analysis,
    findings_validity, structure, clarity, qa_depth, visual_aids, time_management, remarks,
    submitted_at, updated_at)
  values (me, project,
    (nullif(answers->'data_collection','null'::jsonb))::text::smallint,
    (nullif(answers->'analysis','null'::jsonb))::text::smallint,
    (nullif(answers->'findings_validity','null'::jsonb))::text::smallint,
    (nullif(answers->'structure','null'::jsonb))::text::smallint,
    (nullif(answers->'clarity','null'::jsonb))::text::smallint,
    (nullif(answers->'qa_depth','null'::jsonb))::text::smallint,
    (nullif(answers->'visual_aids','null'::jsonb))::text::smallint,
    (nullif(answers->'time_management','null'::jsonb))::text::smallint,
    coalesce(answers->>'remarks',''),
    case when submit then now() end, now())
  on conflict (judge_id, project_id) do update set
    data_collection = excluded.data_collection, analysis = excluded.analysis,
    findings_validity = excluded.findings_validity, structure = excluded.structure,
    clarity = excluded.clarity, qa_depth = excluded.qa_depth,
    visual_aids = excluded.visual_aids, time_management = excluded.time_management,
    remarks = excluded.remarks,
    submitted_at = coalesce(f.submitted_at, excluded.submitted_at),
    updated_at = now()
  returning f.submitted_at into saved;
  return saved;
exception when check_violation then
  raise exception 'Answer every score and add a remark before submitting';
end $$;
revoke all on function public.myssp_save_judge_feedback(text,jsonb,boolean) from public;
grant execute on function public.myssp_save_judge_feedback(text,jsonb,boolean) to authenticated;

-- The only way a team sees feedback: after release, every submitted review
-- (whatever later happens to the judge's account), as per-criterion averages
-- plus remarks in random order.
-- No judge identity, per-judge score or stable ordering is returned.
create function public.myssp_project_feedback(project text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare released boolean; result jsonb;
begin
  if not (public.myssp_is_admin() or public.myssp_is_member(project)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select c.feedback_released into released from public.myssp_projects p
    join public.myssp_cohorts c on c.year = p.cohort_year where p.id = project;
  if not coalesce(released, false) then return jsonb_build_object('released', false); end if;
  select jsonb_build_object(
    'released', true,
    'reviews', count(*),
    'averages', case when count(*) = 0 then null else jsonb_build_object(
      'data_collection', round(avg(f.data_collection), 1),
      'analysis', round(avg(f.analysis), 1),
      'findings_validity', round(avg(f.findings_validity), 1),
      'structure', round(avg(f.structure), 1),
      'clarity', round(avg(f.clarity), 1),
      'qa_depth', round(avg(f.qa_depth), 1),
      'visual_aids', round(avg(f.visual_aids), 1),
      'time_management', round(avg(f.time_management), 1)) end,
    'remarks', coalesce(jsonb_agg(f.remarks order by random()), '[]'::jsonb))
  into result
  from public.myssp_judge_feedback f
  where f.project_id = project and f.submitted_at is not null;
  return result;
end $$;
revoke all on function public.myssp_project_feedback(text) from public, anon;
grant execute on function public.myssp_project_feedback(text) to authenticated;

commit;
