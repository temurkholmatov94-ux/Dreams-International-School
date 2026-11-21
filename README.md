# Dreams International School Management

Responsive management dashboard for the Dreams International School learning center.

## Modules
- Dashboard overview
- Student, teacher and course group registers
- Tuition payment tracking and expense logging
- Daily attendance register
- CSV exports and JSON backup
- Donut charts for student distribution and attendance
- Six-month income and expense bar chart
- Parent invitations and a private attendance portal

## Supabase
The connected Supabase project is configured in `supabase-config.js`. The live database has Row Level Security enabled. See [SETUP.md](SETUP.md) to create the first owner login.

## Preview
Open `index.html` in a modern browser. Without Supabase configuration, the app runs in local preview mode and saves only to that browser.

## Important
The app now has a normalized student/attendance foundation with RLS and a private parent attendance view. The wider multi-centre SaaS onboarding, billing, audit history, and production privacy review are still unfinished. Test with dummy accounts before adding children's real personal data.

## Product readiness roadmap

This repository is an early-stage school-management SaaS prototype. It is not yet a production-ready commercial platform.

### Current foundations
- Supabase authentication and school-scoped data access
- School, staff-profile, student, group, attendance, finance, homework, result and exam-history tables
- Role-aware staff and parent experiences
- Browser preview mode for demonstration with sample data
- Tenant-scoped cloud record deletion and queued cloud saves

### Before commercial launch
1. Complete a security review of every table, RLS policy, Edge Function and role.
2. Add auditable change history for sensitive operations.
3. Replace the browser-local JSON workspace as the primary source of truth with normalized, tenant-scoped records.
4. Complete onboarding, invitations, password recovery, account lifecycle and school provisioning.
5. Add subscription billing, plan limits, trials, invoices and cancellation handling.
6. Add automated tests for tenant isolation, role permissions, data integrity and critical user journeys.
7. Establish backups, restore drills, monitoring, error reporting and incident procedures.
8. Complete privacy, child-data protection, retention and legal review for target markets.

### Development rule
Do not use real children's personal data in preview mode. Use test accounts and synthetic records until production security and privacy checks have been completed.
