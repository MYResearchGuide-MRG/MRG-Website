-- Lightweight completeness checks and a separate committee review workflow.
-- Installing this changes no deadlines, visibility, assignments or submissions.
begin;

create table public.myssp_submission_reviews (
  project_id text primary key references public.myssp_projects(id),
  status text not null check (status in ('needs_changes','approved')),
  notes text not null default '' check (length(notes)<=3000),
  checks jsonb not null default '[]' check (jsonb_typeof(checks)='array'),
  content_version text not null,
  revision integer not null default 1,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
create table public.myssp_submission_review_history (
  id bigint generated always as identity primary key,
  project_id text not null references public.myssp_projects(id),
  record jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.myssp_submission_reviews enable row level security;
alter table public.myssp_submission_review_history enable row level security;
revoke all on public.myssp_submission_reviews, public.myssp_submission_review_history from anon,authenticated;

create function public.myssp_review_content_version(payload jsonb, content jsonb) returns text
language sql immutable set search_path='' as $$
  select md5(jsonb_build_array(payload->'team',payload->'description',payload->'tasks',payload->'title',coalesce(content,'{}')-'savedAt'-'reviewedFingerprint')::text);
$$;
revoke all on function public.myssp_review_content_version(jsonb,jsonb) from public;

create function public.myssp_submission_checklist(payload jsonb, content jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare
  c jsonb := coalesce(content,'{}'); items jsonb := '[]'; field text; label text; value text; lim integer;
  ok boolean; original text; member jsonb; profile jsonb; idx integer := 0; member_id text; missing text[];
begin
  value:=coalesce(c->>'title',payload->>'title','');
  items:=items||jsonb_build_array(jsonb_build_object('id','title','label','Project title','section','heading','done',trim(value)<>'' and length(value)<=240,'detail','Use your final research title.'));
  missing:='{}';
  if coalesce(c->>'coverImage','') !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+=*$' then missing:=array_append(missing,'project image'); end if;
  if coalesce(trim(c->>'coverAlt'),'')='' or length(c->>'coverAlt')>200 then missing:=array_append(missing,'image description'); end if;
  items:=items||jsonb_build_array(jsonb_build_object('id','cover','label','Project image','section','heading','done',cardinality(missing)=0,'detail',case when cardinality(missing)>0 then 'Missing '||array_to_string(missing,', ')||'.' else 'Image and description added.' end));
  for field,label,lim in values ('summary','Abstract',1500),('question','Research question',300),('method','Research approach',2000),('findings','Findings',2000) loop
    value:=coalesce(c->>field,''); ok:=trim(value)<>'' and length(value)<=lim;
    original:=null;
    if field='summary' then original:=payload->>'description';
    elsif field='method' then select string_agg('- '||v,E'\n') into original from jsonb_array_elements_text(coalesce(payload->'tasks','[]')) v; end if;
    if original is not null then ok:=ok and regexp_replace(trim(value),'\s+',' ','g')<>regexp_replace(trim(original),'\s+',' ','g'); end if;
    items:=items||jsonb_build_array(jsonb_build_object('id',field,'label',label,'section','overview','done',ok,'detail',case when not ok then 'Add completed research within the section limit; replace the original brief.' else 'Content added.' end));
  end loop;
  for member in select v from jsonb_array_elements(coalesce(payload->'team','[]')) v loop
    idx:=idx+1; member_id:=coalesce(member->>'memberId',payload->>'id'||':member-'||idx);
    select v into profile from jsonb_array_elements(coalesce(c->'teamMembers','[]')) v where v->>'id'=member_id limit 1;
    missing:='{}';
    for field,lim in values ('name',100),('school',200),('bio',500) loop
      if coalesce(trim(profile->>field),'')='' or length(profile->>field)>lim then missing:=array_append(missing,field); end if;
    end loop;
    if coalesce(profile->>'photo','') !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+=*$' then missing:=array_append(missing,'photo'); end if;
    items:=items||jsonb_build_array(jsonb_build_object('id','member-'||(idx-1),'label',coalesce(nullif(profile->>'name',''),member->>'name','Student'),'section','team','done',cardinality(missing)=0,'detail',case when cardinality(missing)>0 then 'Missing '||array_to_string(missing,', ')||'.' else 'Name, school, bio and photo added.' end));
  end loop;
  if idx=0 then items:=items||jsonb_build_array(jsonb_build_object('id','team','label','Student team','section','team','done',false,'detail','Assign students to this project.')); end if;
  for field,label in values ('video','Video presentation'),('slides','Presentation slides'),('paper','Research write-up') loop
    value:=trim(coalesce(c->>field,''));
    ok:=length(value)<=2048 and value ~* '^https?://[^[:space:]/?#@]+([/?#][^[:cntrl:]]*)?$' and value !~ '[[:cntrl:]]';
    items:=items||jsonb_build_array(jsonb_build_object('id',field,'label',label,'section','materials','done',ok,'detail',case when ok then 'Link added; check access and guidelines during review.' else 'Add a valid public HTTP or HTTPS link.' end));
  end loop;
  return items;
end $$;
revoke all on function public.myssp_submission_checklist(jsonb,jsonb) from public;

create function public.myssp_submission_review_queue(cohort integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.myssp_is_admin() then raise exception 'Committee access required' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',p.id,'code',p.code,'title',coalesce(nullif(s.content->>'title',''),p.payload->>'title'),'year',cohort,
    'version',public.myssp_review_content_version(p.payload,s.content),'savedAt',s.content->>'savedAt',
    'checklist',public.myssp_submission_checklist(p.payload||jsonb_build_object('id',p.id),s.content),
    'review',case when r.project_id is null then null else jsonb_build_object('status',r.status,'notes',r.notes,'checks',r.checks,'version',r.content_version,'revision',r.revision,'updatedAt',r.updated_at) end
  ) order by p.code) from public.myssp_projects p
    left join public.myssp_submissions s on s.project_id=p.id left join public.myssp_submission_reviews r on r.project_id=p.id
    where not p.retired and p.deleted_at is null and p.payload->>'year'=cohort::text),'[]');
