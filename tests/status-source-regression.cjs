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
const statusApi = read('status/functions/api/monitors/status.ts');
const mcpServer = read('workers/tenmei-mori-mcp.js');
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
assert.match(statusPage, /case 'degraded':[\s\S]*?return 'degraded'/, 'Degraded browser observations must be retained for timeline history instead of being discarded as unknown.');
assert.match(statusPage, /case 'partial':[\s\S]*?return 'down'[\s\S]*?return 'degraded'/, 'Partial browser observations must be retained and mapped to outage/degraded history based on component states.');
assert.match(statusPage, /components: sample\.components/, 'Browser health history must retain component states to classify partial observations correctly.');
assert.match(statusPage, /httpFresh[\s\S]*?Math\.max\(5, checkIntervalMinutes \* 3\)/, 'A stale HTTP result must not pin the current row to degraded while fresh browser observations are available.');
assert.ok(fs.existsSync(path.join(root, 'functions/status/api/monitors/status.ts')), 'The main site needs a /status/api/monitors/status route.');
assert.ok(fs.existsSync(path.join(root, 'status/public/logo-192.png')), 'The status app must publish its favicon/logo from Vite public assets.');
assert.ok(fs.existsSync(path.join(root, 'status/public/logo-512.png')), 'The status app must publish its large PWA icon from Vite public assets.');
assert.ok(fs.existsSync(path.join(root, 'status/public/manifest.json')), 'The status app must publish its manifest from Vite public assets.');

assert.ok(!fs.existsSync(path.join(root, 'status/js/static-translation.js')), 'The retired Bergamot translator must not remain alongside the current bilingual status app.');
assert.ok(!fs.existsSync(path.join(root, 'status/data/static-translations/manifest.json')), 'The retired Argos/OpenCC translation manifest must not remain in the active status project.');

assert.ok(read('status/index.html').includes('%BASE_URL%manifest.json'), 'The manifest link must respect standalone and nested base paths.');
assert.ok(fs.existsSync(path.join(root, 'functions/_middleware.js')), 'The main site middleware must remain available for the same-origin API proxy and security headers.');
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

assert.match(statusApi, /This endpoint is intentionally public and read-only/, 'The documented public status endpoint must explain its public read-only contract.');
assert.ok(statusApi.includes("'Access-Control-Allow-Origin': '*'"), 'The public status endpoint must permit cross-origin read-only requests.');
assert.match(statusApi, /if \(request\.method === 'OPTIONS'\)/, 'The public status endpoint must answer CORS preflight requests.');
assert.match(statusApi, /if \(request\.method !== 'GET'\)/, 'The public status endpoint must reject non-GET operations.');
assert.doesNotMatch(statusApi, /isSuspiciousUA|secFetchSite|secFetchMode|Sec-Fetch/, 'The public status endpoint must not block server-side MCP/API clients using browser-only request metadata.');
assert.match(mcpServer, /const STATUS_URL = SITE \+ "\/status\/api\/monitors\/status"/, 'MCP must use the documented public status endpoint.');
assert.match(mcpServer, /name === "get_service_status"/, 'MCP must continue exposing the read-only service status tool.');

assert.match(mcpServer, /const monitors = Object\.fromEntries\(/, 'MCP must project monitor state into a compact summary.');
assert.match(mcpServer, /const recentIncidents =/, 'MCP must expose a bounded recent incident summary.');
assert.doesNotMatch(mcpServer, /toolResult\(await result\.json\(\)\)/, 'MCP must not return the full UI history payload to agents.');


console.log('Status source/security/build regression checks passed.');
