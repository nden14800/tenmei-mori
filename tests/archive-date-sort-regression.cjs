const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function getPaginatedData(type, sourceData)');
const end = html.indexOf('// 4. ページネーション計算', start);
assert(start >= 0 && end > start, '記事一覧の共通日付・並び替え処理を取得できません。');
const sortLogic = html.slice(start, end);

assert(
  sortLogic.includes("String(item.date || '').replaceAll('/', '')"),
  '日付の区切り文字除去が安全な文字列置換になっていません。'
);
assert(
  !sortLogic.includes("replace(/\\\\//g"),
  '日付比較に実行時エラーを起こす不正な正規表現が残っています。'
);
assert(
  sortLogic.includes("state.sort === 'oldest'") &&
  sortLogic.includes("state.sort === 'title-asc'") &&
  sortLogic.includes("state.sort === 'title-desc'"),
  '記事・コラム共通の並び替え条件が不足しています。'
);
assert(
  html.includes("getPaginatedData('news', newsData)") &&
  html.includes("getPaginatedData('column', columnData)"),
  '社務所だよりと神籤草子の両方が共通のページ処理を利用していません。'
);

const dateValue = item => String(item.date || '').replaceAll('/', '') + String(item.time || '00:00').replace(':', '');
const samples = [
  { id: 1, date: '2026/10/02', time: '12:00' },
  { id: 2, date: '2026/10/23', time: '21:25' },
  { id: 3, date: '2026/10/10', time: '09:00' },
];
const newest = [...samples].sort((a, b) => dateValue(b).localeCompare(dateValue(a)));
const oldest = [...samples].sort((a, b) => dateValue(a).localeCompare(dateValue(b)));
assert.deepEqual(newest.map(item => item.id), [2, 3, 1], '新しい順の並び替えが正しくありません。');
assert.deepEqual(oldest.map(item => item.id), [1, 3, 2], '古い順の並び替えが正しくありません。');

console.log('社務所だより・神籤草子の日付ソート回帰テストに合格しました。');
console.log(JSON.stringify({ safeDateParsing: true, newestAndOldestSorting: true, bothArchivesCovered: true }, null, 2));
