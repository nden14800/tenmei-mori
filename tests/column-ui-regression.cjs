const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const columnSection = html.match(
  /<section id="view-column"[\s\S]*?<section id="view-article-detail"/
)?.[0] || '';
const detailSection = html.match(
  /<section id="view-article-detail"[\s\S]*?<section id="view-howto"/
)?.[0] || '';
const columnRendererStart = html.indexOf('window.renderFullColumnView = function() {');
const columnRendererEnd = html.indexOf('// 4. 記事詳細表示', columnRendererStart);
const columnRenderer = columnRendererStart >= 0 && columnRendererEnd >= 0
  ? html.slice(columnRendererStart, columnRendererEnd)
  : '';
const columnDataStart = html.indexOf('const columnData = [');
const columnDataEnd = html.indexOf('\n    ];', columnDataStart);
const columnDataSource = columnDataStart >= 0 && columnDataEnd > columnDataStart
  ? html.slice(columnDataStart, columnDataEnd)
  : '';

assert(columnSection, '神籤草子一覧画面のセクションを抽出できません。');
assert(detailSection, '共用記事詳細画面のセクションを抽出できません。');
assert(columnRenderer, '神籤草子一覧の描画関数を抽出できません。');
assert(columnDataSource, '神籤草子の記事データを抽出できません。');

function requireText(text, message) {
  assert(html.includes(text), message);
}

function requireColumnSectionText(text, message) {
  assert(columnSection.includes(text), message);
}

function requireDetailSectionText(text, message) {
  assert(detailSection.includes(text), message);
}

requireText(
  '<section id="view-column" class="view-section column-library-layout" aria-labelledby="column-page-title">',
  '神籤草子一覧がcolumn-library-layoutテンプレートとして定義されていません。'
);
requireColumnSectionText('class="column-library-hero"', '神籤草子一覧に神籤書架ヒーローがありません。');
requireColumnSectionText('id="column-page-title">神籤草子</h1>', '神籤草子一覧のページ見出しがありません。');
requireColumnSectionText('id="column-library-count"', '神籤草子一覧の件数表示領域がありません。');
requireColumnSectionText('<search class="column-library-search" aria-labelledby="column-search-heading">', '神籤草子一覧の検索ランドマークがありません。');
requireColumnSectionText('id="column-search-input"', '神籤草子一覧の検索入力IDが失われています。');
requireColumnSectionText("oninput=\"handleSearch('column', this.value)\"", '神籤草子一覧の検索接続が失われています。');
requireColumnSectionText('id="view-column-list" class="column-library-list"', '神籤草子一覧の動的リストIDが失われています。');
requireColumnSectionText('id="column-pagination" class="column-library-pagination"', '神籤草子一覧のページングIDが失われています。');

