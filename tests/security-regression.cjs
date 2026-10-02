const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const indexPath = path.join(repositoryRoot, 'index.html');
const headersPath = path.join(repositoryRoot, '_headers');
const index = fs.readFileSync(indexPath, 'utf8');
const headers = fs.readFileSync(headersPath, 'utf8');
const workerPath = path.join(repositoryRoot, 'workers', 'tenmei-mori-backend.js');
const worker = fs.readFileSync(workerPath, 'utf8');
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) return '';
  return source.slice(start, end);
}

const historyRenderer = between(index, 'function renderHistoryList(historyData) {', '// 検索ボタン');
expect(historyRenderer.length > 0, 'renderHistoryList() を検出できません。');
expect(!/onclick\s*=\s*['"][^'"]*showResultDetail/.test(historyRenderer), '履歴カードがインラインonclickへshowResultDetail()を埋め込んでいます。');
expect(!/JSON\.stringify\(item\)/.test(historyRenderer), '履歴オブジェクトがHTML文字列へJSON.stringify()で埋め込まれています。');
expect(/historyCard\.addEventListener\('click', \(\) => showResultDetail\(false, item\)\);/.test(historyRenderer), '履歴カードのクリックイベントが安全なaddEventListener方式で登録されていません。');
expect(/\$\{escapeHtml\(item\.username\)\}/.test(historyRenderer), '履歴のユーザー名にescapeHtml()が適用されていません。');
expect(/\$\{escapeHtml\(result\)\}/.test(historyRenderer), '履歴の結果表示にescapeHtml()が適用されていません。');

const resultRenderer = between(index, 'function renderResultToCard(outerId, data, withFooter) {', '// --- 履歴・おみくじの轍');
expect(resultRenderer.length > 0, 'renderResultToCard() を検出できません。');
expect(!/\$\{d\.title\}|\$\{d\.content\}/.test(resultRenderer), '詳細項目が未エスケープのままHTMLへ埋め込まれています。');
expect(/\$\{escapeHtml\(d\.title\)\}/.test(resultRenderer), '詳細項目のタイトルにescapeHtml()が適用されていません。');
expect(/\$\{escapeHtml\(d\.content\)\}/.test(resultRenderer), '詳細項目の内容にescapeHtml()が適用されていません。');

const googleConnect = between(index, 'async function connectGoogleAccount() {', '// Googleアカウント連携解除');
expect(googleConnect.length > 0, 'connectGoogleAccount() を検出できません。');
expect(!/mode=connect&token/.test(googleConnect), 'Google連携URLにauth_tokenを含めています。');
expect(/authFetch\(`\$\{API_BASE\}\/api\/auth\/google\/connect\/start`, \{\s*method: 'POST'\s*\}\)/.test(googleConnect), 'Google連携を認証済みPOSTで開始していません。');
expect(/redirectUrl\.origin !== 'https:\/\/accounts\.google\.com'/.test(googleConnect), 'Google認可URLのオリジンを検証していません。');
expect(/redirectUrl\.pathname !== '\/o\/oauth2\/v2\/auth'/.test(googleConnect), 'Google認可URLのパスを検証していません。');

const columnSearchRenderer = between(index, 'window.renderFullColumnView = function() {', '};// 4. 記事詳細表示');
expect(columnSearchRenderer.length > 0, 'renderFullColumnView() を検出できません。');
expect(/\$\{escapeHtml\(listState\.column\.query\)\}/.test(columnSearchRenderer), 'コラム検索語がHTMLへ未エスケープで挿入されています。');
expect(!/\$\{listState\.column\.query\}/.test(columnSearchRenderer), 'コラム検索語の未エスケープ挿入が残っています。');

const profileRenderer = between(index, 'function renderProfilePage(data) {', '// --- プロフィール編集関連 ---');
expect(profileRenderer.length > 0, 'renderProfilePage() を検出できません。');
expect(!/onclick="openEditProfileModal\(/.test(profileRenderer), 'プロフィール編集ボタンが動的値をインラインonclickへ埋め込んでいます。');
expect(/profileEditButton\.addEventListener\('click'/.test(profileRenderer), 'プロフィール編集ボタンが安全なaddEventListener方式で登録されていません。');
expect(/const profileIconAllowlist = new Set\(/.test(profileRenderer), 'プロフィールアイコンの許可リストがありません。');
expect(/const safeProfileIcon = profileIconAllowlist\.has\(data\.icon\)/.test(profileRenderer), 'プロフィールアイコンを許可リストで検証していません。');
expect(/const safeProfileColor = Object\.prototype\.hasOwnProperty\.call\(iconColorMap, data\.color\)/.test(profileRenderer), 'プロフィール色を許可リストで検証していません。');

const unsafeShareOpenCount = (index.match(/window.open(intent, '_blank');/g) || []).length;
const safeShareOpenCount = (index.match(/window\.open\(intent, '_blank', 'noopener,noreferrer'\);/g) || []).length;
expect(unsafeShareOpenCount === 0, 'SNS共有のwindow.open()にnoopener,noreferrerがありません。');
expect(safeShareOpenCount === 4, `SNS共有の安全なwindow.open()が4件ではありません（検出件数: ${safeShareOpenCount}）。`);

expect(/^\/\*$/m.test(headers), '_headers に全パスへ適用するルールがありません。');
expect(headers.includes("Content-Security-Policy: default-src 'self'"), 'CSPのdefault-src selfがありません。');
expect(headers.includes("object-src 'none'"), 'CSPのobject-src noneがありません。');
expect(headers.includes("base-uri 'self'"), 'CSPのbase-uri selfがありません。');
expect(headers.includes("frame-ancestors 'none'"), 'CSPのframe-ancestors noneがありません。');
expect(!headers.includes("'unsafe-eval'"), 'CSPにunsafe-evalを追加してはいけません。');
expect(headers.includes('X-Content-Type-Options: nosniff'), 'X-Content-Type-Options: nosniffがありません。');
expect(headers.includes('X-Frame-Options: DENY'), 'X-Frame-Options: DENYがありません。');
expect(headers.includes('Referrer-Policy: strict-origin-when-cross-origin'), 'Referrer-Policyがありません。');

expect(!/Math\.random\(\).*900000/.test(worker), '認証コード生成にMath.random()を使用しています。');
expect(!worker.includes('tenmei-mori-fallback'), '認証用暗号鍵に固定フォールバック秘密値が残っています。');
expect(/crypto\.getRandomValues\(codeBytes\)/.test(worker), '認証コード生成に暗号学的乱数が使われていません。');

if (failures.length > 0) {
  console.error('セキュリティ回帰テストに失敗しました。');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('セキュリティ回帰テストに合格しました。');
console.log(JSON.stringify({
  safeShareOpenCount,
  cspConfigured: true,
  historyRendererUsesInlineHandler: false,
  columnSearchQueryEscaped: true,
  profileEditUsesEventListener: true,
}, null, 2));
