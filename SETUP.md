# Supabase setup — Dreams International School

Your Supabase project is already connected to the repository configuration.

- Project: Dreams International School
- Project URL: https://nylemvkbhbqkkmemcyvr.supabase.co
- School ID: 81238c3a-94b5-490a-9ab7-8cbcfc7090db
- Public browser key: configured in supabase-config.js (publishable key only)

## Completed automatically
- Supabase project confirmed active.
- Created public.school_profiles and public.school_data.
- Enabled Row Level Security on both tables.
- Added policies so signed-in members can read their school's data, while only owner/admin roles can write shared data.
- Added supporting indexes and restricted execution of the project's optional public RLS helper function.

## Create the first owner login
For security, create your own password directly in Supabase. Do not send passwords or secret keys in chat.

1. Open Supabase Authentication → Users → Add user.
2. Enter the owner's email and create a strong password. Confirm the user if the dashboard offers that option.
3. Copy the new user's UUID.
4. Open SQL Editor and run the statement below, replacing AUTH_USER_UUID and the owner's display name:

```sql
insert into public.school_profiles (user_id, school_id, full_name, role)
values (
  'AUTH_USER_UUID',
  '81238c3a-94b5-490a-9ab7-8cbcfc7090db',
  'School Owner',
  'owner'
);
```

The school data row is already initialised. After the profile is added, sign in to the website with that email and password.

## Website publishing
The repository includes a GitHub Actions workflow for Pages. In GitHub, open Settings → Pages and set the source to GitHub Actions if it is not already selected. Then check the Actions tab for the deployment result.

## Roles and current limitations
- Owner/admin: can edit and save the shared school data.
- Teacher/accountant: currently read-only; specific workflows and granular permissions are not implemented yet.
- Student/teacher/group/payment/expense data is currently stored as one JSON payload. This is an initial shared-data bridge, not yet a fully normalised production database.
- The dashboard still contains demonstration records. Replace these with verified school records after signing in.
- Before storing children's personal information, complete role-specific access controls, audit history, validation, backups, and privacy/retention procedures.
