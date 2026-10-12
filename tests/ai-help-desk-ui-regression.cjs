const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'workers', 'tenmei-mori-backend.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'css', 'tenmei-ai-agent.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets', 'js', 'tenmei-ai-agent.js'), 'utf8');
const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
for (const text of ['assets/css/tenmei-ai-agent.css',"const aiGuideState = { loaded: false, scriptRequested: false, generation: 0 }","script.src = '/assets/js/tenmei-ai-agent.js'","天命乃杜 AI案内","天命乃杜独自のAI案内（Cloudflare Workers AI）","会話履歴を保存しません"]) assert.ok(html.includes(text),'サイト統合が不足しています: '+text);
for (const text of ['tenmei-ai-launcher','tenmei-ai-panel','TENMEI GUIDE','個人情報・パスワード・認証コードなどは入力しないでください','/api/ai-guide','会話をリセット','siteSpinner','tenmei-ai-generating-label','aria-busy','input.maxLength=800','response.body.getReader()','details.hidden=!opening','tenmei-ai-info-list','GLM-4.7-Flash']) assert.ok(js.includes(text),'独自AI UIの要件が不足しています: '+text);
for (const text of [
  '【役割】',
  '【サイトの機能知識】',
  '【おみくじと保存】',
  '【アカウントと機能の利用条件】',
  '【設定と読みもの】',
  '【Cookieとプライバシー】',
  '【質問別の対応】',
  '【問題解決の流れ】',
  '【正確性と根拠】',
  '【最終チェック】',
  '【利用制限と入力エラー】',
  '【よくある質問の判断】',
  '【不具合の聞き取り】',
  '【情報の優先順位】',
  '1時間あたり15回まで',
  '入力が400文字以内か',
  '48通り',
  'AI案内の会話履歴はサイトのデータベース、アカウント、ブラウザー内ストレージへ保存しない設計',
  '最新情報を直接確認する機能は持っていない',
  'すでに試した手順を無意味に繰り返さない'
]) assert.ok(worker.includes(text),'独自AI案内の知識・回答方針が不足しています: '+text);
for (const text of ['if (url.pathname === "/api/ai-guide" && method === "POST")','const systemPrompt = [','@cf/zai-org/glm-4.7-flash','streamUnifiedAIResponse(question, systemPrompt, 640, async () => ({}), history)','const rawQuestion = typeof body?.question === "string" ? body.question : "";','checkRateLimit(ip, "ai_guide", 15, 3600)','sensitivePattern','Cache-Control']) assert.ok(worker.includes(text),'バックエンドの安全策または指示文が不足しています: '+text);
for (const text of ['var(--card-border)','var(--accent-red)','transition:all .2s!important','.tenmei-ai-composer__input:focus','@media(max-width:640px)','prefers-reduced-motion:reduce','tenmei-ai-panel-enter','tenmei-ai-panel-exit','.tenmei-ai-info-panel[hidden]']) assert.ok(css.includes(text),'サイト共通UIとの統一が不足しています: '+text);
assert.ok(js.includes('createElementNS("http://www.w3.org/2000/svg","svg")'),'サイト共通SVGローダーを使用していません');
assert.ok(!/chatling|chtl-/i.test(html+js+css+worker+headers),'旧外部AIの実装参照が残っています');
assert.ok(!/localStorage\.setItem|sessionStorage/.test(js),'会話履歴をブラウザーへ保存してはいけません');
assert.ok(!/innerHTML/.test(js),'AI応答はinnerHTMLで描画してはいけません');
console.log('天命乃杜独自AIエージェントのUI統一・回帰テストに合格しました。');
