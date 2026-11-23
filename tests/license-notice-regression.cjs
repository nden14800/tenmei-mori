const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const rootLicense = read('LICENSE');
const readme = read('README.md');
const statusLicense = read('status/LICENSE');
const statusNotice = read('status/NOTICE');
const statusFooter = read('status/src/components/Footer.tsx');
const statusBranding = read('status/src/config/branding.ts');
const index = read('index.html');
const statusPackage = JSON.parse(read('status/package.json'));
const statusVite = read('status/vite.config.ts');
const noticeGenerator = read('status/scripts/generate-third-party-notices.mjs');

assert.match(rootLicense, /To the extent rights subsist in original project materials and are held by nden148/);
assert.match(rootLicense, /This notice does not claim ownership of material to the extent no copyright subsists or rights belong to another party/);
assert.match(rootLicense, /status\/LICENSE/);
assert.match(rootLicense, /status\/NOTICE/);
assert.match(readme, /第三者ライセンスが適用される部分には各ライセンスが優先します/);
assert.match(readme, /Apache License 2\.0/);
assert.match(statusLicense, /Apache License[\s\S]*Version 2\.0/);
assert.match(statusLicense, /Trademark Notice[\s\S]*UptimeWorker/);
assert.match(statusNotice, /Copyright \(c\) 2025-2026 Slym B\./);
assert.match(statusNotice, /This distribution is a modified derivative of UptimeWorker/);
assert.match(statusFooter, /Powered by UptimeWorker — Apache License 2\.0/);
assert.match(statusFooter, /Original project by[\s\S]*https:\/\/github\.com\/UptimeWorker\/UptimeWorker/);
assert.match(statusBranding, /companyName:'天命乃杜'/);
assert.match(index, /© 2026 天命乃杜 \/ nden148/);
assert.doesNotMatch(statusBranding, /logo\.webp|favicon\.ico/);

assert.doesNotMatch(rootLicense, /Chatling/i, 'The root license must not list the retired Chatling integration.');
assert.doesNotMatch(rootLicense, /Other external services used by the site include/i, 'The root license must not keep a stale hard-coded service inventory.');
assert.ok(!fs.existsSync(path.join(root, 'licenses/edge-tts-LICENSE.txt')), 'An unused edge-tts license bundle must not remain in the repository.');
assert.match(statusVite, /thirdPartyNoticePlugin/, 'Both Vite builds must publish generated license notices.');
assert.match(statusVite, /THIRD_PARTY_NOTICES\.txt/);
assert.match(statusVite, /UPTIMEWORKER_LICENSE\.txt/);
assert.match(statusVite, /UPTIMEWORKER_NOTICE\.txt/);
assert.match(noticeGenerator, /package-lock\.json/, 'Notice generation must use the committed lockfile.');
assert.match(noticeGenerator, /metadata\.dev !== true/, 'Development-only dependencies must be excluded from published notices.');
assert.match(noticeGenerator, /Declared license:/, 'Each dependency must include its declared license identifier.');
assert.match(statusFooter, /THIRD_PARTY_NOTICES\.txt/, 'The status footer must link to third-party license texts.');
assert.match(statusFooter, /UPTIMEWORKER_LICENSE\.txt/, 'The status footer must link to the upstream Apache license.');
assert.match(statusFooter, /UPTIMEWORKER_NOTICE\.txt/, 'The status footer must link to the upstream attribution notice.');
assert.match(statusPackage.scripts.test, /status-license-output-regression\.cjs/, 'The status test command must verify generated files in both build outputs.');

console.log('License, third-party notice, attribution, and copyright checks passed.');
