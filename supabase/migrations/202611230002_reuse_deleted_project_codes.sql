-- Trash keeps the original page, submissions and assignments, but releases its
-- cohort-scoped code. New projects still receive new IDs, so reusing a code does
-- not inherit the deleted project's materials or access.
begin;

alter table public.myssp_projects drop constraint myssp_year_project_code;
create unique index myssp_active_year_project_code
  on public.myssp_projects(cohort_year, code)
  where deleted_at is null;

-- Keep non-deleted retired split parents in the index: their code still names
-- the child teams. The index also rejects conflicting restores atomically.
notify pgrst, 'reload schema';
commit;
