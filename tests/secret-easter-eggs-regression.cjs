const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const marker = '// 隠しコマンド（イースターエッグ）集';
const start = html.indexOf(marker);
assert(start >= 0, '統合イースターエッグエンジンがありません。');
const end = html.indexOf('</script>', start);
assert(end > start, 'イースターエッグのscript終端がありません。');
const eggs = html.slice(start, end);
[
  'function normalizeSecretWord(value)',
  'function createSecretMatcher(words, onMatch, delayMs)',
  'createSecretMatcher(keyboardWords',
  'window._trySecretWord=function(word)',
  "event.keyCode===229",
  'prefers-reduced-motion:reduce',
  'tenmei-egg-theme-star',
  'tenmei_visit_count',
  'tenmei_seasonal_egg_',
  'tenmei_friday13_',
  'visibilitychange',
  "maintenance:'maintenance'",
  "arigato:'arigatou'",
  "himitsu:   ['封'",
  "hoshi:     ['⭐'",
  "hoshizora: ['🌌'",
  "kitsune:   ['🦊'",
  "omamori:   ['🧿'",
  "matsuri:   ['🏮'",
  'revealKonamiOverlay()',
  'showEggScene(key)'
].forEach((needle) => assert(eggs.includes(needle), '不足: ' + needle));
assert(!eggs.includes('preventDefault('), '通常のキー操作を妨げています。');
assert(!eggs.includes('stopPropagation('), '既存イベントを遮断しています。');

const matcherStart = eggs.indexOf('function normalizeSecretWord(');
const matcherEnd = eggs.indexOf('\\n\\n    var eggs =', matcherStart);
assert(matcherStart >= 0 && matcherEnd > matcherStart, '共通マッチャーを切り出せません。');
const matcherSource = eggs.slice(matcherStart, matcherEnd);
let nextTimer = 0;
const timers = new Map();
const factory = new Function('setTimeout', 'clearTimeout', matcherSource + '\\nreturn {createSecretMatcher,normalizeSecretWord};');
const api = factory((fn) => { const id = ++nextTimer; timers.set(id, fn); return id; }, (id) => timers.delete(id));
function run(input, words, shouldFlush) {
  const found = [];
  const matcher = api.createSecretMatcher(words, (word) => found.push(word), 1200);
  for (const char of input) matcher.push(char);
  if (shouldFlush) matcher.flush();
  return found;
}
assert.deepEqual(run('hoshizora', ['hoshi','hoshizora']), ['hoshizora'], 'hoshizora が hoshi として誤判定されます。');
assert.deepEqual(run('hoshi', ['hoshi','hoshizora'], true), ['hoshi'], 'hoshi の保留確定に失敗しました。');
assert.deepEqual(run('arigatou', ['arigato','arigatou']), ['arigatou'], 'arigatou が arigato として誤判定されます。');
assert.deepEqual(run('tenmei', ['tenmei']), ['tenmei'], '通常の合言葉が即時発火しません。');
assert.equal(api.normalizeSecretWord(' Ｈｏｓｈｉ　Ｚｏｒａ '), 'hoshizora', '全角・空白の正規化に失敗しました。');
console.log('Secret Easter eggs regression checks passed.');