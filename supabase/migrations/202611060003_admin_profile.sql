-- Store committee portraits outside auth metadata to keep access tokens small.
begin;

create table public.myssp_admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  photo text not null default '' check (
    length(photo) <= 350000 and
    (photo = '' or photo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+=*$')
  )
);

alter table public.myssp_admin_profiles enable row level security;
create policy own_committee_profile on public.myssp_admin_profiles
  for all to authenticated
  using (user_id = (select auth.uid()) and public.myssp_is_admin())
  with check (user_id = (select auth.uid()) and public.myssp_is_admin());
grant select, insert, update on public.myssp_admin_profiles to authenticated;

commit;
