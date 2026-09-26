const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function requireText(text, message) {
  assert(html.includes(text), message);
}

function requireCount(pattern, minimum, message) {
  const count = (html.match(pattern) || []).length;
  assert(count >= minimum, `${message}（検出数: ${count}）`);
}

const statsSection = html.match(
  /<section id="view-stats"[\s\S]*?<\/section>\s*<!-- ビュー: 参拝証の発行/
)?.[0] || '';
assert(statsSection, '参拝の記録画面のセクションを抽出できません。');

[
  '<section id="view-stats" class="view-section stats-record-layout relative" aria-labelledby="stats-record-title">',
  'class="stats-record-hero"',
  'data-ver4-hero-emblem',
  'class="stats-record-mark"',
  'id="stats-content-wrapper" class="stats-record-stack"',
  'class="stats-record-stat-grid"',
  'class="stats-record-stat-card hero-total stats-card-interactive"',
  'class="stats-record-stat-card hero-daikichi stats-card-interactive"',
  'id="stats-insight-area" class="stats-record-insight stats-card-interactive"',
  'id="grid-total"',
  'id="graph-total-body"',
  'id="grid-spectrum"',
  'id="stats-spectrum-list"',
  'id="stats-lock"',
  'openGuestNameModal(() => { showView(\'stats\'); loadMyStats(); })',
].forEach((text) => requireText(text, `参拝の記録のVer.4.0構造または既存機能IDが失われています: ${text}`));

assert.equal(
  statsSection.includes('stats-header-hero-card'),
  false,
  '参拝の記録に置換前のstats-header-hero-cardが残っています。'
);
assert.equal(
  statsSection.includes('class="stats-record-title"><i'),
  false,
  '参拝の記録のヒーロータイトル左にアイコンが残っています。'
);
assert.equal(
  statsSection.includes('stats-record-panel-icon'),
  false,
  '参拝の記録の通常カード見出し左にアイコンが残っています。'
);

[
  '.stats-record-layout {',
  '#view-stats .stats-record-hero::before {',
  'inset: 12px;',
  'width: 128px;',
  'height: 128px;',
  'box-shadow: inset 0 0 0 7px',
  '.dark #view-stats .stats-record-hero {',
  '.dark #view-stats .stats-record-meta span,',
  'html:not(.light) #view-stats .stats-record-meta span {',
  'border: 0 !important;',
  'background: transparent !important;',
  '@media (max-width: 768px) {',
  '#view-stats.stats-record-layout {',
  'width: min(100% - 32px, 960px) !important;',
  'padding: 0 0 48px !important;',
  'font-size: clamp(2rem, 4.1vw, 3rem);',
].forEach((text) => requireText(text, `参拝の記録の共通意匠・テーマ・レスポンシブ規則が不足しています: ${text}`));

[
  '<footer id="site-footer" class="footer-v4">',
  'class="footer-v4-line"',
  'id="footer-main-grid" class="footer-v4-main"',
  'class="footer-v4-brand"',
  'class="footer-v4-social"',
  'id="footer-nav-grid" class="footer-v4-nav" aria-label="フッターの主要ナビゲーション"',
  'class="footer-v4-bottom"',
  '.footer-v4 {',
  '.footer-v4-social-link {',
  '.footer-v4-nav {',
  'border-radius: 0;',
  'grid-template-columns: minmax(240px, 0.78fr) minmax(0, 2.22fr);',
  '.footer-v4-social-link.footer-v4-social-discord',
  '.footer-v4-social-link.footer-v4-social-github',
  '.footer-v4-social-link.footer-v4-social-youtube',
].forEach((text) => requireText(text, `フッターのVer.4.0構造またはテーマ規則が不足しています: ${text}`));

