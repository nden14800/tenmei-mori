#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const tutorial = html.match(/<!-- ── チュートリアル ウォークスルー[\s\S]*?<\/div>\n\n<!-- ── 隠しコマンド演出用オーバーレイ/)?.[0] || '';
assert.ok(tutorial, 'ウォークスルー領域が見つかりません。');

for (const expected of [
  '会員登録をしなくても、すぐに利用できます。',
  '設定を変えるための会員登録も不要です。',
  '結果を残す・相談する',
  '記録を長く残したい方は参拝証も選べますが、',
  'ステップ3: 環境・表示設定',
  'ステップ4: 結果を残す・相談する',
  'ステップ5: 気になる機能を試す',
]) {
  assert.ok(tutorial.includes(expected), `ウォークスルーに必要な案内がありません: ${expected}`);
}
assert.equal((tutorial.match(/class="tutorial-slide(?: active)?"/g) || []).length, 5, 'ウォークスルーは5ステップを維持してください。');

const resultSection = html.match(/<section id="view-result"[\s\S]*?<\/section>\s*<!-- ビュー: 12星座×血液型占い/)?.[0] || '';
assert.ok(resultSection, 'おみくじ結果画面が見つかりません。');
for (const expected of [
  'id="result-v4-discover-title"',
  '次は、気になるところをひとつだけ',
  '会員登録をしなくても楽しめます。',
  'onclick="showView(\'settings\')"',
  'onclick="showView(\'zodiac\')"',
  'onclick="showView(\'howto\')"',
]) {
  assert.ok(resultSection.includes(expected), `結果画面の次の行動導線がありません: ${expected}`);
}

for (const expected of [
  'window.tenmeiTrackUXEvent = function (eventName, parameters)',
  "preferences.analytics !== true || !UX_EVENT_ALLOWLIST.has(eventName)",
  "'tutorial_begin', 'tutorial_complete', 'tutorial_skip', 'tutorial_dismiss'",
  "window.tenmeiTrackUXEvent('omikuji_result_view'",
  "account_state: currentState.user ? 'signed_in' : 'guest'",
  "window.tenmeiTrackUXEvent('settings_open'",
]) {
  assert.ok(html.includes(expected), `同意制御付きの利用状況計測が不足しています: ${expected}`);
}
for (const prohibited of ['worry-input', 'currentState.user.email', 'currentState.user.username']) {
  assert.ok(!html.includes(`window.tenmeiTrackUXEvent('${prohibited}'`), `UX計測に個人情報や相談本文を含めてはいけません: ${prohibited}`);
}

console.log('オンボーディング・機能発見・同意制御付き計測の回帰テストに合格しました。');
