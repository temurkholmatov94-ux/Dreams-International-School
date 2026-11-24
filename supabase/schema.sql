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

-- Multi-centre platform and parent attendance portal.
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  plan text not null default 'trial' check (plan in ('trial','starter','pro','enterprise')),
  subscription_status text not null default 'trial' check (subscription_status in ('trial','active','past_due','cancelled')),
  created_at timestamptz not null default now()
);
alter table public.school_profiles drop constraint if exists school_profiles_role_check;
alter table public.school_profiles add constraint school_profiles_role_check
  check (role in ('owner','admin','teacher','accountant','parent'));
create table if not exists public.school_groups (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
  external_id text, name text not null, subject text, teacher_name text, schedule text,
  monthly_fee numeric(12,2) not null default 0, created_at timestamptz not null default now(),
  unique (school_id,external_id)
);
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
  external_id text, full_name text not null, phone text, group_name text,
  monthly_fee numeric(12,2) not null default 0, status text not null default 'Active',
  created_at timestamptz not null default now(), unique (school_id,external_id), unique (school_id,id)
);
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null, attendance_date date not null,
  status text not null check (status in ('Present','Absent','Late','Excused')),
  note text, marked_by uuid references auth.users(id), created_at timestamptz not null default now(),
  unique (student_id,attendance_date),
  foreign key (school_id,student_id) references public.students(school_id,id) on delete cascade
);
create table if not exists public.parent_student_links (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade, student_id uuid not null,
  relationship text not null default 'Parent', created_at timestamptz not null default now(),
  unique (parent_user_id,student_id),
  foreign key (school_id,student_id) references public.students(school_id,id) on delete cascade
);
create index if not exists school_groups_school_idx on public.school_groups(school_id);
create index if not exists students_school_idx on public.students(school_id);
create index if not exists attendance_school_date_idx on public.attendance_records(school_id,attendance_date desc);
create index if not exists attendance_student_date_idx on public.attendance_records(student_id,attendance_date desc);
create index if not exists parent_links_parent_idx on public.parent_student_links(parent_user_id);

alter table public.schools enable row level security;
alter table public.school_groups enable row level security;
alter table public.students enable row level security;
alter table public.attendance_records enable row level security;
alter table public.parent_student_links enable row level security;
grant select on public.schools to authenticated;
grant select,insert,update,delete on public.school_groups,public.students,public.attendance_records,public.parent_student_links to authenticated;

drop policy if exists schools_member_read on public.schools;
create policy schools_member_read on public.schools for select to authenticated
using (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=schools.id));
drop policy if exists groups_school_read on public.school_groups;
create policy groups_school_read on public.school_groups for select to authenticated
using (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=school_groups.school_id));
drop policy if exists groups_staff_manage on public.school_groups;
drop policy if exists groups_admin_manage on public.school_groups;
create policy groups_admin_manage on public.school_groups for all to authenticated
using (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=school_groups.school_id and p.role in ('owner','admin')))
with check (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=school_groups.school_id and p.role in ('owner','admin')));
drop policy if exists students_school_or_parent_read on public.students;
create policy students_school_or_parent_read on public.students for select to authenticated
using (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=students.school_id and p.role in ('owner','admin','teacher','accountant'))
or exists(select 1 from public.parent_student_links l where l.student_id=students.id and l.parent_user_id=(select auth.uid())));
drop policy if exists students_staff_manage on public.students;
drop policy if exists students_admin_manage on public.students;
create policy students_admin_manage on public.students for all to authenticated
using (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=students.school_id and p.role in ('owner','admin')))
with check (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=students.school_id and p.role in ('owner','admin')));
drop policy if exists attendance_school_or_parent_read on public.attendance_records;
create policy attendance_school_or_parent_read on public.attendance_records for select to authenticated
using (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=attendance_records.school_id and p.role in ('owner','admin','teacher','accountant'))
or exists(select 1 from public.parent_student_links l where l.student_id=attendance_records.student_id and l.parent_user_id=(select auth.uid())));
drop policy if exists attendance_staff_manage on public.attendance_records;
create policy attendance_staff_manage on public.attendance_records for all to authenticated
using (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=attendance_records.school_id and p.role in ('owner','admin','teacher')))
with check (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=attendance_records.school_id and p.role in ('owner','admin','teacher')));
drop policy if exists parent_links_parent_or_staff_read on public.parent_student_links;
create policy parent_links_parent_or_staff_read on public.parent_student_links for select to authenticated
using (parent_user_id=(select auth.uid()) or exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=parent_student_links.school_id and p.role in ('owner','admin','teacher')));
drop policy if exists parent_links_staff_manage on public.parent_student_links;
create policy parent_links_staff_manage on public.parent_student_links for all to authenticated
using (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=parent_student_links.school_id and p.role in ('owner','admin')))
with check (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=parent_student_links.school_id and p.role in ('owner','admin')));

-- Keep parent accounts out of the all-school JSON workspace.
drop policy if exists school_data_read_school_members on public.school_data;
create policy school_data_read_school_members on public.school_data for select to authenticated
using (exists(select 1 from public.school_profiles p where p.user_id=(select auth.uid()) and p.school_id=school_data.school_id and p.role in ('owner','admin','teacher','accountant')));
