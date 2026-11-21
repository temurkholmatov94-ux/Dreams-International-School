const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = (path) => fs.readFileSync(path, 'utf8');
const html = read('index.html');
const app = read('app.js');
const cloud = read('cloud-auth.js');
const config = read('supabase-config.js');

assert.match(html, /<html[^>]+lang="uz"/, 'The interface document language must be Uzbek.');
for (const file of ['styles.css', 'supabase-config.js', 'app.js', 'cloud-auth.js', 'uzbek.js']) {
  assert.ok(html.includes(file), `index.html must load ${file}`);
}
assert.match(app, /async function removeRecord\s*\(/, 'Cloud-aware record removal must be async.');
assert.match(cloud, /deleteSchoolRecord:async\s*\(/, 'Cloud deletion API must be present.');
assert.match(cloud, /\.eq\('school_id',profile\.school_id\)/, 'Cloud mutations must be scoped to the current school.');
assert.match(cloud, /status:'Cancelled'/, 'Financial removals must preserve ledger history by cancelling.');
assert.match(cloud, /if\(profile\.role==='accountant'\)return/, 'Accountant sync must not write academic workspace records.');
assert.doesNotMatch(config, /anonKey\s*:\\s*['\"][^'\"]*(?:service_role|sb_secret)/i, 'Privileged Supabase keys must never ship to the browser.');
assert.match(config, /sb_publishable_|anonKey/, 'A public browser key must be configured.');
const schema = read('supabase/schema.sql');

assert.match(app, /function canOpenPage\(p\)/, 'Page navigation must enforce role permissions.');
assert.match(app, /function go\(p\)\{if\(!canOpenPage\(p\)\)/, 'Direct navigation must be blocked for unauthorised roles.');
assert.match(app, /allowedPages=admin\?null:teacher\?\[/, 'Teacher navigation must use an explicit allow-list.');
assert.match(app, /accountant\?\['dashboard','payments','expenses','finance','reports'\]/, 'Accountant navigation must be finance-focused.');
assert.match(cloud, /profile\.role==='teacher'\?'school_academic_data':'school_data'/, 'Teachers must load the academic-only workspace.');
assert.match(cloud, /\['parent','accountant'\]\.includes\(profile\.role\)/, 'Parents and accountants must not load the full workspace JSON.');
assert.match(cloud, /const academicPayload=\{students:payload\.students/, 'Academic data must be synchronised separately.');
assert.match(schema, /create table if not exists public\.school_academic_data/i, 'Academic workspace table must exist in the schema.');
assert.match(schema, /school_academic_data\.school_id and p\.role in \('owner','admin','teacher'\)/, 'Academic workspace reads must be school- and role-scoped.');
assert.match(schema, /school_academic_data\.school_id and p\.role in \('owner','admin'\)/, 'Academic workspace writes must be restricted to administrators.');
assert.match(schema, /revoke all privileges on table public\.finance_transactions from public, anon/i, 'Finance table must not be accessible to anonymous users.');
assert.match(schema, /revoke delete on table public\.finance_transactions from public, anon, authenticated/i, 'Direct finance deletion must be revoked.');
assert.match(schema, /school_data\.school_id and p\.role in \('owner','admin'\)/, 'Full workspace data must be restricted to owners and admins.');
console.log('Static quality and role-security checks passed.');
