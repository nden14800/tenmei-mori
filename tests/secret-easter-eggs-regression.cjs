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
  "e.keyCode===229",
  'prefers-reduced-motion:reduce',
  'tenmei-egg-theme-star',
  'tenmei_visit_count',
  'tenmei_seasonal_egg_',
  'tenmei_friday13_',
  'visibilitychange',
  "maintenance:'maintenance'",
  "arigato:'arigatou'",
  "himitsu:   ['🔓'",
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
assert(eggs.includes('createSecretMatcher(keyboardWords,function(word){var key=resolveSecretWord(word);if(key)triggerSecretWord(key);},900)'), '接頭辞が重なる合言葉の待機時間が想定と異なります。');
assert(eggs.includes('function onIdleActivity(){var now=Date.now();if(now-lastActivityAt<750)return;lastActivityAt=now;resetIdleTimer();}'), 'アイドル監視のマウス移動処理が間引かれていません。');
assert(eggs.includes("showEggScene(key); return true;"), '手動の合言葉が共通の中央カード演出を使用していません。');
assert(eggs.includes("if (key==='maintenance') { showEggScene('maintenance'); return true; }"), 'メンテナンス合言葉が中央カードだけで表示されません。');
assert(!eggs.includes("if (key==='maintenance') { try { if(typeof checkMaintenance==='function')checkMaintenance(true); } catch (_) {} showEggScene('maintenance'); return true; }"), 'メンテナンス合言葉が中央カード以外の表示処理も起動しています。');
assert(eggs.includes("if (!overlay) { showEggScene('himitsu'); return; }"), 'コナミコマンドのフォールバックが壊れています。');

const matcherStart = eggs.indexOf('function normalizeSecretWord(');
const matcherEnd = eggs.indexOf('\n\n    var eggs =', matcherStart);
assert(matcherStart >= 0 && matcherEnd > matcherStart, '共通マッチャーを切り出せません。');
const matcherSource = eggs.slice(matcherStart, matcherEnd);
let nextTimer = 0;
const timers = new Map();
const factory = new Function('setTimeout', 'clearTimeout', matcherSource + '\nreturn {createSecretMatcher,normalizeSecretWord};');
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
assert.deepEqual(run('koukoku', ['koukoku']), ['koukoku'], '広告の合言葉が既存の共通マッチャーで発火しません。');
assert.equal(api.normalizeSecretWord(' Ｈｏｓｈｉ　Ｚｏｒａ '), 'hoshizora', '全角・空白の正規化に失敗しました。');

// 未完成の入力を放置した後、別の入力を足して合言葉が誤発火しないことを確認。
function createTimedMatcher(words) {
  let id = 0;
  const localTimers = new Map();
  const matches = [];
  const make = new Function('setTimeout', 'clearTimeout', matcherSource + '\nreturn createSecretMatcher;');
  const create = make((fn) => { const next = ++id; localTimers.set(next, fn); return next; }, (timerId) => localTimers.delete(timerId));
  return {
    matches,
    matcher: create(words, (word) => matches.push(word), 1200),
    advance() {
      const due = Array.from(localTimers.entries());
      localTimers.clear();
      due.forEach(([, fn]) => fn());
    }
  };
}
const stale = createTimedMatcher(['hoshi','hoshizora']);
stale.matcher.push('h'); stale.matcher.push('o'); stale.matcher.push('s');
stale.advance();
stale.matcher.push('h'); stale.matcher.push('i');
stale.advance();
assert.deepEqual(stale.matches, [], '時間を空けた未完成入力が後続入力と結合しています。');

// 最長一致の保留中に続きを入力した場合は、短い合言葉を誤発火させない。
const continued = createTimedMatcher(['hoshi','hoshizora']);
for (const char of 'hoshi') continued.matcher.push(char);
continued.matcher.push('z');
for (const char of 'ora') continued.matcher.push(char);
assert.deepEqual(continued.matches, ['hoshizora'], '接頭辞の保留が続きの入力で正しく解除されません。');

const adEgg = fs.readFileSync(path.resolve(__dirname, '..', 'assets/js/tenmei-ad-easter-egg.js'), 'utf8');
const adHtml = html.slice(start, end);
[
  '杜の湯庵','神彩堂','結び守り工房','京菓子 こよみ','SORA MOBILE',
  '青葉オンライン学舎','NATURE LAB','日々の台所','KURASHI LIFE','旅する日本茶',
  '白狐タクシー','暦の宿',
  'tm-ad-banner','tm-ad-billboard','tm-ad-infeed','tm-ad-inarticle','tm-ad-sponsored-story','tm-ad-rectangle','tm-ad-halfpage',
  'tm-ad-multiplex','tm-ad-search','tm-ad-video','tm-ad-related','tm-ad-anchor','height:600px','@media(min-width:1500px)',
  'function art(c)','<svg viewBox=','tm-art-onsen','tm-art-mobile','tm-art-vegetable','tm-art-tea',
  '広告主・商品・価格は実在しません','外部リンク','クリック計測','TenmeiMockAds={show'
].forEach((needle) => assert(adEgg.includes(needle), '広告イースターエッグの不足: ' + needle));
assert(adHtml.includes("koukoku:'koukoku'"), '広告の合言葉が既存エンジンに登録されていません。');
assert(adHtml.includes("key==='koukoku'"), '広告の合言葉が既存の共通トリガーを利用していません。');
assert(adHtml.includes('window.TenmeiMockAds.show()'), '広告の表示APIが呼び出されていません。');
assert(!adEgg.includes("document.addEventListener('keydown'"), '広告だけの独自キーボード判定が残っています。');
assert(!adEgg.includes('window._trySecretWord='), '既存の合言葉処理を上書きしています。');
assert(!adEgg.includes('sessionStorage'), '広告表示に独自セッション制限が残っています。');
assert(!adEgg.includes('Math.random()<.18'), '広告表示に独自確率制限が残っています。');
assert(!adEgg.includes('setTimeout(render'), '広告表示に時間待ち条件が残っています。');
assert(adEgg.includes("window.addEventListener('scroll'"), 'アンカー広告のスクロール表示がありません。');

console.log('Secret Easter eggs regression checks passed.');