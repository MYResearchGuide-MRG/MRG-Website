-- Reject stale judge edits instead of silently overwriting another tab/device.
begin;
create function public.myssp_save_judge_review_v2(project text,answers jsonb,submit boolean,expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=public.myssp_current_judge(); previous timestamptz; result jsonb;
begin
  if me is null or not public.myssp_is_judge(project) then raise exception 'Judge access required' using errcode='42501'; end if;
  perform 1 from public.myssp_cohorts c join public.myssp_projects p on p.cohort_year=c.year where p.id=project for share of c;
  -- Also serialises first saves, for which no feedback row exists yet.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(me::text),pg_catalog.hashtext(project));
  select f.updated_at into previous from public.myssp_judge_feedback f where f.judge_id=me and f.project_id=project for update;
  if previous is distinct from expected_updated_at then raise exception 'This review changed in another tab. Reload before saving.' using errcode='40001'; end if;
  perform public.myssp_save_judge_feedback(project,answers,submit);
  select jsonb_build_object('submittedAt',f.submitted_at,'updatedAt',f.updated_at) into result from public.myssp_judge_feedback f where f.judge_id=me and f.project_id=project;
  return result;
end $$;
revoke all on function public.myssp_save_judge_review_v2(text,jsonb,boolean,timestamptz) from public,anon;
grant execute on function public.myssp_save_judge_review_v2(text,jsonb,boolean,timestamptz) to authenticated;
revoke execute on function public.myssp_save_judge_feedback(text,jsonb,boolean) from authenticated;
commit;