const footerSection = html.match(/<footer id="site-footer"[\s\S]*?<\/footer>/)?.[0] || '';
assert(footerSection, 'サイトフッターを抽出できません。');
assert.equal(footerSection.includes('class="footer-v4-group"'), false, 'フッターのリンク群が個別カードとして再導入されています。');
requireCount(/class="footer-v4-social-link footer-v4-social-(discord|github|youtube)"/g, 3, 'フッターのブランド色付きSNS導線が3件保持されていません。');
requireCount(/showView\('/g, 15, '既存の内部画面遷移導線が不足しています。');

[
  '<nav id="news-pagination" class="news-bulletin-pagination" aria-label="社務所だよりのページ送り"></nav>',
  '<nav id="column-pagination" class="column-library-pagination" aria-label="神籤草子のページ送り"></nav>',
  'let html = `<div class="modern-pagination ver4-pagination"',
  'aria-label="最初のページへ"',
  'aria-label="前のページへ"',
  'aria-label="次のページへ"',
  'aria-label="最後のページへ"',
  'aria-label="移動するページ番号"',
  '.modern-pagination.ver4-pagination {',
].forEach((text) => requireText(text, `記事一覧ページネーションのVer.4.0操作契約が不足しています: ${text}`));

[
  'data-control-kind="choice" data-control-id="user-sign"',
  'data-control-kind="choice" data-control-id="user-blood"',
  'data-control-kind="choice" data-control-id="search-type"',
  'data-control-kind="date" data-control-id="search-date-start"',
  'data-control-kind="date" data-control-id="search-date-end"',
  'role="listbox"',
  'role="dialog" aria-modal="false"',
  'role="grid"',
  'class="tenmei-choice__trigger"',
  'class="tenmei-date__trigger"',
  'const TenmeiCustomControls = (() => {',
  'window.TenmeiCustomControls = TenmeiCustomControls;',
  'window.TenmeiCustomControls?.syncAll();',
  '.tenmei-choice__popover,',
  '.tenmei-date__popover {',
  '#view-history .history-control-bar.is-control-expanded { z-index: 160; }',
  'datetime="2026-08-17">更新: 2026年8月17日</time>',
  "root.closest('.history-control-bar, .zodiac-ranking-panel')?.classList.add('is-control-expanded');",
  "root.closest('.history-control-bar, .zodiac-ranking-panel')?.classList.remove('is-control-expanded');",
  'html body:not(.sidebar-pinned) #main-content {',
  '#view-history .history-stats-grid {',
  '#view-history .history-control-bar > .control-group-row:nth-of-type(2) > .tenmei-date { grid-column: 1 / -1; }',
  'const choicePointerMoveTolerance = 10;',
  "listbox.addEventListener('pointerdown', (event) => {",
  "listbox.addEventListener('pointermove', (event) => {",
  'const movedDistance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);',
  'if (movedDistance <= choicePointerMoveTolerance) return;',
  "listbox.addEventListener('pointerup', (event) => {",
  'if (!pending || pending.moved) return;',
  "listbox.addEventListener('pointercancel', (event) => {",
  'if (performance.now() < state.ignoreClickUntil) {',
  'suppressSyntheticTapUntil = performance.now() + 700;',
  "document.addEventListener('click', (event) => {",
  'event.stopImmediatePropagation();',
  '.dark .tenmei-choice__popover,',
  '@media (prefers-reduced-motion: reduce) {',
].forEach((text) => requireText(text, `カスタム選択欄・日付選択のUIまたはアクセシビリティ契約が不足しています: ${text}`));

const choicePointerDownHandler = html.match(/listbox\.addEventListener\('pointerdown', \(event\) => \{[\s\S]*?\n\s*}\);/);
assert(choicePointerDownHandler, '選択欄のpointerdown処理を抽出できません。');
assert.equal(choicePointerDownHandler[0].includes('selectChoice'), false, 'pointerdown時に選択を確定しており、スクロール操作が誤選択になります。');

assert.equal(html.includes('<select'), false, 'OS標準のselect要素が残っています。');
assert.equal(html.includes("document.querySelectorAll('[data-control-kind=\"choice\"]').forEach(buildChoice)"), false, '全選択欄の一括初期化が残っています。');
assert.equal(html.includes("document.querySelectorAll('[data-control-kind=\"date\"]').forEach(buildDate)"), false, '全日付選択の一括初期化が残っています。');
assert.equal(html.includes('event.stopImmediatePropagation();'), false, 'document全体のclick抑止が残っています。');
requireText('roots.filter(isVisible).forEach(buildRoot);', '表示中コントロールの初期構築が失われています。');
requireText('idle(() => roots.forEach(buildRoot), { timeout: 1200 });', '未表示コントロールの遅延構築が失われています。');
requireText("if (activeRoot && !activeRoot.contains(event.target)) closeActive(false);", '選択欄の外側タップで閉じる共通処理がありません。');
requireText("if (event.key === 'Escape' && activeRoot) closeActive(true);", 'Escapeキー処理がありません。');
assert.equal(/<input[^>]+type=["']date["']/gi.test(html), false, 'OS標準の日付入力が残っています。');
requireCount(/data-control-kind="choice"/g, 3, 'カスタム選択欄が3件保持されていません。');
requireCount(/data-control-kind="date"/g, 2, 'カスタム日付選択が2件保持されていません。');

console.log('参拝の記録・フッター・ページネーション・カスタム選択欄の回帰テストに合格しました。');
console.log(JSON.stringify({
  statsVer4Structure: true,
  footerVer4Structure: true,
  articlePaginationAccessible: true,
  customChoiceAndDateUiPreserved: true,
  historyPopoverStackingPreserved: true,
  historyUpdatedDateCorrected: true,
  mobileHistoryLayoutPreserved: true,
  choiceTapThroughGuardPreserved: true,
  choiceScrollGestureGuardPreserved: true,
  lightDarkResponsiveRulesPresent: true,
  darkHeroMetaUnboxed: true,
}, null, 2));
