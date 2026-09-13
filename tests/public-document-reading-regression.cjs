const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

[
  'id="settings-public-documents-toggle"',
  "AppConfig.toggle('publicDocumentReading', this.checked)",
  'tenmei-public-document-reading-complete-fix',
  'html:not(.public-document-reading-disabled)',
  ':is(#view-about, #view-privacy, #view-howto)',
  'data-reading-settings-inline',
  'window.AppConfig.__tenmeiPublicReadingHook',
  "key === 'publicDocumentReading'",
  'refreshPublicDocumentReading',
].forEach((text) => assert(html.includes(text), `公開文書の読書設定契約がありません: ${text}`));

assert.equal((html.match(/id="settings-public-documents-toggle"/g) || []).length, 1);
console.log('公開文書の読書設定回帰テストに合格しました。');
