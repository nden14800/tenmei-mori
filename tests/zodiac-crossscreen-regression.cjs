const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function requireText(text, message) {
  assert(html.includes(text), message);
}

const zodiacSection = html.match(
  /<section id="view-zodiac"[\s\S]*?<\/section>\s*<\/div>\s*<\/div>\s*<!-- ビュー: TENMEI Labs -->/
)?.[0] || '';
assert(zodiacSection, '最強運勢ランキング画面のセクションを抽出できません。');

[
  '<section id="view-zodiac" class="view-section zodiac-oracle-layout" aria-labelledby="zodiac-page-title">',
  '<header class="zodiac-oracle-hero">',
  '<h1 id="zodiac-page-title" class="zodiac-oracle-title">最強運勢ランキング</h1>',
  'class="zodiac-oracle-mark" data-ver4-hero-emblem',
  '<span>FORTUNE</span>',
  'id="current-date-display"',
  'class="zodiac-ranking-panel" aria-labelledby="zodiac-check-title"',
  '<h2 id="zodiac-check-title">あなたの順位をチェック</h2>',
  'class="zodiac-input-field zodiac-input-grid__sign"',
  'class="zodiac-input-field zodiac-input-grid__blood"',
  '> 星座</span>',
  '> 血液型</span>',
  'data-control-kind="choice" data-control-id="user-sign"',
  'data-control-kind="choice" data-control-id="user-blood"',
  'data-value-display="label"',
  'id="user-sign-trigger" aria-haspopup="listbox"',
  'id="user-blood-trigger" aria-haspopup="listbox"',
  'id="user-sign-options" role="listbox"',
  'id="user-blood-options" role="listbox"',
  'onclick="findMyRank()" class="modern-search-btn zodiac-rank-submit"',
  'id="my-rank-result" class="hidden zodiac-rank-result"',
  '<section id="favorites-section" class="zodiac-ranking-panel zodiac-favorites-panel hidden"',
  'id="fav-status-badge" class="zodiac-favorite-status" aria-live="polite"',
  'id="favorites-list" class="zodiac-ranking-stack"',
  '<h2 id="zodiac-ranking-title">本日の順位</h2>',
  'id="ranking-list" class="zodiac-ranking-stack"',
  'onclick="showFullRanking()" class="zodiac-ranking-toggle" aria-controls="full-ranking-list" aria-expanded="false"',
  'id="show-ranking-icon" class="bi bi-chevron-down" aria-hidden="true"',
  'id="full-ranking-list" class="hidden zodiac-ranking-stack"',
].forEach((text) => requireText(text, `最強運勢ランキングのVer.4.0構造または既存機能IDが不足しています: ${text}`));


assert(!html.includes('#view-zodiac .tenmei-choice__trigger'), 'ランキング専用の選択欄トリガー上書きが残っています。');
assert(html.includes("state.root.dataset.valueDisplay === 'label'"), '共通選択欄の選択中表示にラベルのみの統一モードがありません。');
assert(html.includes('#main-content .tenmei-choice__trigger'), 'ランキングを含む全画面で使う共通トリガーのスタイルがありません。');
assert(html.includes('#main-content .tenmei-choice__option'), '候補一覧の共通スタイルがありません。');

assert.equal(zodiacSection.includes('max-w-5xl mx-auto'), false, '最強運勢ランキングに旧来の1125pxコンテナが残っています。');
assert.equal(zodiacSection.includes('class="bento-card mb-6'), false, '最強運勢ランキングに旧来のBentoヒーローまたはフォームカードが残っています。');
assert.equal(zodiacSection.includes('class="zodiac-oracle-title"><i'), false, '最強運勢ランキングのヒーロータイトル左にアイコンが残っています。');
assert.equal(zodiacSection.includes('id="zodiac-check-title"><i'), false, '最強運勢ランキングの通常カード見出し左にアイコンが残っています。');

