'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function getPaginatedData(type, sourceData)');
const end = html.indexOf('// 4. ページネーション計算', start);
assert(start >= 0 && end > start, '記事一覧の共通日付・並び替え処理を取得できません。');
const sortLogic = html.slice(start, end);

assert(sortLogic.includes('rawDate.match(/^(\\d{4})\\s*[./-]'), '年月日を数値として解析する処理がありません。');
assert(sortLogic.includes('const compareDate = (a, b, direction) =>'), '日付不明の記事を安定して扱う比較処理がありません。');
assert(sortLogic.includes('if (aDate === null) return 1;') && sortLogic.includes('if (bDate === null) return -1;'),
  '日付不明の記事を一覧の末尾へ送る処理がありません。');
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

const helperStart = sortLogic.indexOf('const dateValue = item => {');
const helperEnd = sortLogic.indexOf('\n        };', helperStart) + '\n        };'.length;
assert(helperStart >= 0 && helperEnd > helperStart, '実際の日付正規化関数をテスト用に抽出できません。');
const declaration = sortLogic.slice(helperStart, helperEnd);
const dateValue = vm.runInNewContext('(' + declaration.slice('const dateValue = '.length, -1) + ')');

const samples = [
  { id: 1, date: '2026/10/02', time: '12:00' },
  { id: 2, date: '2026/10/23', time: '21:25' },
  { id: 3, date: '2026/2/22', time: '09:00' },
  { id: 4, date: '2026/2/9', time: '08:00' },
  { id: 5, date: '2026/10/23', time: '08:00' },
  { id: 6, date: '', time: '00:00' }
];
assert.equal(dateValue(samples[2]) < dateValue(samples[0]), true, '1桁月の日付が10月より後ろに誤配置されています。');
const compare = (a, b, direction) => {
  const aDate = dateValue(a), bDate = dateValue(b);
  if (aDate === null && bDate === null) return (Number(a.id) || 0) - (Number(b.id) || 0);
  if (aDate === null) return 1;
  if (bDate === null) return -1;
  return direction * (aDate - bDate) || direction * ((Number(a.id) || 0) - (Number(b.id) || 0));
};
const newest = [...samples].sort((a, b) => compare(a, b, -1));
const oldest = [...samples].sort((a, b) => compare(a, b, 1));
assert.deepEqual(newest.map(item => item.id), [2, 5, 1, 3, 4, 6], '新しい順が正しくありません。');
assert.deepEqual(oldest.map(item => item.id), [4, 3, 1, 5, 2, 6], '古い順が正しくありません。');
assert.equal(dateValue({date:'2026/02/30'}), null, '存在しない日付を有効な日付として扱っています。');

const controlStyles = html.slice(html.indexOf('<style id="tenmei-custom-control-unification-fix">'));
assert(controlStyles.includes('#main-content .tenmei-choice__trigger'), '記事一覧の個別CSSに負けない共通選択欄スタイルがありません。');
assert(controlStyles.includes('#main-content .tenmei-choice__value'), '選択中の文字スタイルが共通化されていません。');
assert(controlStyles.includes('#main-content .news-bulletin-filter-control > span:first-child') &&
  controlStyles.includes('#main-content .column-library-filter-control > span:first-child'),
  '社務所だより・神籤草子のラベル文字スタイルが統一されていません。');

console.log('社務所だより・神籤草子の日付ソート／カスタム選択欄の回帰テストに合格しました。');
console.log(JSON.stringify({ normalizedCalendarSorting: true, oneDigitMonthAndDayCovered: true, invalidAndMissingDatesHandled: true, bothArchivesCovered: true, customSelectTypographyUnified: true }, null, 2));
