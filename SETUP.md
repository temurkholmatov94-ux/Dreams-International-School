# Supabase setup — Dreams International School

The app has a Supabase authentication/cloud-data integration scaffold. It will not connect until you create a Supabase project and add its project URL and public anon/publishable key.

## 1. Create a Supabase project
1. Create/sign in at https://supabase.com.
2. Create a new project for Dreams International School.
3. Keep the database password private.
4. Open Project Settings → API (or Data API / API Keys).
5. Copy the Project URL and the anon/public or publishable key. Never use the service_role or secret key in browser code.

## 2. Create database tables and security policies
1. In Supabase, open SQL Editor → New query.
2. Copy all of supabase/schema.sql from this repository into the editor.
3. Run the SQL.

## 3. Configure the website
1. Open supabase-config.js in this repository.
2. Replace https://YOUR-PROJECT.supabase.co with your Project URL.
3. Replace YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY with the public anon/publishable key.
4. Commit the change. Never paste a service-role secret.

## 4. Create the first owner account
1. In Supabase, open Authentication → Users → Add user.
2. Create the owner's email/password. Use a strong, unique password.
3. Copy the new user's UUID.
4. Generate a new random UUID for the school.
5. In SQL Editor, run this, replacing the example values:

```sql
insert into public.school_profiles (user_id, school_id, full_name, role)
values ('AUTH_USER_UUID', 'SCHOOL_UUID', 'School Owner', 'owner');

insert into public.school_data (school_id, payload)
values ('SCHOOL_UUID', '{}'::jsonb);
```

The same SCHOOL_UUID must be used in both statements.

## 5. Publish with GitHub Pages
1. Repository Settings → Pages.
2. Choose Deploy from a branch, branch main, folder / (root).
3. Save and wait for the deployment URL.

## Current status and limitations
- The browser app has an email/password sign-in screen and reads the signed-in user's school profile.
- School data is stored as one JSON document per school, protected by Supabase row-level security.
- The current app only syncs writes for owner/admin profiles. Teacher and accountant workflows need more granular permissions and UI restrictions before operational use.
- Initial demo records are illustrative only. The first cloud sync uses the database's saved payload when it exists; otherwise browser demo data may be saved after the owner makes a change.
- This is a foundation, not a production-ready student information system. Before storing children's personal information, add field-level validation, audited changes, fine-grained role permissions, secure backups, privacy/retention policies, and thoroughly test RLS.