end $$;
revoke all on function public.myssp_submission_review_queue(integer) from public,anon;
grant execute on function public.myssp_submission_review_queue(integer) to authenticated;

create function public.myssp_save_submission_review(project text, decision text, review_note text, confirmations jsonb, expected_content text, expected_revision integer) returns void
language plpgsql security definer set search_path='' as $$
declare p public.myssp_projects; c jsonb; actual text; prior integer; list jsonb;
begin
  if not public.myssp_is_admin() then raise exception 'Committee access required' using errcode='42501'; end if;
  select * into p from public.myssp_projects where id=project and not retired and deleted_at is null for update;
  if not found then raise exception 'Project unavailable'; end if;
  select content into c from public.myssp_submissions where project_id=project for update;
  actual:=public.myssp_review_content_version(p.payload,c);
  select revision into prior from public.myssp_submission_reviews where project_id=project;
  if actual is distinct from expected_content or coalesce(prior,0) is distinct from expected_revision then raise exception 'The project or review changed. Refresh before reviewing again.' using errcode='40001'; end if;
  if decision is null or decision not in ('needs_changes','approved') or review_note is null or length(review_note)>3000 or jsonb_typeof(confirmations) is distinct from 'array' then raise exception 'Invalid review'; end if;
  if exists(select 1 from jsonb_array_elements_text(confirmations) v where v not in ('links','guidelines','content','team')) then raise exception 'Invalid review checks'; end if;
  if decision='needs_changes' and trim(review_note)='' then raise exception 'Explain what the team needs to change'; end if;
  if decision='approved' then
    list:=public.myssp_submission_checklist(p.payload||jsonb_build_object('id',p.id),c);
    if exists(select 1 from jsonb_array_elements(list) v where not (v->>'done')::boolean) then raise exception 'Complete missing content before approval'; end if;
    if not confirmations @> '["links","guidelines","content","team"]'::jsonb then raise exception 'Complete all four review checks'; end if;
  end if;
  insert into public.myssp_submission_reviews(project_id,status,notes,checks,content_version,revision,updated_by)
    values(project,decision,trim(review_note),confirmations,actual,coalesce(prior,0)+1,auth.uid())
    on conflict(project_id) do update set status=excluded.status,notes=excluded.notes,checks=excluded.checks,content_version=excluded.content_version,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now();
  insert into public.myssp_submission_review_history(project_id,record) select project,to_jsonb(r) from public.myssp_submission_reviews r where r.project_id=project;
end $$;
revoke all on function public.myssp_save_submission_review(text,text,text,jsonb,text,integer) from public,anon;
grant execute on function public.myssp_save_submission_review(text,text,text,jsonb,text,integer) to authenticated;

create function public.myssp_project_submission_review(project text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.myssp_projects; c jsonb; r public.myssp_submission_reviews;
begin
  if not (public.myssp_is_admin() or public.myssp_is_member(project) or public.myssp_is_mentor(project)) then raise exception 'Project access required' using errcode='42501'; end if;
  select * into p from public.myssp_projects where id=project and not retired and deleted_at is null;
  if not found then return null; end if;
  select * into r from public.myssp_submission_reviews where project_id=project;
  if not found then return null; end if;
  select content into c from public.myssp_submissions where project_id=project;
  return jsonb_build_object('status',r.status,'notes',r.notes,'updatedAt',r.updated_at,'stale',r.content_version<>public.myssp_review_content_version(p.payload,c));
end $$;
revoke all on function public.myssp_project_submission_review(text) from public,anon;
grant execute on function public.myssp_project_submission_review(text) to authenticated;
commit;
