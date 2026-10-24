'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');

const start = html.indexOf('function createPaginationHTML(');
const end = html.indexOf('function createSimplePaginationHTML(', start);
assert(start >= 0 && end > start, '共通ページネーション関数が見つかりません。');
const pagination = html.slice(start, end);
assert(pagination.includes('modern-pagination-page'), 'ページ番号ボタンがありません。');
assert(pagination.includes('modern-pagination-ellipsis'), '省略記号によるページ番号整理がありません。');
assert(pagination.includes('new Set([1, total])'), '先頭・末尾ページが常に表示されません。');
assert(pagination.includes('current - 1') && pagination.includes('current + 1'), '現在ページの前後が表示されません。');
assert(pagination.includes('aria-current="page"'), '現在ページのアクセシブルな状態がありません。');
assert(pagination.includes('modern-pagination-prev') && pagination.includes('modern-pagination-next'), '前へ・次への操作がありません。');
assert(pagination.includes('pagination-page-input'), 'ページ指定入力欄が共通クラスを利用していません。');
assert(pagination.includes('inputmode="numeric"') && pagination.includes('min="1"') && pagination.includes('max="'), 'ページ番号入力の制約がありません。');
assert(pagination.includes('jumpToPaginationPage'), 'ページ指定の確定処理がありません。');
assert(!pagination.includes('Function('), '動的コード実行がページ指定処理に残っています。');
assert(pagination.includes("if (total <= 1) return ''"), '1ページのみの場合に操作UIを隠しません。');

for (const call of ["createPaginationHTML('news'", "createPaginationHTML('column'", "createPaginationHTML('dream-history'", "createPaginationHTML('history'"]) {
  assert(html.includes(call), call + ' の呼び出しがありません。');
}
const cssStart = html.indexOf('<style id="tenmei-pagination-unified-refresh">');
const cssEnd = html.indexOf('</style>', cssStart);
assert(cssStart >= 0 && cssEnd > cssStart, '共通ページネーションCSSがありません。');
const css = html.slice(cssStart, cssEnd);
assert(css.includes('.pagination-page-input') && css.includes('var(--input-bg)') && css.includes('var(--card-border)'), 'ページ指定入力欄が共通フォームの配色・境界線トークンを利用していません。');
assert(css.includes('@media(max-width:430px)'), 'スマートフォン向けのコンパクト表示がありません。');
assert(css.includes('prefers-reduced-motion'), '動きを抑える設定への配慮がありません。');

console.log('共通ページネーションの回帰テストに合格しました。');
