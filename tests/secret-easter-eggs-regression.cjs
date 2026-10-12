const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const marker = '// 隠しコマンド（イースターエッグ）集';
const start = html.indexOf(marker);
assert(start >= 0, '既存のイースターエッグ集が残っていません。');
const endMarker = '} catch(eOuter) {\n    // 全体が失敗しても、サイトの他機能には一切影響しない\n}';
const end = html.indexOf(endMarker, start);
assert(end > start, 'イースターエッグ集の終端が見つかりません。');
const eggs = html.slice(start, end);
[
  "var KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']",
  "var SAKURA_WORD = 'tenmei'", "var MAINTENANCE_TEST_WORD = 'maintenance'",
  "var THANKS_WORD = 'arigatou'", 'visibilitychange', 'tenmei_visit_count',
  'tenmei_seasonal_egg_', 'tenmei_friday13_', 'TENMEI EXTRA EASTER EGGS v1',
  'omamori: function()', 'kitsune: function()', 'inari: function()',
  'torii: function()', 'hoshi: function()', 'komorebi: function()', 'yokai: function()',
  'miko: function()', 'shimenawa: function()', 'shukufuku: function()', 'enishi: function()',
  'kagura: function()', 'tsukuyomi: function()', 'himitsu: function()', 'kotodama: function()',
  'omikuji: function()', 'tanuki: function()', 'hoshizora: function()', 'nagomi: function()',
  'yuzu: function()', 'komainu: function()', 'kagami: function()', 'akari: function()',
  'koyomi: function()', 'tsubaki: function()', 'matsuri: function()', 'suzune: function()',
  "tag === 'SELECT'", 'target.isContentEditable', 'prefers-reduced-motion: reduce',
  'slice(-10)', 'extraEggWords[extraWordKey]', 'window._trySecretWord(word)'
].forEach((needle) => assert(eggs.includes(needle), '不足: ' + needle));
assert(!eggs.includes('preventDefault('), '通常のキー操作を妨げています。');
assert(!eggs.includes('stopPropagation('), '既存イベントを遮断しています。');
console.log('Secret Easter eggs regression checks passed.');
