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

## Analytics and family portal update
- Dashboard now includes student-by-group donut chart, daily attendance donut chart, and six-month income/expense bar chart.
- A Parent access page lets an owner/admin invite a parent by email and link the account to a student.
- Parent invitations are sent by the secured `invite-parent` Supabase Edge Function. It requires a signed-in owner/admin and validates that the student belongs to that school.
- Parent accounts can view only linked students and their attendance history. Attendance changes are refreshed through Supabase Realtime.
- Normalized tables now include `schools`, `school_groups`, `students`, `attendance_records`, and `parent_student_links`, all with Row Level Security.

## Important launch limitations
- The current website remains a first-school deployment. A self-service onboarding flow for new centres, automated subscription billing, payment-provider webhooks, custom domains, and platform-owner administration are not implemented yet.
- Parent invitations require a valid parent email address and the centre's email delivery settings to be configured in Supabase Auth.
- The parent portal and charts must be tested with real test accounts before collecting children's real personal data.
- Existing JSON workspace data is still retained for compatibility. Normalized student and attendance data is synchronized from the owner/admin workspace; do not manually edit database rows until the migration and data flow are validated.
- Configure leaked-password protection in Supabase Auth before production use.

### Before sending the first parent invitation
1. In Supabase Dashboard, open **Authentication → URL Configuration**.
2. Set **Site URL** to `https://temurkholmatov94-ux.github.io/Dreams-International-School/`.
3. Add that same URL to **Redirect URLs**.
4. Configure a custom SMTP provider under **Authentication → SMTP Settings** before inviting real families, so invitations are reliably delivered.
5. In **Authentication → Security and Protection**, enable leaked-password protection.

The parent invitation Edge Function is deployed as `invite-parent` with JWT verification enabled. It redirects invitation links to the published website.
