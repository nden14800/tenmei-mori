const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const newsSection = html.match(
  /<section id="view-news"[\s\S]*?<section id="view-column"/
)?.[0] || '';
const detailSection = html.match(
  /<section id="view-article-detail"[\s\S]*?<section id="view-about"/
)?.[0] || '';

assert(newsSection, '社務所だより一覧画面のセクションを抽出できません。');
assert(detailSection, '社務所だより記事詳細画面のセクションを抽出できません。');

function requireText(text, message) {
  assert(html.includes(text), message);
}

requireText('【機能改善・安定化】Ver.4.3「AI案内の起動安定化」— クッキー設定と回答表示を整えました', 'Ver.4.3の記事タイトルが既存の社務所だよりの表記形式に統一されていません。');
requireText('tag: "新機能・改善"', 'Ver.4.3の記事カテゴリが既存カテゴリを再利用していません。');
requireText('tagColor: "text-blue-600"', 'Ver.4.3の記事カテゴリ色が既存の配色規則に従っていません。');
requireText('GPT-6 Luna', 'Ver.5.0延期の説明に今回使用したモデルが記載されていません。');
requireText('Claude Haiku 5.5', 'Ver.5.0延期の説明に次回候補モデルが記載されていません。');
requireText('Claude Sonnet 5.5', 'Ver.5.0延期の説明に次回候補モデルが記載されていません。');

function requireNewsSectionText(text, message) {
  assert(newsSection.includes(text), message);
}

function requireDetailSectionText(text, message) {
  assert(detailSection.includes(text), message);
}

requireText(
  '<section id="view-news" class="view-section news-bulletin-layout" aria-labelledby="news-page-title">',
  '社務所だより一覧画面がnews-bulletin-layoutテンプレートとして定義されていません。'
);
requireNewsSectionText('class="news-bulletin-hero"', '社務所だより一覧に掲示録ヒーローがありません。');
requireNewsSectionText('id="news-page-title">社務所だより</h1>', '社務所だより一覧のページ見出しがありません。');
requireNewsSectionText('id="news-results-summary"', '社務所だより一覧の結果要約領域がありません。');
requireNewsSectionText('<search class="news-bulletin-search" aria-labelledby="news-search-heading">', '社務所だより一覧の検索ランドマークがありません。');
requireNewsSectionText('id="news-search-input"', '社務所だより一覧の検索入力IDが失われています。');
requireNewsSectionText("oninput=\"handleSearch('news', this.value)\"", '社務所だより一覧の検索接続が失われています。');
requireNewsSectionText('id="view-news-list" class="news-bulletin-list"', '社務所だより一覧の動的リストIDが失われています。');
requireNewsSectionText('id="news-pagination" class="news-bulletin-pagination"', '社務所だより一覧のページングIDが失われています。');

requireText(
  '<section id="view-article-detail" class="view-section news-chronicle-layout" aria-label="社務所だより記事詳細">',
  '記事詳細画面がnews-chronicle-layoutテンプレートとして定義されていません。'
);
requireDetailSectionText('news-chronicle-backbar', '記事詳細に一覧へ戻る案内バーがありません。');
requireDetailSectionText('id="article-detail-content"', '記事詳細の動的コンテンツIDが失われています。');

[
  'window.renderFullNewsView = function() {',
  "getPaginatedData('news', newsData)",
  "getArticleReadingMeta(item.content)",
  "openArticle('news', ${item.id})",
  'class="news-bulletin-card-surface"',
  'aria-label="${item.title}を読む"',
  "createPaginationHTML('news', currentPage, totalPages, \"changePage('news', {P})\")",
  "if (type === 'news') {",
  'class="news-chronicle-document"',
  'id="summary-section"',
  'id="summarize-btn"',
  "requestArticleSummary('news', ${item.id})",
  'id="summary-result"',
  'class="article-content prose dark:prose-invert max-w-none leading-loose text-justify"',
  'buildArticleTOC();',
  'startReadingProgress();',
].forEach((text) => {
  requireText(text, `社務所だよりの既存機能接続が失われています: ${text}`);
});

assert.equal(
  html.includes('class="news-bulletin-card-open" onclick="openArticle(\'news\','),
  false,
  '社務所だよりカード内に見出しだけを操作面とする旧ボタンが残っています。'
);
assert.equal(
  newsSection.includes('news-hero-card'),
  false,
  '社務所だより一覧に置換前のnews-hero-card構造が残っています。'
);
assert.equal(
  newsSection.includes('class="bento-card"'),
  false,
  '社務所だより一覧に置換前のBentoカード構造が残っています。'
);
assert.equal(
  detailSection.includes('class="bento-card"'),
  false,
  '記事詳細に置換前のBentoカード構造が残っています。'
);

[
  '.news-bulletin-layout,',
  '.news-chronicle-layout {',
  '.news-bulletin-list {',
  '.news-bulletin-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: auto; align-items: stretch;',
  '.news-bulletin-card {',
  'display: flex;',
  'flex-direction: column;',
  'min-height: 0;',
  '.news-bulletin-card-title { display: -webkit-box;',
  '-webkit-line-clamp: 2;',
  '.news-bulletin-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; margin-top: auto;',
  '.news-bulletin-card-surface:focus-visible {',
  '.news-chronicle-document {',
  '.news-chronicle-summary {',
  '.news-chronicle-body .article-content .article-toc-unified {',
  '.news-bulletin-search-field > .sr-only {',
  'clip-path: inset(50%);',
  '.news-bulletin-search-field > i { flex: 0 0 auto; }',
  '.news-bulletin-search-field input { width: 100%; min-width: 0; flex: 1 1 auto;',
  '.news-bulletin-search-field input:focus-visible { outline: 0; outline-offset: 0; }',
  '.dark .news-bulletin-layout,',
  '@media (prefers-color-scheme: dark) {',
  '.news-bulletin-layout a:focus-visible,',
  '@media (min-width: 761px) and (max-width: 1366px) {',
  'body.sidebar-collapsed #main-content #view-news.news-bulletin-layout,',
  '@media (prefers-reduced-motion: reduce) {',
].forEach((text) => {
  requireText(text, `社務所だよりのテーマ・フォーカス・レスポンシブ契約が失われています: ${text}`);
});

console.log('社務所だより一覧・記事詳細の回帰テストに合格しました。');
console.log(JSON.stringify({
  bulletinTemplate: true,
  chronicleTemplate: true,
  searchContractPreserved: true,
  paginationContractPreserved: true,
  articleTransitionContractPreserved: true,
  fullCardArticleTransitionPresent: true,
  summaryContractPreserved: true,
  tocAndReadingContractPreserved: true,
  themeRulesPresent: true,
  visibleFocusPresent: true,
  searchLabelVisuallyHidden: true,
  searchFocusSingleIndicator: true,
  responsiveLayoutPresent: true,
}, null, 2));
