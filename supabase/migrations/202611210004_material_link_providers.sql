-- Validate new/changed main-material links without blocking edits to legacy work.
-- External availability remains a human review check, never a network save gate.
begin;
create function public.myssp_material_link_error(field text, value text) returns text
language plpgsql immutable set search_path='' as $$
declare u text:=trim(coalesce(value,'')); host text; path text; valid boolean:=false;
begin
  if u='' then return null; end if;
  if length(u)>2048 or u !~* '^https?://' or u ~ '[[:cntrl:]]' then return 'Enter a complete HTTP or HTTPS share link.'; end if;
  host:=lower(substring(u from '(?i)^https?://([^/?#]+)'));
  path:=coalesce(substring(u from '(?i)^https?://[^/?#]+([^?#]*)'),'');
  if host='drive.google.com' then
    valid:=path ~ '^/file/(u/[0-9]+/)?d/[A-Za-z0-9_-]{1,200}(/(view|preview|edit))?/?$'
      or (path in ('/open','/uc') and u ~ '[?&]id=[A-Za-z0-9_-]{1,200}(&|#|$)');
  elsif field='video' then
    valid:=(host='youtu.be' and path ~ '^/[A-Za-z0-9_-]{11}/?$') or
      (host in ('youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com') and
        (path ~ '^/(embed|shorts|live)/[A-Za-z0-9_-]{11}/?$' or (path='/watch' and u ~ '[?&]v=[A-Za-z0-9_-]{11}(&|#|$)')));
  elsif field='slides' then
    valid:=(host in ('canva.com','www.canva.com') and path ~ '^/design/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)?/(view|edit|watch)/?$')
      or (host in ('canva.link','www.canva.link') and path ~ '^/[A-Za-z0-9_-]+/?$')
      or (host='docs.google.com' and path ~ '^/presentation/d/(e/)?[A-Za-z0-9_-]+(/(edit|view|preview|present|pub|embed))?/?$');
  end if;
  if valid then return null; end if;
  return case field when 'video' then 'Use a YouTube video or Google Drive video file link.'
    when 'slides' then 'Use a Canva design, Canva short link or Google Drive presentation file link.'
    else 'Use a Google Drive link to the final PDF file.' end;
end $$;
revoke all on function public.myssp_material_link_error(text,text) from public,anon,authenticated;

create function public.myssp_validate_material_links() returns trigger
language plpgsql security definer set search_path='' as $$
declare field text; problem text;
begin
  for field in select unnest(array['video','slides','paper']) loop
    if tg_op='INSERT' or new.content->field is distinct from old.content->field then
      problem:=public.myssp_material_link_error(field,new.content->>field);
      if problem is not null then raise exception '%',problem using errcode='22023'; end if;
    end if;
  end loop;
  return new;
end $$;
revoke all on function public.myssp_validate_material_links() from public,anon,authenticated;
create trigger myssp_material_links before insert or update of content on public.myssp_submissions
for each row execute function public.myssp_validate_material_links();

alter function public.myssp_submission_checklist(jsonb,jsonb) rename to myssp_submission_checklist_before_provider_rules;
create function public.myssp_submission_checklist(payload jsonb,content jsonb) returns jsonb
language sql immutable set search_path='' as $$
  select jsonb_agg(case when item->>'id' in ('video','slides','paper') then item || jsonb_build_object(
    'done',trim(coalesce(content->>(item->>'id'),''))<>'' and public.myssp_material_link_error(item->>'id',content->>(item->>'id')) is null,
    'detail',case when trim(coalesce(content->>(item->>'id'),''))='' then 'Add the required material link.' else coalesce(public.myssp_material_link_error(item->>'id',content->>(item->>'id')),'Check sharing permissions and the file contents before approval.') end) else item end order by pos)
  from jsonb_array_elements(public.myssp_submission_checklist_before_provider_rules(payload,content)) with ordinality as e(item,pos);
$$;
revoke all on function public.myssp_submission_checklist(jsonb,jsonb) from public,anon,authenticated;
commit;
