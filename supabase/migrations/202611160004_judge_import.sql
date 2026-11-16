-- Bulk judge import for the committee CSV workflow.
-- Apply after 202611160002_judge_kind_and_review_feedback.sql.
begin;

create function public.myssp_import_judges(rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare item jsonb; total integer := 0;
begin
  if not public.myssp_is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) not between 1 and 100 then
    raise exception 'Import 1 to 100 judges';
  end if;
  for item in select value from jsonb_array_elements(rows) loop
    perform public.myssp_save_judge(
      null,
      (item->>'cohort_year')::integer,
      item->>'name', item->>'email', item->>'affiliation', false,
      coalesce(item->>'kind', 'main')
    );
    total := total + 1;
  end loop;
  return total;
end $$;
revoke all on function public.myssp_import_judges(jsonb) from public;
grant execute on function public.myssp_import_judges(jsonb) to authenticated;

commit;
