# Dreams International School Management

Responsive management dashboard for the Dreams International School learning center.

## Modules
- Dashboard overview
- Student, teacher and course group registers
- Tuition payment tracking and expense logging
- Daily attendance register
- CSV exports and JSON backup

## Supabase
The connected Supabase project is configured in `supabase-config.js`. The live database has Row Level Security enabled. See [SETUP.md](SETUP.md) to create the first owner login.

## Preview
Open `index.html` in a modern browser. Without Supabase configuration, the app runs in local preview mode and saves only to that browser.

## Important
The dashboard is an early version. It uses one JSON payload for school records, includes demonstration data, and currently gives teacher/accountant roles read-only access. Do not enter sensitive child information until granular role permissions, audit history, backups, and privacy controls have been completed.
