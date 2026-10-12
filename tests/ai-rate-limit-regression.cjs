const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'workers', 'tenmei-mori-backend.js'), 'utf8');

function has(text, message) {
  assert.ok(worker.includes(text), message);
}

has('async function readBoundedJson(request, maxBytes)', 'AI APIの本文サイズを実測するJSONパーサーがありません。');
has('totalBytes > maxBytes', 'Content-Lengthを偽装・省略したリクエストのサイズ検証がありません。');
has('async function checkRateLimit(ip, type, limit, windowSeconds, failClosed = false)', '既存APIへの影響を限定したフェイルクローズ制御がありません。');
has('return { allowed: !failClosed, unavailable: failClosed, resetTime: newExpire };', 'AIレート制限DB障害時に利用制限を迂回しない実装がありません。');

for (const [route, marker] of [
  ['/api/ai-guide', 'readBoundedJson(request, 36000)'],
  ['/api/worry-consult', 'readBoundedJson(request, 8192)'],
  ['/api/dream-fortune', 'readBoundedJson(request, 8192)'],
  ['/api/summarize', 'readBoundedJson(request, 32768)']
]) {
  const start = worker.indexOf(`if (url.pathname === "${route}"`);
  assert.ok(start >= 0, `${route} が見つかりません。`);
  const end = worker.indexOf('\n        }', start);
  const block = worker.slice(start, end > start ? end : start + 12000);
  assert.ok(block.includes(marker), `${route} にサーバー側の本文サイズ制限がありません。`);
  assert.ok(block.includes('checkRateLimit(') && block.includes('true)'), `${route} のレート制限がDB障害時にフェイルクローズしません。`);
}

has('worry.length > 300', '悩み相談の300文字制限がありません。');
has('dream.length > 400', '夢占いの400文字制限がありません。');
has('articleText.length > 6000', '記事要約の6000文字サーバー側制限がありません。');
has('delta.slice(0, Math.max(0, 150 - fullText.length))', '記事要約の出力文字数上限がありません。');
has('async function streamUnifiedAIResponse(prompt, systemPrompt, maxCompletionTokens, onComplete, conversationHistory = [], maxOutputChars = 0)', '共通AIストリームの出力上限がありません。');
const sharedAiStart = worker.indexOf('async function runNonStreamingAI(messages, maxCompletionTokens)');
assert.ok(sharedAiStart >= 0, '共通AI生成ヘルパーが見つかりません。');
assert.ok(!worker.slice(sharedAiStart).includes('max_completion_tokens: Math.max(512, maxCompletionTokens)'), '共通AI生成ヘルパーの指定トークン上限が512へ強制的に引き上げられています。');
has('INSERT INTO dream_history', '夢占い履歴の保存処理が失われています。');
has('FROM article_summaries WHERE article_type = ? AND article_id = ? LIMIT 1', '記事要約キャッシュが失われています。');

console.log('AI入力サイズ・レート制限・出力上限の回帰テストに合格しました。');
