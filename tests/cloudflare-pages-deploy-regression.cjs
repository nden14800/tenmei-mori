const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = fs.readFileSync(
  path.resolve(__dirname, '..', '.github', 'workflows', 'deploy-cloudflare-pages.yml'),
  'utf8',
);

assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- main/);
assert.match(workflow, /uses: cloudflare\/wrangler-action@v3/);
assert.match(workflow, /apiToken: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
assert.match(workflow, /accountId: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
assert.match(workflow, /pages deploy \.\s*\n\s+--project-name=tenmei-mori\s*\n\s+--branch=main/);

console.log('Cloudflare Pages deployment workflow contract passed');
