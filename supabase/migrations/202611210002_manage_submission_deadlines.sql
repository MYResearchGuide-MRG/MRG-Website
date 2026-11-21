-- Committee-controlled editing windows. Installing this does not change any deadline.
begin;

create function public.myssp_set_submission_deadline(
  cohort_year integer,
  closing_time timestamptz,
  expected_closing_time timestamptz,
  reopen_projects boolean default false,
  close_now boolean default false
) returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  previous timestamptz;
  next_cutoff timestamptz;
begin
  if (select auth.uid()) is null or not public.myssp_is_admin() then
    raise exception 'Committee access required' using errcode = '42501';
  end if;
  if reopen_projects is null or close_now is null or (close_now and (reopen_projects or closing_time is not null)) then
    raise exception 'Choose a closing time or close editing now';
  end if;
  select submission_closes_at into previous from public.myssp_cohorts
    where year = cohort_year for update;
  if not found then raise exception 'Unknown cohort'; end if;
  if previous is distinct from expected_closing_time then
    raise exception 'The deadline changed. Close this window and try again.' using errcode = '40001';
  end if;
  next_cutoff := case when close_now then clock_timestamp() else closing_time end;
  if not close_now and next_cutoff is not null and
    (not isfinite(next_cutoff) or next_cutoff <= clock_timestamp() or next_cutoff > '2101-01-01 00:00:00+08'::timestamptz) then
    raise exception 'Choose a future closing time';
  end if;
  update public.myssp_cohorts set submission_closes_at = next_cutoff where year = cohort_year;
  if reopen_projects then
    update public.myssp_projects set editing_enabled = true
      where myssp_projects.cohort_year = myssp_set_submission_deadline.cohort_year
        and not retired and deleted_at is null;
  end if;
  -- Publication and revoked account access are deliberately independent.
  return next_cutoff;
end $$;

revoke all on function public.myssp_set_submission_deadline(integer,timestamptz,timestamptz,boolean,boolean) from public,anon;
grant execute on function public.myssp_set_submission_deadline(integer,timestamptz,timestamptz,boolean,boolean) to authenticated;
commit;
