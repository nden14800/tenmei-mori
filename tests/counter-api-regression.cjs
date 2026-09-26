const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'workers', 'tenmei-mori-backend.js'), 'utf8');

assert.strictEqual((html.match(/async function startLiveCounter\(\)/g) || []).length, 1, 'カウンター更新関数が重複しています。');
assert(html.includes('const COUNTER_REFRESH_INTERVAL_MS = 60 * 1000;'), 'カウンター更新間隔の定数がありません。');
assert(html.includes('setInterval(fetchCount, COUNTER_REFRESH_INTERVAL_MS);'), 'カウンターが定数の更新間隔で再取得されていません。');
assert.strictEqual((html.match(/<div class="home-v4-counter-meta"><span><i class="bi bi-circle-fill" aria-hidden="true"><\/i>更新間隔：60秒<\/span>/g) || []).length, 2, '2つのカウンターに60秒の更新間隔が明記されていません。');
assert.strictEqual((html.match(/最終更新：<span class="counter-update-time">/g) || []).length, 2, 'カウンターの最終更新時刻表示が不足しています。');

assert(html.includes('href="https://api.whatistoday.cyou/index.cgi/"'), '今日は何の日APIの公式リファレンスURLではありません。');
assert(html.includes('powered by whatistodayAPI'), '提供元の正式なpowered by表記ではありません。');

assert(worker.includes('UPDATE counter SET count = count + 1 WHERE id = 1'), 'おみくじ発行時の累計発行数更新処理がありません。');
assert(worker.includes('UPDATE counter SET user_count = user_count + 1 WHERE id = 1'), '新規登録時の累計参拝者数更新処理がありません。');
assert.strictEqual((worker.match(/UPDATE counter SET user_count = user_count \+ 1 WHERE id = 1/g) || []).length, 2, '会員登録経路ごとの参拝者数更新処理を確認できません。');

console.log('Phase 4 counter/API regression: OK');
