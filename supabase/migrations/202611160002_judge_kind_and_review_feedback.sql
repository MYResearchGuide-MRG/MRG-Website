-- Judges are either main judges or special award judges. Released feedback
-- now gives teams every submitted review in full (all scores and the remark),
-- labelled only by judge type, in random order. Still no judge identity.
-- Apply after 202611160001_lock_judging_lineup.sql.
begin;

alter table public.myssp_judges add column kind text not null default 'main'
  check (kind in ('main', 'special'));

drop function public.myssp_save_judge(uuid,integer,text,text,text,boolean);
create function public.myssp_save_judge(
  judge_id uuid, judge_cohort integer, judge_name text, judge_email text, judge_affiliation text,
  access_revoked boolean, judge_kind text default 'main'
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
    insert into public.myssp_judges (cohort_year,name,email,affiliation,revoked,kind)
    values (judge_cohort,judge_name,judge_email,judge_affiliation,access_revoked,judge_kind) returning id into saved_id;
  else
    select email,user_id into current_email,linked_user_id from public.myssp_judges
      where id = judge_id and deleted_at is null for update;
    if not found then raise exception 'Judge not found'; end if;
    if exists (select 1 from auth.users u where lower(u.email) = judge_email
      and (current_email <> judge_email or u.id is distinct from linked_user_id)) then
      raise exception 'Email already has a sign-in account';
    end if;
    update public.myssp_judges set cohort_year = judge_cohort, name = judge_name, email = judge_email,
      affiliation = judge_affiliation, revoked = access_revoked, kind = judge_kind,
      user_id = case when current_email <> judge_email then null else user_id end,
      invited_at = case when current_email <> judge_email then null else invited_at end,
      invite_requested_at = case when current_email <> judge_email then null else invite_requested_at end,
      access_revision = access_revision + case when current_email <> judge_email or revoked <> access_revoked then 1 else 0 end
    where id = judge_id;
    saved_id := judge_id;
  end if;
  return saved_id;
end $$;
revoke all on function public.myssp_save_judge(uuid,integer,text,text,text,boolean,text) from public;
grant execute on function public.myssp_save_judge(uuid,integer,text,text,text,boolean,text) to authenticated;

-- The only way a team sees feedback: after release, every submitted review
-- (whatever later happens to the judge's account) with all its scores and its
-- remark, labelled main or special award, in random order. No judge id, name
-- or stable ordering is returned.
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
      'remarks', f.remarks) order by random()), '[]'::jsonb))
  into result
  from public.myssp_judge_feedback f
  join public.myssp_judges j on j.id = f.judge_id
  where f.project_id = project and f.submitted_at is not null;
  return result;
end $$;
revoke all on function public.myssp_project_feedback(text) from public, anon;
grant execute on function public.myssp_project_feedback(text) to authenticated;

commit;
