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
