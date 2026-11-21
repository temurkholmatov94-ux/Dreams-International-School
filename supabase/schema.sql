-- Dreams International School: secure shared-data foundation
-- Run this in Supabase SQL Editor after creating a Supabase project.
create extension if not exists pgcrypto;

create table if not exists public.school_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null,
  full_name text not null,
  role text not null check (role in ('owner','admin','teacher','accountant')),
  created_at timestamptz not null default now()
);

create table if not exists public.school_data (
  school_id uuid primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.school_profiles enable row level security;
alter table public.school_data enable row level security;

create policy "Users can read their own profile"
on public.school_profiles for select to authenticated
using (user_id = auth.uid());

create policy "School members can read shared school data"
on public.school_data for select to authenticated
using (exists (
  select 1 from public.school_profiles p
  where p.user_id = auth.uid() and p.school_id = school_data.school_id
));

create policy "Owners and admins can create school data"
on public.school_data for insert to authenticated
with check (exists (
  select 1 from public.school_profiles p
  where p.user_id = auth.uid()
    and p.school_id = school_data.school_id
    and p.role in ('owner','admin')
));

create policy "Owners and admins can update school data"
on public.school_data for update to authenticated
using (exists (
  select 1 from public.school_profiles p
  where p.user_id = auth.uid()
    and p.school_id = school_data.school_id
    and p.role in ('owner','admin')
))
with check (exists (
  select 1 from public.school_profiles p
  where p.user_id = auth.uid()
    and p.school_id = school_data.school_id
    and p.role in ('owner','admin')
));

-- Create the first owner profile only after creating the owner in
-- Supabase Authentication > Users. Replace the three values below.
-- insert into public.school_profiles(user_id, school_id, full_name, role)
-- values ('AUTH_USER_UUID', 'A_NEW_RANDOM_UUID', 'School Owner', 'owner');
-- Then initialise the school row:
-- insert into public.school_data(school_id, payload)
-- values ('SAME_SCHOOL_UUID', '{}'::jsonb);
