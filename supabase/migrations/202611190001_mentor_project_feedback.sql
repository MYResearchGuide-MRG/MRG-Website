-- Mentors can read the released judges' feedback for the projects they mentor,
-- exactly as the team sees it. Same rules otherwise: nothing before release,
-- no judge identity, random order.
begin;

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
