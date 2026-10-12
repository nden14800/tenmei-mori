const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const existingEggs = html.match(/\/\/ 隠しコマンド（イースターエッグ）集[\s\S]*?\}\)\(\);\n<\/script>/)?.[0] || '';

assert(existingEggs, '既存のイースターエッグ集が残っていません。');
[
  "var KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']",
  "var SAKURA_WORD = 'tenmei'",
  "var MAINTENANCE_TEST_WORD = 'maintenance'",
  "var THANKS_WORD = 'arigatou'",
  'visibilitychange',
  'tenmei_visit_count',
  'tenmei_seasonal_egg_',
  'tenmei_friday13_',
  'TENMEI EXTRA EASTER EGGS v1',
  'omamori: function()',
  'kitsune: function()',
  'inari: function()',
  "tag === 'SELECT'",
  'target.isContentEditable',
  'prefers-reduced-motion: reduce'
].forEach((needle) => {
  assert(existingEggs.includes(needle), '隠し要素または安全策が不足しています: ' + needle);
});

assert(!existingEggs.includes('preventDefault('), '隠しコマンドが通常のキー操作を妨げています。');
assert(!existingEggs.includes('stopPropagation('), '隠しコマンドが既存イベントを遮断しています。');
console.log('Secret Easter eggs regression checks passed.');
