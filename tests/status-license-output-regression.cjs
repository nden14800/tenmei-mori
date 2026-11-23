const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

for (const outputDirectory of ['status/dist', 'status/dist-main']) {
  const noticesPath = path.join(root, outputDirectory, 'THIRD_PARTY_NOTICES.txt');
  const upstreamLicensePath = path.join(root, outputDirectory, 'UPTIMEWORKER_LICENSE.txt');
  const upstreamNoticePath = path.join(root, outputDirectory, 'UPTIMEWORKER_NOTICE.txt');

  assert.ok(fs.existsSync(noticesPath), `${outputDirectory} must publish third-party dependency notices.`);
  assert.ok(fs.existsSync(upstreamLicensePath), `${outputDirectory} must publish the UptimeWorker Apache license.`);
  assert.ok(fs.existsSync(upstreamNoticePath), `${outputDirectory} must publish the UptimeWorker attribution notice.`);

  const notices = fs.readFileSync(noticesPath, 'utf8');
  const upstreamLicense = fs.readFileSync(upstreamLicensePath, 'utf8');
  const upstreamNotice = fs.readFileSync(upstreamNoticePath, 'utf8');

  assert.match(notices, /THIRD-PARTY SOFTWARE NOTICES/);
  assert.match(notices, /Package: react@/);
  assert.match(notices, /Package: lucide-react@/);
  assert.match(notices, /Package: class-variance-authority@/);
  assert.match(notices, /Declared license:/);
  assert.match(notices, /Permission is hereby granted, free of charge/i, 'The generated document must include actual license text, not only SPDX identifiers.');
  assert.doesNotMatch(notices, /Package: vite@/, 'Development dependencies must not be included.');
  assert.doesNotMatch(notices, /Package: typescript@/, 'Development dependencies must not be included.');
  assert.match(upstreamLicense, /Apache License[\\s\\S]*Version 2\\.0/);
  assert.match(upstreamNotice, /Copyright \\(c\\) 2025-2026 Slym B\\./);
  assert.match(upstreamNotice, /modified derivative of UptimeWorker/);
}

console.log('Standalone and nested status builds include complete license and attribution files.');
