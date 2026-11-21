# Dreams International School Management

Responsive school / learning-center management dashboard starter.

## Included modules
- Dashboard with recorded student, staff, income and expense totals
- Student, teacher and group registers (add, search, remove)
- Tuition payment register and expense tracker
- Daily attendance register
- CSV exports and JSON data backup
- Responsive desktop and mobile layout

## Run
Open `index.html` in a modern browser. No build step is required.

## Publish using GitHub Pages
1. Go to repository **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select `main` and `/ (root)`, then Save.
4. Wait for Pages to deploy and open the provided URL.

## Supabase authentication and shared-data setup
See [SETUP.md](SETUP.md) for instructions to create a Supabase project, run the secured schema, configure browser keys, provision the first owner, and publish with GitHub Pages.

## Important prototype limitations
This first version stores its records in browser `localStorage` on the device/browser that enters them. It does **not** yet provide secure user accounts, multi-device synchronisation, shared cloud database, role permissions, or automatic cloud backups. Sample names and amounts are demonstration data. Do not enter sensitive student information until a secure backend, authentication, permissions, and backup process are implemented.
