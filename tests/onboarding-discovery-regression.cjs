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
  'ホームの「今日の道しるべ」から開けます。',
  '今すぐ設定を開く',
  'おみくじを引いた後、結果の下に「おみくじの次に、もうひとつ」が表示されます。',
  '結果を残す・相談する',
  '記録を長く残したい方は参拝証も選べますが、',
  '登録は必須ではありません。ほかの機能も気軽に試せます。',
  '神籤草子',
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
  'おみくじの次に、もうひとつ',
  'どれも会員登録なしで試せます。',
  "trackFeatureDiscovery('settings','result_next_actions')",
  "trackFeatureDiscovery('zodiac','result_next_actions')",
  "trackFeatureDiscovery('prefecture','result_next_actions')",
  "trackFeatureDiscovery('omamori','result_next_actions')",
  "trackFeatureDiscovery('column','result_next_actions')",
]) {
  assert.ok(resultSection.includes(expected), `結果画面の次の行動導線がありません: ${expected}`);
}
assert.ok(resultSection.indexOf('result-v4-action-group--discover') < resultSection.indexOf('id="result-ai-consult"'), '機能発見カードは結果画面の上部に配置してください。');
assert.ok(!resultSection.includes('aria-label="使い方 guide tracking>'), '機能発見カードのアクセシビリティラベルが壊れています。');
assert.ok(html.includes('UI刷新: 2026年8月17日'), 'おみくじの轍の古い日付が更新日と誤認されないようUI刷新日として表示してください。');
assert.ok(!html.includes('更新: 2026年8月17日'), '古い更新日表記が残っています。');

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


const homeStart = html.indexOf('<section id="view-home"');
const homeEnd = html.indexOf('<section id="view-omikuji-mindset"', homeStart);
const homeSection = homeStart >= 0 && homeEnd > homeStart ? html.slice(homeStart, homeEnd) : '';
assert.ok(homeSection, 'ホーム画面が見つかりません。');
assert.equal((homeSection.match(/class="home-v4-shortcut home-v4-shortcut--/g) || []).length, 6, 'ホームの機能ショートカットは6件必要です。');
assert.ok(homeSection.indexOf('id="home-shortcuts-title"') < homeSection.indexOf('class="home-v4-counter-grid"'), '機能ショートカットはホームヒーロー直後に配置してください。');
assert.ok(html.includes("'feature_discovery_click'"), '機能発見イベントが許可リストにありません。');

console.log('オンボーディング・機能発見・同意制御付き計測の回帰テストに合格しました。');
