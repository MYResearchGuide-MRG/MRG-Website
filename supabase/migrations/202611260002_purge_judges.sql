-- Let the committee permanently delete judges that are already in Trash, like
-- participants and projects. Their reviews (drafts and submitted) are erased
-- with them, since judge feedback blocks a hard delete of its judge.
begin;

create or replace function public.myssp_purge_deleted(kind text, record_id text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if kind='participant' then
    perform 1 from public.myssp_participants where id=record_id::uuid and deleted_at is not null for update;
    if not found then raise exception 'Move this participant to Trash first'; end if;
    delete from public.myssp_participants where id=record_id::uuid;
  elsif kind='project' then
    perform 1 from public.myssp_projects where id=record_id and deleted_at is not null for update;
    if not found then raise exception 'Move this project to Trash first'; end if;
    -- Remove the submission first so the roster trigger does not rewrite it.
    delete from public.myssp_submissions where project_id=record_id;
    delete from public.myssp_participants where project_id=record_id;
    delete from public.myssp_submission_review_history where project_id=record_id;
    delete from public.myssp_submission_reviews where project_id=record_id;
    update public.myssp_projects set parent_id=null where parent_id=record_id;
    -- Mentor assignments, the judging lineup and judge feedback cascade.
    delete from public.myssp_projects where id=record_id;
  elsif kind='judge' then
    perform 1 from public.myssp_judges where id=record_id::uuid and deleted_at is not null for update;
    if not found then raise exception 'Move this judge to Trash first'; end if;
    delete from public.myssp_judge_feedback where judge_id=record_id::uuid;
    delete from public.myssp_judges where id=record_id::uuid;
  else raise exception 'Unknown record type'; end if;
end $$;
revoke all on function public.myssp_purge_deleted(text,text) from public;
grant execute on function public.myssp_purge_deleted(text,text) to authenticated;

notify pgrst, 'reload schema';
commit;
