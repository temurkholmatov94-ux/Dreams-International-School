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
assert.match(cloud, /let academicPayload=\{students:payload\.students/, 'Academic data must be synchronised separately.');
assert.match(cloud, /academicPayload=\{\.\.\.current,attendance:academicPayload\.attendance/, 'Teacher saves must preserve owner-managed master data.');
assert.match(schema, /create table if not exists public\.school_academic_data/i, 'Academic workspace table must exist in the schema.');
assert.match(schema, /school_academic_data for select to authenticated[\s\S]*?school_academic_data\.school_id and p\.role in \('owner','admin','teacher'\)/, 'Academic workspace reads must be school- and role-scoped.');
assert.match(schema, /school_data for select to authenticated[\s\S]*?school_data\.school_id and p\.role in \('owner','admin'\)/, 'Full workspace reads must be restricted to owners and admins.');
assert.match(cloud, /sb\.from\('student_homework'\)\.select/, 'Homework must be reloaded from cloud records.');
assert.match(cloud, /sb\.from\('student_results'\)\.select/, 'Grades must be reloaded from cloud records.');
assert.match(app, /if\(Array\.isArray\(shared\.homework\)\)db\.homework=shared\.homework/, 'Homework cloud records must hydrate the workspace.');
assert.match(app, /if\(Array\.isArray\(shared\.results\)\)db\.results=shared\.results/, 'Grade cloud records must hydrate the workspace.');
assert.match(schema, /revoke all privileges on table public\.finance_transactions from public, anon/i, 'Finance table must not be accessible to anonymous users.');
assert.match(schema, /revoke delete on table public\.finance_transactions from public, anon, authenticated/i, 'Direct finance deletion must be revoked.');
assert.match(schema, /school_data\.school_id and p\.role in \('owner','admin'\)/, 'Full workspace data must be restricted to owners and admins.');

assert.match(schema, /drop policy if exists students_staff_manage/i, 'Legacy broad student policies must be removed.');
assert.match(schema, /drop policy if exists groups_staff_manage/i, 'Legacy broad group policies must be removed.');
assert.match(schema, /revoke all privileges on table public\.students, public\.school_groups, public\.attendance_records, public\.student_homework, public\.student_results, public\.parent_student_links from public, anon/i, 'Anonymous access to school records must be revoked.');
assert.match(schema, /revoke truncate, references, trigger on table public\.students/i, 'Authenticated users must not receive structural table privileges.');

assert.match(app, /const canAdd=type=>admin\|\|\(teacher&&\['results','homework'\]\.includes\(type\)\)/, 'Teachers must not create or edit student/group master data.');
assert.match(app, /const canRemove=type=>admin\|\|\(accountant&&\['payments','expenses'\]\.includes\(type\)\)/, 'Teacher record deletion controls must remain disabled.');
assert.match(cloud, /if\(profile\.role==='teacher'\)\{[\s\S]*?academicPayload=\{\.\.\.current,attendance:academicPayload\.attendance/, 'Teacher saves must preserve owner-managed student and group workspace data.');
assert.match(cloud, /if\(\['owner','admin'\]\.includes\(profile\.role\)\)\{[\s\S]*?const localGroups=/, 'Only owners and admins may sync student/group master data.');

assert.match(schema, /student_homework_student_school_fk[\\s\\S]*?foreign key \\(school_id,student_id\\)/i, 'Homework must reference a student in the same school.');
assert.match(schema, /student_results_student_school_fk[\\s\\S]*?foreign key \\(school_id,student_id\\)/i, 'Results must reference a student in the same school.');
assert.match(schema, /attendance_records for select to authenticated using \\([\\s\\S]*?p\\.role in \\('owner','admin','teacher'\\)/, 'Accountants must not read attendance records.');
assert.match(schema, /student_homework for select to authenticated using \\([\\s\\S]*?p\\.role in \\('owner','admin','teacher'\\)/, 'Accountants must not read homework records.');
assert.match(schema, /student_results for select to authenticated using \\([\\s\\S]*?p\\.role in \\('owner','admin','teacher'\\)/, 'Accountants must not read academic results.');
assert.match(schema, /school_academic_data for insert to authenticated[\\s\\S]*?school_academic_data\\.school_id and p\\.role in \\('owner','admin'\\)/, 'Only owners/admins may write the shared academic workspace.');
assert.match(schema, /school_academic_data for update to authenticated[\\s\\S]*?school_academic_data\\.school_id and p\\.role in \\('owner','admin'\\)/, 'Only owners/admins may update the shared academic workspace.');
assert.match(cloud, /const homeworkRows=\\(payload\\.homework\\|\\|\\[\\]\\)\\.flatMap/, 'Group homework must be expanded to each student for cloud persistence.');
assert.match(cloud, /if\\(\\['owner','admin'\\]\\.includes\\(profile\\.role\\)\\)\\{[\\s\\S]*?const academicPayload=/, 'Only owners/admins may write the shared academic workspace.');
console.log('Static quality and role-security checks passed.');
