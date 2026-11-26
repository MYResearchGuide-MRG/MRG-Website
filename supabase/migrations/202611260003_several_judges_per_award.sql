-- A special award can now have several judges in a cohort, for example two
-- UTAR judges. Each judge still marks one award, and an award's results
-- average every active judge of that award.
-- Apply after 202611260002_purge_judges.sql.
begin;

drop index if exists public.myssp_judges_one_per_special_award;

-- Same as 202611260001, without the one-judge-per-award check.
create or replace function public.myssp_save_judge(
  judge_id uuid, judge_cohort integer, judge_name text, judge_email text, judge_affiliation text,
  access_revoked boolean, judge_kind text default 'main', judge_attends boolean default null,
  judge_award text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid; current_email text; linked_user_id uuid; current_attends boolean;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  judge_name := trim(coalesce(judge_name,''));
  judge_email := lower(trim(coalesce(judge_email,'')));
  judge_affiliation := trim(coalesce(judge_affiliation,''));
  judge_award := nullif(lower(trim(coalesce(judge_award,''))), '');
  if length(judge_name) not between 1 and 100 or length(judge_email) > 254
    or judge_email !~ '^[^[:space:]@,]+@[^[:space:]@,]+\.[^[:space:]@,]+$'
    or length(judge_affiliation) > 180 or access_revoked is null
    or judge_kind is null or judge_kind not in ('main', 'special')
  then raise exception 'Invalid judge details'; end if;
  if judge_kind = 'main' and judge_award is not null then
    raise exception 'Main judges do not have a special award';
  end if;
  if judge_kind = 'special' and (judge_award is null or judge_award not in ('utar', 'mabecs', 'mathworks')) then
    raise exception 'Choose which special award this judge marks';
  end if;
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
    insert into public.myssp_judges (cohort_year,name,email,affiliation,revoked,kind,attends_demo_day,special_award)
    values (judge_cohort,judge_name,judge_email,judge_affiliation,access_revoked,judge_kind,coalesce(judge_attends,true),judge_award)
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
      special_award = judge_award, attends_demo_day = judge_attends,
      user_id = case when current_email <> judge_email then null else user_id end,
      invited_at = case when current_email <> judge_email then null else invited_at end,
      invite_requested_at = case when current_email <> judge_email then null else invite_requested_at end,
      access_revision = access_revision + case when current_email <> judge_email or revoked <> access_revoked then 1 else 0 end
    where id = judge_id;
    saved_id := judge_id;
  end if;
  return saved_id;
end $$;

-- A restored special judge keeps their award, even if another judge now has it.
create or replace function public.myssp_set_judge_deleted(target uuid, remove boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if remove is null then raise exception 'Choose delete or restore'; end if;
  perform 1 from public.myssp_judges where id = target for update;
  if not found then raise exception 'Judge not found'; end if;
  update public.myssp_judges j set
    deleted_at = case when remove then now() else null end,
    access_revision = access_revision + 1
  where j.id = target and (j.deleted_at is not null) <> remove;
end $$;

commit;
