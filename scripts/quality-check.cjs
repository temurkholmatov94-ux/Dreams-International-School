const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = (path) => fs.readFileSync(path, 'utf8');
const html = read('index.html');
const app = read('app.js');
const cloud = read('cloud-auth.js');
const config = read('supabase-config.js');

assert.match(html, /<html[^>]+lang="uz"/, 'The interface document language must be Uzbek.');
assert.ok(html.includes('href="favicon.svg"'), 'The branded favicon must be linked.');
assert.ok(app.includes('const initial={students:[],teachers:[],groups:[],payments:[],expenses:[]'), 'The application must not seed fake school records.');
assert.ok(app.includes('function cleanDemoRecords(data)'), 'Legacy demo-data cleanup must be available.');
assert.ok(app.includes("matches(x,r,['id','name','phone','group'])"), 'Student cleanup must match full seeded record signatures, not names alone.');
assert.ok(app.includes('setData(data){if(!data||typeof data!==\'object\')return;db=cleanDemoRecords'), 'Cloud payload hydration must filter legacy demo records.');

for (const file of ['styles.css', 'supabase-config.js', 'app.js', 'cloud-auth.js', 'uzbek.js']) {
  assert.ok(html.includes(file), `index.html must load ${file}`);
}
assert.match(app, /async function removeRecord\s*\(/, 'Cloud-aware record removal must be async.');
assert.match(cloud, /deleteSchoolRecord:async\s*\(/, 'Cloud deletion API must be present.');
assert.match(cloud, /\.eq\('school_id',profile\.school_id\)/, 'Cloud mutations must be scoped to the current school.');
assert.match(cloud, /status:'Cancelled'/, 'Financial removals must preserve ledger history by cancelling.');
assert.match(cloud, /if\(profile\.role==='accountant'\)return/, 'Accountant sync must not write academic workspace records.');
assert.doesNotMatch(config, /anonKey\\s*:\\s*['\"][^'\"]*(?:service_role|sb_secret)/i, 'Privileged Supabase keys must never ship to the browser.');
assert.match(config, /sb_publishable_|anonKey/, 'A public browser key must be configured.');
assert.match(app, /async function saveAttendance\s*\(/, 'Attendance save must await its cloud result.');
assert.match(app, /const result=await persist\(\)/, 'Attendance must wait for persistence before reporting success.');
assert.match(app, /Attendance saved to the school cloud\./, 'Cloud attendance success must be reported only after persistence resolves.');
assert.match(app, /canMarkAttendance=!window\.schoolCloud\|\|\['owner','admin','teacher'\]\.includes\(role\)/, 'Teachers must be allowed to mark attendance for their assigned groups.');
assert.match(cloud, /attendance_staff_insert/, 'Attendance insert RLS policy must exist.');
assert.match(cloud, /attendance_staff_update/, 'Attendance update RLS policy must exist.');

console.log('Static quality checks passed.');
