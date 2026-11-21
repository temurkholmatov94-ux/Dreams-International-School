-- Dreams International School schema.
-- Safe to apply to a new project; the live project was provisioned separately.
create extension if not exists pgcrypto;

create table if not exists public.school_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null,
  full_name text not null,
  role text not null check (role in ('owner','admin','teacher','accountant')),
  created_at timestamptz not null default now()
);
create index if not exists school_profiles_school_id_idx on public.school_profiles(school_id);

create table if not exists public.school_data (
  school_id uuid primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create index if not exists school_data_updated_by_idx on public.school_data(updated_by);

alter table public.school_profiles enable row level security;
alter table public.school_data enable row level security;
grant select on public.school_profiles to authenticated;
grant select, insert, update on public.school_data to authenticated;

drop policy if exists school_profiles_read_own on public.school_profiles;
create policy school_profiles_read_own on public.school_profiles
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists school_data_read_school_members on public.school_data;
create policy school_data_read_school_members on public.school_data
for select to authenticated using (exists (
  select 1 from public.school_profiles p
  where p.user_id = (select auth.uid()) and p.school_id = school_data.school_id
));

drop policy if exists school_data_insert_admins on public.school_data;
create policy school_data_insert_admins on public.school_data
for insert to authenticated with check (exists (
  select 1 from public.school_profiles p
  where p.user_id = (select auth.uid()) and p.school_id = school_data.school_id
    and p.role in ('owner','admin')
));

drop policy if exists school_data_update_admins on public.school_data;
create policy school_data_update_admins on public.school_data
for update to authenticated
using (exists (
  select 1 from public.school_profiles p
  where p.user_id = (select auth.uid()) and p.school_id = school_data.school_id
    and p.role in ('owner','admin')
))
with check (exists (
  select 1 from public.school_profiles p
  where p.user_id = (select auth.uid()) and p.school_id = school_data.school_id
    and p.role in ('owner','admin')
));

-- Restrict the project's optional auto-enable helper if it exists.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
