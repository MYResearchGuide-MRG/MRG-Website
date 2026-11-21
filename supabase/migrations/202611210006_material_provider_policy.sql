-- Confirmed submission policy: YouTube video, Canva slides, Google Drive PDF.
-- Replaces the broader provider rules from 004 without rewriting stored work.
-- The existing trigger checks changed links; the checklist checks all links.
begin;
create or replace function public.myssp_material_link_error(field text, value text) returns text
language plpgsql immutable set search_path='' as $$
declare u text:=trim(coalesce(value,'')); host text; path text; valid boolean:=false;
begin
  if u='' then return null; end if;
  if length(u)>2048 or u !~* '^https?://' or u ~ '[[:cntrl:]]' then return 'Enter a complete HTTP or HTTPS share link.'; end if;
  host:=lower(substring(u from '(?i)^https?://([^/?#]+)'));
  path:=coalesce(substring(u from '(?i)^https?://[^/?#]+([^?#]*)'),'');
  if field='paper' and host='drive.google.com' then
    valid:=path ~ '^/file/(u/[0-9]+/)?d/[A-Za-z0-9_-]{1,200}(/(view|preview|edit))?/?$'
      or (path in ('/open','/uc') and u ~ '[?&]id=[A-Za-z0-9_-]{1,200}(&|#|$)');
  elsif field='video' then
    valid:=(host='youtu.be' and path ~ '^/[A-Za-z0-9_-]{11}/?$') or
      (host in ('youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com') and
        (path ~ '^/(embed|shorts|live)/[A-Za-z0-9_-]{11}/?$' or (path='/watch' and u ~ '[?&]v=[A-Za-z0-9_-]{11}(&|#|$)')));
  elsif field='slides' then
    valid:=(host in ('canva.com','www.canva.com') and path ~ '^/design/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)?/(view|edit|watch)/?$')
      or (host in ('canva.link','www.canva.link') and path ~ '^/[A-Za-z0-9_-]+/?$');
  end if;
  if valid then return null; end if;
  return case field when 'video' then 'Use a YouTube video link.'
    when 'slides' then 'Use a Canva design or Canva short link.'
    else 'Use a Google Drive link to the final PDF file.' end;
end $$;
revoke all on function public.myssp_material_link_error(text,text) from public,anon,authenticated;
commit;
