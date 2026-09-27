const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

[
  'data-setting="publicDocumentReading"',
  "AppConfig.toggle('publicDocumentReading', true)",
  "AppConfig.toggle('publicDocumentReading', false)",
  'tenmei-public-document-reading-complete-fix',
  'html:not(.public-document-reading-disabled)',
  ':is(#view-about, #view-privacy, #view-howto)',
  'data-reading-settings-inline',
  'window.AppConfig.__tenmeiPublicReadingHook',
  "key === 'publicDocumentReading'",
  'refreshPublicDocumentReading',
].forEach((text) => assert(html.includes(text), `公開文書の読書設定契約がありません: ${text}`));

assert.equal((html.match(/data-setting="publicDocumentReading"/g) || []).length, 1);
assert.equal((html.match(/data-value="true" onclick="AppConfig.toggle\('publicDocumentReading', true\)"/g) || []).length, 1);
assert.equal((html.match(/data-value="false" onclick="AppConfig.toggle\('publicDocumentReading', false\)"/g) || []).length, 1);
assert(html.includes("group.dataset.value = String(enabled)"), '公開文書の適用状態がセグメントコントロールへ同期されません。');
console.log('公開文書の読書設定回帰テストに合格しました。');