[
  '<style id="zodiac-ver4-ui-style">',
  '#view-zodiac.zodiac-oracle-layout {',
  'width: min(100% - 32px, var(--ver4-content-width)) !important;',
  '.zodiac-oracle-hero {',
  'grid-template-columns: minmax(0, 1fr) auto;',
  'min-height: var(--ver4-hero-min-height);',
  'padding: var(--ver4-hero-padding);',
  'border-radius: var(--ver4-hero-radius);',
  '.zodiac-oracle-hero::before {',
  'inset: var(--ver4-hero-inner-inset);',
  'border-radius: var(--ver4-hero-inner-radius);',
  '.zodiac-oracle-mark[data-ver4-hero-emblem] {',
  'box-shadow: inset 0 0 0 7px',
  '.zodiac-ranking-panel {',
  '#view-zodiac .zodiac-ranking-panel.is-control-expanded {',
  'z-index: 160;',
  'overflow: visible;',
  '.zodiac-ranking-stack.hidden { display: none !important; }',
  'padding: var(--ver4-card-padding);',
  'border-radius: var(--ver4-card-radius);',
  '.zodiac-input-grid {',
  'grid-template-columns: repeat(2, minmax(0, 1fr)) minmax(132px, auto);',
  '.zodiac-input-field {',
  '.zodiac-input-field > span:first-child {',
  '.zodiac-input-select-wrap {',
  '.zodiac-input-select-wrap > .tenmei-choice { width: 100%; min-width: 0; }',
  '.zodiac-input-grid__action { display: flex; min-width: 0; align-self: end; }',
  'min-height: var(--ver4-control-height);',
  'border-radius: var(--ver4-control-radius)',
  '#view-zodiac .zodiac-card-box::before {',
  'border-left: 1px solid var(--card-border) !important;',
  'html.dark #view-zodiac.zodiac-oracle-layout {',
  '@media (max-width: 768px) {',
  '.zodiac-oracle-mark[data-ver4-hero-emblem] { width: 96px !important;',
  '@media (prefers-reduced-motion: reduce) {',
].forEach((text) => requireText(text, `最強運勢ランキングの共通意匠・テーマ・レスポンシブ規則が不足しています: ${text}`));

[
  ':root {',
  '--ver4-content-width: 960px;',
  '--ver4-hero-radius: 28px;',
  '--ver4-hero-inner-inset: 12px;',
  '--ver4-hero-min-height: 258px;',
  '--ver4-hero-padding: clamp(28px, 5vw, 48px);',
  '--ver4-card-radius: 24px;',
  '--ver4-card-padding: 24px;',
  '--ver4-control-height: 48px;',
  '--ver4-control-radius: 14px;',
  '#view-auth.auth-pilgrimage-view,',
  '#view-news.news-bulletin-layout,',
  '#view-column.column-library-layout,',
  '#view-prefecture.prefecture-observatory-layout,',
  '#view-history.history-ledger-layout,',
  '#view-lab.labs-observatory-layout,',
  '#view-dream.dream-oracle-layout,',
  '#view-omamori.omamori-sanctuary-layout,',
  '#view-stats.stats-record-layout {',
  '.auth-passport-hero,',
  '.news-bulletin-hero,',
  '.column-library-hero,',
  '.prefecture-observatory-hero,',
  '.history-ledger-hero,',
  '.labs-observatory-hero,',
  '.dream-oracle-hero,',
  '.omamori-sanctuary-hero,',
  '.stats-record-hero',
  '/* Ver.4.0: 横断整合 — ヒーロー英字ラベルを共通意匠へ統一 */',
  '#view-auth .auth-passport-kicker,',
  '#view-prefecture .prefecture-observatory-kicker,',
  '#view-zodiac .zodiac-oracle-kicker',
  "font-family: 'Zen Kaku Gothic New', sans-serif !important;",
  'font-size: 0.68rem !important;',
  'letter-spacing: 0.15em !important;',
].forEach((text) => requireText(text, `横断統一の共通トークンまたは対象セレクタが不足しています: ${text}`));

[
  'function findMyRank()',
  'function toggleFavorite(',
  'function showFullRanking()',
  "fullList.classList.toggle('hidden', !isCollapsed);",
  "button.setAttribute('aria-expanded', String(isCollapsed));",
  "icon.className = isCollapsed ? 'bi bi-chevron-up' : 'bi bi-chevron-down';",
  'function renderRanking()',
  'function createCardHTML(data)',
].forEach((text) => requireText(text, `最強運勢ランキングの既存操作ロジックが失われています: ${text}`));

console.log('最強運勢ランキングとVer.4.0横断統一の回帰テストに合格しました。');
console.log(JSON.stringify({
  zodiacVer4Hero: true,
  customChoiceSemanticsPreserved: true,
  rankingAndFavoritesFunctionsPreserved: true,
  zodiacControlPopoverStackingPreserved: true,
  collapsedRankingStatePreserved: true,
  crossScreenTokensPresent: true,
  heroEyebrowTypographyUnified: true,
  lightDarkMobileRulesPresent: true,
}, null, 2));
