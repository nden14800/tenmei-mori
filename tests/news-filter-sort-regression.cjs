const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const newsStart = html.indexOf('<section id="view-news"');
const newsEnd = html.indexOf('<section id="view-column"', newsStart);
const newsSection = newsStart >= 0 && newsEnd > newsStart ? html.slice(newsStart, newsEnd) : '';
const listLogic = html.slice(html.indexOf('const listState ='), html.indexOf('// 共通: ページネーションボタン'));
const renderLogic = html.slice(html.indexOf('window.renderFullNewsView = function()'), html.indexOf('// 3. 「神籤草子」描画関数'));

assert(newsSection.includes('id="news-category-filter"'), 'カテゴリ絞り込み欄がありません。');
assert(newsSection.includes('id="news-sort-order"'), '記事表示順の選択欄がありません。');
assert(newsSection.includes('changeNewsCategory(this.value)'), 'カテゴリ変更が描画処理につながっていません。');
assert(newsSection.includes('changeNewsSort(this.value)'), '表示順変更が描画処理につながっていません。');
assert(listLogic.includes("category: 'all', sort: 'newest'"), 'カテゴリ・表示順の状態がありません。');
assert(listLogic.includes("state.category !== 'all'"), 'カテゴリ絞り込みがありません。');
assert(listLogic.includes("state.sort === 'oldest'"), '古い順の並び替えがありません。');
assert(listLogic.includes("state.sort === 'title-asc'"), 'タイトル昇順がありません。');
assert(listLogic.includes("state.sort === 'title-desc'"), 'タイトル降順がありません。');
assert(renderLogic.includes('new Set(newsData.map(item => item.tag || \'未分類\'))'), '記事データからカテゴリ一覧を生成していません。');
assert(renderLogic.includes('categorySelect.value = listState.news.category'), '再描画後にカテゴリ選択を保持しません。');
assert(renderLogic.includes('sortSelect.value = listState.news.sort'), '再描画後に表示順を保持しません。');
assert(renderLogic.includes('getPaginatedData(\'news\', newsData)'), '既存のページネーション処理を利用していません。');
assert(html.includes('.news-bulletin-filter-row'), '絞り込み欄のスタイルがありません。');
assert(html.includes('@media (max-width: 560px) { .news-bulletin-filter-row'), 'スマートフォン向けの縦積みレイアウトがありません。');

console.log('社務所だよりのカテゴリ絞り込み・表示順回帰テストに合格しました。');
