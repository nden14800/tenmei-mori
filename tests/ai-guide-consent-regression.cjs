const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function loadOptionalSupportChat()');
const end = html.indexOf('// UX計測は「利用状況の解析」', start);
assert(start >= 0 && end > start, 'AI案内の同意管理コードを抽出できません。');
const consentCode = html.slice(start, end);

assert(
  consentCode.includes('if (generation !== aiGuideState.generation) return;'),
  '古いAIスクリプトの完了通知が現在の読み込み状態を変更しないための世代チェックがありません。'
);
assert(
  consentCode.includes('ensureConsentLauncher(true)'),
  'AI案内の読み込み失敗時に再試行用の入口を表示していません。'
);
assert(
  consentCode.includes("button.remove();\n                    loadOptionalSupportChat();"),
  '許可済みユーザーが再試行ボタンからAI案内を再読み込みできません。'
);
assert(
  consentCode.includes("if (pendingScript && !aiGuideState.loaded) pendingScript.remove();"),
  '許可を取り消した際に未完了のスクリプト要求を整理していません。'
);
const staleGuard = consentCode.indexOf('if (generation !== aiGuideState.generation) return;');
const unmount = consentCode.indexOf('window.TenmeiAIAgent.unmount()', staleGuard);
assert(staleGuard >= 0 && (unmount === -1 || staleGuard < unmount), '古い要求の分岐より先にunmountが実行されます。');

console.log('AI案内のCookie同意・読み込み競合回帰テストに合格しました。');
console.log(JSON.stringify({
  staleLoadCannotUnmountCurrentGuide: true,
  failedLoadOffersRetry: true,
  consentRevocationRemovesPendingScript: true,
}, null, 2));
