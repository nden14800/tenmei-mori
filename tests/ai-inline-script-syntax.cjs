const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const marker = 'function renderUnifiedAiMarkdown(container, source)';
const markerIndex = html.indexOf(marker);
assert(markerIndex >= 0, 'AI共通MarkdownレンダラーがHTMLにありません。');

const scriptStart = html.lastIndexOf('<script', markerIndex);
const openingEnd = html.indexOf('>', scriptStart);
const closingStart = html.indexOf('</script>', markerIndex);
assert(scriptStart >= 0 && openingEnd >= 0 && closingStart > openingEnd, 'AI共通レンダラーを含むscript要素を特定できません。');
const openingTag = html.slice(scriptStart, openingEnd + 1);
assert(!/type=["']application\/(?:ld\+json|json)["']/i.test(openingTag), 'AIレンダラーがJavaScript以外のscript要素に入っています。');

const scriptSource = html.slice(openingEnd + 1, closingStart);
const checked = spawnSync(process.execPath, ['--check', '-'], {
  input: scriptSource,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024
});
assert.equal(checked.error, undefined, 'Node.js構文チェックを起動できませんでした。');
assert.equal(checked.status, 0, 'index.htmlのAI機能を含むJavaScriptに構文エラーがあります。\n' + (checked.stderr || checked.stdout || '詳細なし'));
console.log('AI機能を含むindex.htmlのJavaScript構文チェックに合格しました。');
