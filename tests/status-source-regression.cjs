const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const cron = read('status/functions/api/cron/check.ts');
const failsafe = read('.github/workflows/status-cron-failsafe.yml');
const vite = read('status/vite.config.ts');
const statusPage = read('status/src/pages/StatusPage.tsx');
const packageJson = JSON.parse(read('status/package.json'));
const packageLock = JSON.parse(read('status/package-lock.json'));

assert.doesNotMatch(cron, /tenmei-mori-github-failsafe-v1/, 'A public hard-coded failsafe token must never be accepted.');
const authSection = cron.slice(cron.indexOf('const isPrimaryAuthorized'), cron.indexOf('if (!isPrimaryAuthorized'));
assert.doesNotMatch(authSection, /isInternalCronAuthorized|CF-Worker|X-Cron-Worker/, 'Worker marker headers must not bypass secret authentication.');
assert.match(cron, /CRON_SECRET && authHeader && timingSafeEqualStr\(authHeader, CRON_SECRET\)/, 'Primary cron requests must require CRON_SECRET.');
assert.match(cron, /FAILSAFE_CRON_TOKEN &&\s*FAILSAFE_CRON_TOKEN\.length >= 32 &&\s*failsafeAuthHeader &&\s*timingSafeEqualStr\(failsafeAuthHeader, FAILSAFE_CRON_TOKEN\)/, 'Failsafe requests must require a long private FAILSAFE_CRON_TOKEN.');
assert.match(failsafe, /secrets\.FAILSAFE_CRON_TOKEN/, 'GitHub failsafe must read a repository secret.');
assert.doesNotMatch(failsafe, /X-Failsafe-Cron-Auth: tenmei-mori-github-failsafe-v1/, 'GitHub workflow must not send a public token.');
assert.match(vite, /base: mainSiteBuild \? '\/status\/' : '\/'/, 'The nested and standalone status builds need separate public base paths.');
assert.match(vite, /outDir: mainSiteBuild \? 'dist-main' : 'dist'/, 'The main-site build must not overwrite the standalone build.');
assert.match(statusPage, /import\.meta\.env\.BASE_URL\}api\/monitors\/status/, 'Status API URL must respect Vite base path.');
assert.ok(fs.existsSync(path.join(root, 'functions/status/api/monitors/status.ts')), 'The main site needs a /status/api/monitors/status route.');
assert.ok(!fs.existsSync(path.join(root, 'functions/_middleware.js')), 'The obsolete developer navigation injection must be removed.');
assert.equal(packageLock.lockfileVersion, 3, 'The status app must keep an npm v3 lockfile.');
assert.deepEqual(packageLock.packages[''].dependencies, packageJson.dependencies, 'Lockfile runtime dependencies must match package.json.');
assert.deepEqual(packageLock.packages[''].devDependencies, packageJson.devDependencies, 'Lockfile development dependencies must match package.json.');
for (const name of ['test', 'build:main', 'typecheck:functions']) {
  assert.equal(typeof packageJson.scripts[name], 'string', `Missing status npm script: ${name}`);
}
for (const script of Object.values(packageJson.scripts)) {
  for (const missing of ['scripts/test-kv-accumulation.mjs', 'tests/monitorEvents.test.ts', 'tests/monitorSecurity.test.ts', 'tests/monitorTimeline.test.ts', 'tsconfig.functions.json']) {
    if (script.includes(missing)) assert.ok(fs.existsSync(path.join(root, 'status', missing)), `Script references missing file: ${missing}`);
  }
}
console.log('Status source/security/build regression checks passed.');
