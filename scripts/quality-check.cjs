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
assert.doesNotMatch(config, /service_role|sb_secret/i, 'Privileged Supabase keys must never ship to the browser.');
assert.match(config, /sb_publishable_|anonKey/, 'A public browser key must be configured.');
console.log('Static quality checks passed.');
