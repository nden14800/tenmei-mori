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
assert(eggs.includes("if (key==='maintenance') { checkMaintenance(true); return true; }"), 'メンテナンス合言葉の既存処理が変更されています。');

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
  'tm-ad-banner','tm-ad-billboard','tm-ad-leaderboard','tm-ad-mobile-banner','tm-ad-skyscraper',
  'tm-ad-infeed','tm-ad-inarticle','tm-ad-sponsored-story','tm-ad-rectangle','tm-ad-halfpage',
  'tm-ad-multiplex','tm-ad-search','tm-ad-video','tm-ad-related','tm-ad-anchor',
  'min-height:600px','@media(min-width:1824px)','IMAGE_ASSETS','function art(c)',
  'Urijima-onsen_Hot_spring.jpg','Anekaeshi_%28wagashi%29.jpg','Celullar_or_mobile_phone.jpg',
  'VEGETABLES.jpg','Taxi.jpeg','Bottle_image.jpg',
  'CC0 1.0','広告主・商品・価格・リンク先は実在せず',
  'window.showToast(message','tm-ad-dismiss','function closeAll()','function onEscape(event)',
  'contentView','editorialItems.length>=8','window.matchMedia'
].forEach((needle) => assert(adEgg.includes(needle), '広告イースターエッグの不足: ' + needle));
assert(adHtml.includes("koukoku:'koukoku'"), '広告の合言葉が既存エンジンに登録されていません。');
assert(adHtml.includes("key==='koukoku'"), '広告の合言葉が既存の共通トリガーを利用していません。');
assert(adHtml.includes('window.TenmeiMockAds.show()'), '広告の表示APIが呼び出されていません。');
assert(!adEgg.includes("document.addEventListener('keydown'"), '広告だけの独自キーボード判定が残っています。');
assert(!adEgg.includes('window._trySecretWord='), '既存の合言葉処理を上書きしています。');
assert(!adEgg.includes('sessionStorage'), '広告表示に独自セッション制限が残っています。');
assert(!adEgg.includes('Math.random()<.18'), '広告表示に独自確率制限が残っています。');
assert(!adEgg.includes('setTimeout(render'), '広告表示に時間待ち条件が残っています。');
assert(!adEgg.includes('tm-ad-demo-notice')&&!adEgg.includes('tm-ad-toast')&&!adEgg.includes('function notice()'), '独自通知UIが残っています。');
assert(!adEgg.includes('<svg viewBox='), '手製の簡易SVG画像が残っています。');
assert(adEgg.includes("window.addEventListener('scroll'"), 'アンカー広告のスクロール表示がありません。');
assert(adEgg.includes("window.showToast('以下はすべて架空の広告です。実在の広告配信・販売・申込はありません。','info','広告デモ')"), '共通通知UIでデモ表示を説明していません。');
assert(adEgg.includes("document.createElement(format==='tm-ad-infeed'?'li':'aside')"), 'インフィード広告がリスト要素として挿入されていません。');
assert(adEgg.includes("window.TenmeiMockAds={show,close:closeAll"), '広告デモを閉じるAPIがありません。');

assert(adEgg.includes("dismissedAds.add(e.id)")&&adEgg.includes("dismissedAds.has(id)"), '個別に閉じた広告が再描画で復活します。');
assert(adEgg.includes("className='tm-ad-global-close'")&&adEgg.includes('広告をすべて非表示'), '広告デモ全体を終了するボタンがありません。');
assert(adEgg.includes("document.querySelectorAll('.tm-ad-unit,.tm-ad-toolbar,.tm-ad-info-panel').forEach(el=>el.remove())"), '全広告終了時に広告枠と操作バーを一括削除していません。');
assert(adEgg.includes("!dismissedAds.has('tenmei-ad-side-rail')"), '閉じたサイド広告が再表示される可能性があります。');
assert(adEgg.includes("document.querySelectorAll('.tm-ad-unit,.tm-ad-toolbar,.tm-ad-info-panel').forEach(el=>el.remove())"), '対象外ページへ移動したときに広告操作バーを片付けていません。');
assert(adEgg.includes("再表示するには合言葉「koukoku」を入力してください"), '全広告終了後の再表示方法が明示されていません。');
assert(adEgg.includes("role','dialog'")&&adEgg.includes("aria-expanded','true'")&&adEgg.includes('function closeInfo()'), '広告情報パネルのアクセシブルな開閉制御がありません。');
assert(adEgg.includes('position:fixed')&&adEgg.includes('p.offsetHeight'), '広告情報パネルが広告枠のoverflowで切れない配置になっていません。');
assert(adEgg.includes("if(activeInfo){closeInfo();return;}"), 'Escapeキーで情報パネルを先に閉じる制御がありません。');
assert(adEgg.includes('bi bi-info-circle')&&adEgg.includes('bi bi-x-lg')&&adEgg.includes('bi bi-eye-slash'), 'サイト共通のBootstrap Iconsを使用していません。');
assert(!adEgg.includes('<svg')&&!adEgg.includes('textContent=\'×\'')&&!adEgg.includes("textContent='i'"), '広告だけの独自SVG・文字アイコンが残っています。');
assert(adEgg.includes('tenmei-article-audio__button')||adEgg.includes('min-height:40px'), '広告操作ボタンのタップ領域が共通コントロール基準に揃っていません。');

assert(adEgg.includes("className='tm-ad-controls'")&&adEgg.includes("controls.appendChild(close);e.appendChild(controls)"), '広告の閉じる・情報ボタンが専用の操作列に分離されていません。');
assert(adEgg.includes("function closeAll(options)")&&adEgg.includes("if(!options.silent"), '広告デモ全終了時の通知抑制・一括終了APIがありません。');
assert(adEgg.includes("const style=document.getElementById('tenmei-ad-demo-style');if(style)style.remove()"), '広告デモ終了後に広告専用スタイルが残ります。');
assert(adEgg.includes("if(view&&view.id!==lastViewId)")&&adEgg.includes("dismissedAds.clear()"), 'ページ遷移後に広告枠を再生成する処理がありません。');
assert(adEgg.includes("window.innerWidth>=1824"), 'サイドレール広告のデスクトップ幅条件が不正です。');
assert(!adEgg.slice(adEgg.indexOf('function rectangle('),adEgg.indexOf('function multiplex(')).includes('e.innerHTML'), '広告コントロールを innerHTML で消去する実装が残っています。');
assert(html.includes('window.closeTenmeiHiddenEffects = closeAllHiddenEffects'), '全隠し演出を終了する共通APIがありません。');
assert(html.includes('tenmei-maintenance-preview')&&html.includes('previewHost.innerHTML = maintenanceMarkup')&&html.includes('document.body.appendChild(previewHost)'), 'メンテナンス確認が通常画面を置き換えずに表示されません。');
assert(html.includes('tenmei-secret-close-all'), 'コナミ演出に全終了ボタンがありません。');
assert(html.includes('tenmeiSakuraTimers')&&html.includes('tenmeiSakuraNodes'), '桜吹雪の演出を即時に全終了できません。');
assert(html.includes('tenmei-global-button-interactions'), '全ページ共通のボタン操作フィードバックがありません。');



console.log('Secret Easter eggs regression checks passed.');