const columnEntries = [...columnDataSource.matchAll(/\n\s*\{\s*\n\s*id:\s*(\d+),[\s\S]*?\n\s*desc:\s*"([^"]+)",/g)];
assert.equal(columnEntries.length, 65, '神籤草子の全65記事に一覧専用説明が設定されていません。');
const columnDescriptionLengths = [];
for (const [, id, description] of columnEntries) {
  columnDescriptionLengths.push(description.length);
  assert(description.length >= 70, `神籤草子記事ID ${id} の一覧専用説明が必要な文字量を満たしていません。`);
  assert(description.length <= 105, `神籤草子記事ID ${id} の一覧専用説明が一覧カード向けの上限を超えています。`);
  assert(!/[<>\r\n]/.test(description), `神籤草子記事ID ${id} の一覧専用説明に本文HTMLまたは改行が混入しています。`);
}
assert(
  columnDescriptionLengths.reduce((total, length) => total + length, 0) / columnDescriptionLengths.length >= 75,
  '神籤草子一覧の説明全体が十分な情報量を保っていません。'
);

[
  'window.renderFullColumnView = function() {',
  "getPaginatedData('column', columnData)",
  "getArticleReadingMeta(item.content)",
  "openArticle('column', ${item.id})",
  "createPaginationHTML('column', currentPage, totalPages, \"changePage('column', {P})\")",
  'class="column-library-card"',
  'class="column-library-card-surface"',
  'class="column-library-card-open"',
  "const listDescription = String(item.desc || '').trim();",
  "const excerpt = listDescription || '本文を開いて、杜の読み物をお楽しみください。';",
  'aria-labelledby="${articleTitleId}"',
  'aria-label="${item.title}を読む"',
  'container.setAttribute(\'aria-busy\', \'true\')',
  'container.setAttribute(\'aria-busy\', \'false\')',
].forEach((text) => {
  assert(columnRenderer.includes(text), `神籤草子一覧の既存機能接続が失われています: ${text}`);
});

[
  "detailView.classList.toggle('column-reader-layout', isColumn)",
  "detailView.setAttribute('aria-label', isColumn ? '神籤草子記事詳細' : '社務所だより記事詳細')",
  "backNote.textContent = isColumn ? 'SACRED READING' : 'OFFICIAL RECORD'",
  'class="column-reader-document"',
  'class="column-reader-header"',
  'class="column-reader-title"',
  'id="summary-section"',
  'id="summarize-btn"',
  "requestArticleSummary('column', ${item.id})",
  'id="summary-result"',
  'class="column-reader-body"',
  'class="article-content prose dark:prose-invert max-w-none leading-loose text-justify"',
  'buildArticleTOC();',
  'startReadingProgress(readingMeta);',
].forEach((text) => {
  requireText(text, `神籤草子記事詳細の既存機能接続が失われています: ${text}`);
});

requireDetailSectionText('id="article-detail-content"', '共用記事詳細の動的コンテンツIDが失われています。');
requireDetailSectionText('article-reader-back', '神籤草子用に切り替える共用戻る導線がありません。');
assert.equal(
  columnSection.includes('column-hero-card'),
  false,
  '神籤草子一覧に置換前のcolumn-hero-card構造が残っています。'
);
assert.equal(
  columnSection.includes('class="bento-card"'),
  false,
  '神籤草子一覧に置換前のBentoカード構造が残っています。'
);
assert.equal(
  columnRenderer.includes('class="column-library-card-open" onclick="openArticle(\'column\','),
  false,
  '神籤草子カード内にフッターだけを操作面とする旧ボタンが残っています。'
);
assert.equal(
  columnRenderer.includes('item.content ||'),
  false,
  '神籤草子一覧の説明欄が本文contentへフォールバックしています。'
);
assert.equal(
  columnRenderer.includes('\\${'),
  false,
  '神籤草子描画関数に文字どおりの補間エスケープが残っています。'
);

[
  '.column-library-layout,',
  '.column-reader-layout {',
  '.column-library-list {',
  '.column-library-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: auto; align-items: stretch;',
  '.column-library-card {',
  'display: flex;',
  'flex-direction: column;',
  'min-height: 0;',
  '.column-library-card-title { display: -webkit-box;',
  '-webkit-line-clamp: 2;',
  '.column-library-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; margin-top: auto;',
  '.column-library-card-surface:focus-visible {',
  '.column-reader-document {',
  '.column-reader-summary {',
  '.column-reader-body .article-content .article-toc-unified {',
  '.column-library-search-field > .sr-only {',
  'clip-path: inset(50%);',
  '.column-library-search-field > i { flex: 0 0 auto; }',
  '.column-library-search-field input { width: 100%; min-width: 0; flex: 1 1 auto;',
  '.column-library-search-field input:focus-visible { outline: 0; outline-offset: 0; }',
  '.column-reader-body .article-visual--ai-generated img { aspect-ratio: 16 / 9; object-fit: cover; }',
  '.article-content .ai-image-disclosure {',
  '.article-content .ai-image-disclosure__mark {',
  '.dark .article-content .ai-image-disclosure {',
  'AIで制作したイメージ',
  '.dark .column-library-layout,',
  '@media (prefers-color-scheme: dark) {',
  '.column-library-layout a:focus-visible,',
  '@media (min-width: 761px) and (max-width: 1366px) {',
  'body.sidebar-collapsed #main-content #view-column.column-library-layout,',
  '@media (prefers-reduced-motion: reduce) {',
].forEach((text) => {
  requireText(text, `神籤草子のテーマ・画像・フォーカス・レスポンシブ契約が失われています: ${text}`);
});

console.log('神籤草子一覧・記事詳細の回帰テストに合格しました。');
console.log(JSON.stringify({
  libraryTemplate: true,
  readerTemplate: true,
  searchContractPreserved: true,
  paginationContractPreserved: true,
  articleTransitionContractPreserved: true,
  fullCardArticleTransitionPresent: true,
  summaryContractPreserved: true,
  tocAndReadingContractPreserved: true,
  imageContractPreserved: true,
  allArticleListDescriptionsPresent: true,
  listDescriptionLengthAndQualityPreserved: true,
  listDescriptionPreferredOverBodyExcerpt: true,
  themeRulesPresent: true,
  visibleFocusPresent: true,
  responsiveLayoutPresent: true,
}, null, 2));
