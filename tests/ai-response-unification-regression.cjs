const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'workers', 'tenmei-mori-backend.js'), 'utf8');

function requireText(source, text, message) {
  assert(source.includes(text), message);
}

const unifiedStart = html.indexOf('function setupUnifiedAiResponseControls(responseArea, options = {})');
const unifiedEnd = html.indexOf('function showUnifiedAiLoading', unifiedStart);
assert(unifiedStart >= 0 && unifiedEnd > unifiedStart, 'AI共通レスポンス制御の範囲を取得できません。');
const unified = html.slice(unifiedStart, unifiedEnd);

assert(!unified.includes('data-ai-rate'), '要約以外のAI共通レスポンスに評価ボタンが残っています。');
assert(!unified.includes('summary-vote'), '要約以外のAI共通レスポンスに要約専用フィードバックUIが混入しています。');
requireText(unified, 'data-ai-info-toggle', 'AI共通レスポンスの情報ボタンがありません。');
requireText(unified, 'data-ai-info-panel', 'AI共通レスポンスの情報パネルがありません。');

requireText(html, 'consumeUnifiedAiStream(res, responseArea)', '悩み相談・夢占いが共通ストリーミング処理を利用していません。');
requireText(html, "infoTitle: 'AI悩み相談について'", 'AI悩み相談の詳細情報がありません。');
requireText(html, "infoTitle: 'AI夢占いについて'", 'AI夢占いの詳細情報がありません。');
requireText(html, '相談内容・AI回答はデータベースに保存されません。', 'AI悩み相談の保存仕様が情報パネルにありません。');
requireText(html, '夢の本文・AIによる解釈・生成日時は会員向けの夢の記録として保存されます。', 'AI夢占いの保存仕様が情報パネルにありません。');

const worryStart = worker.indexOf('if (url.pathname === "/api/worry-consult" && method === "POST")');
const dreamStart = worker.indexOf('if (url.pathname === "/api/dream-fortune" && method === "POST")');
assert(worryStart >= 0 && dreamStart > worryStart, 'AI相談系Workers APIの位置を確認できません。');
const worryBlock = worker.slice(worryStart, dreamStart);
const dreamEnd = worker.indexOf('// ② 過去の夢の履歴取得', dreamStart);
assert(dreamEnd > dreamStart, 'AI夢占いAPIの終端を確認できません。');
const dreamBlock = worker.slice(dreamStart, dreamEnd);

requireText(worryBlock, 'streamUnifiedAIResponse(', 'AI悩み相談がストリーミングAPIを利用していません。');
requireText(dreamBlock, 'streamUnifiedAIResponse(', 'AI夢占いがストリーミングAPIを利用していません。');
requireText(worryBlock, 'text/event-stream', 'AI悩み相談のSSE応答がありません。');
requireText(dreamBlock, 'text/event-stream', 'AI夢占いのSSE応答がありません。');
requireText(dreamBlock, 'INSERT INTO dream_history', 'AI夢占いの履歴保存が失われています。');

requireText(worker, 'if (url.pathname === "/api/summary-feedback" && method === "POST")', 'AI要約のフィードバック保存APIまで削除されていません。');

console.log('AI回答UI統一・非要約フィードバック廃止・ストリーミング回帰テストに合格しました。');
