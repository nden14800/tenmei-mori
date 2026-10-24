const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const authSection = html.match(
  /<section id="view-auth"[\s\S]*?<section id="view-profile"/
)?.[0] || '';

assert(authSection, '参拝証の発行画面のセクションを抽出できません。');

function requireText(text, message) {
  assert(html.includes(text), message);
}

function countText(text) {
  return html.split(text).length - 1;
}

requireText(
  '<section id="view-auth" class="view-section auth-pilgrimage-view relative">',
  '参拝証の発行画面が新しい参拝証の道程テンプレートとして定義されていません。'
);
requireText(
  'class="auth-passport-hero"',
  '参拝証の発行画面に共通紙面の導入ヘッダーがありません。'
);
requireText(
  'class="auth-passport-mark"',
  '参拝証の発行画面に共通紙面に合わせた会員印がありません。'
);
requireText(
  '<h2 id="auth-passport-title" class="auth-passport-title">参拝証の発行</h2>',
  '参拝証の発行の主見出しが他の刷新済み画面と同じテキスト開始位置になっていません。'
);
assert.equal(
  authSection.includes('class="auth-passport-title"><i'),
  false,
  '参拝証の発行の主見出し左にだけある旧アイコン構造が残っています。'
);
assert.equal(
  html.includes('.auth-passport-title i {'),
  false,
  '参拝証の発行の主見出し左アイコン用スタイルが残っています。'
);
requireText(
  'class="auth-pilgrimage-stack"',
  '参拝証の発行画面に一体型の発行フロー構造がありません。'
);
requireText(
  'class="auth-journey-intro"',
  '参拝証の発行画面に横方向の道程案内見出しがありません。'
);
requireText(
  'class="auth-journey-panel"',
  '参拝証の発行画面に現在位置を示す道程パネルがありません。'
);
assert.equal(
  authSection.includes('auth-passport-seal'),
  false,
  '参拝証の発行画面に独立した旧印章構造が残っています。'
);
assert.equal(
  authSection.includes('<aside class="auth-journey-panel"'),
  false,
  '参拝証の発行画面に固定サイドバーの旧構造が残っています。'
);
requireText(
  'data-auth-stage="choice"',
  '参拝証の発行画面に選択段階の状態管理がありません。'
);
requireText(
  'data-auth-stage="details"',
  '参拝証の発行画面に入力段階の状態管理がありません。'
);
requireText(
  'data-auth-stage="verify"',
  '参拝証の発行画面に認証完了段階の状態管理がありません。'
);
requireText(
  'function updateAuthPilgrimageStage(stage)',
  '参拝証の道程における段階同期関数がありません。'
);
requireText(
  "updateAuthPilgrimageStage('details');",
  'ログイン・登録入力時に参拝証の道程が同期しません。'
);
requireText(
  "updateAuthPilgrimageStage('verify');",
  '認証コード送信後に参拝証の道程が同期しません。'
);
assert.equal(
  countText('auth-bento-grid'),
  0,
  '参拝証の発行画面に置換前のBento選択グリッドが残っています。'
);
requireText(
  'class="auth-choice-card auth-choice-card--login" data-auth-choice="login"',
  'ログイン選択がキーボード操作可能なボタンとして定義されていません。'
);
requireText(
  'class="auth-choice-card auth-choice-card--register" data-auth-choice="register"',
  '新規登録選択がキーボード操作可能なボタンとして定義されていません。'
);
requireText(
  'class="auth-google-button" onclick="startGoogleLogin()"',
  'Googleログイン導線が公式ブランド用の独立ボタンとして定義されていません。'
);
requireText(
  'function startGoogleLogin()',
  'Googleログイン開始関数が失われています。'
);
requireText(
  "window.location.href = `${API_BASE}/api/auth/google/redirect`;",
  'Googleログインの既存リダイレクト先が変更されています。'
);
requireText(
  'id="auth-step-1" class="hidden auth-form-container auth-flow-shell"',
  'ログイン・新規登録フォームが共通認証フローサーフェスを使用していません。'
);
requireText(
  'id="auth-step-2" class="hidden auth-form-container auth-flow-shell text-center"',
  '認証コード入力が共通認証フローサーフェスを使用していません。'
);
requireText(
  '<label for="login-email" class="auth-field-label">メールアドレス',
  'ログイン用メールアドレスに関連付けられたラベルがありません。'
);
requireText(
  '<label for="reg-username" class="auth-field-label">参拝者名',
  '新規登録用参拝者名に関連付けられたラベルがありません。'
);
requireText(
  'autocomplete="current-password"',
  'ログイン用パスワードのautocomplete指定が失われています。'
);
requireText(
  'autocomplete="new-password"',
  '登録用パスワードのautocomplete指定が失われています。'
);
requireText(
  'autocomplete="one-time-code"',
  '認証コードの入力支援用autocomplete指定がありません。'
);
requireText(
  'function toggleAuthPassword(inputId, button)',
  'パスワード表示切替関数がありません。'
);
requireText(
  "toggleAuthPassword('login-password', this)",
  'ログイン用パスワード表示切替が接続されていません。'
);
requireText(
  "toggleAuthPassword('reg-password', this)",
  '登録用パスワード表示切替が接続されていません。'
);
requireText(
  "renderTurnstileForMode(mode);",
  'モード別Turnstile描画処理が失われています。'
);
requireText(
  "onclick=\"initiateAuth('login')\"",
  'ログインの認証コード送信処理が接続されていません。'
);
requireText(
  "onclick=\"initiateAuth('register')\"",
  '新規登録の認証コード送信処理が接続されていません。'
);
requireText(
  'onpaste="handleOtpPaste(event)"',
  '認証コードの貼り付け対応が失われています。'
);
requireText(
  'function backToAuthSelection()',
  '認証選択へ戻る関数がありません。'
);
requireText(
  'data-auth-choice="${currentState.authMode}"',
  '選択画面へ戻る際のフォーカス復帰処理がありません。'
);
requireText(
  'auth-flow-shell',
  '認証画面の統一サーフェス用スタイルがありません。'
);
[
  '/* Ver.4.0: 参拝証の発行 — 共通紙面への統一',
  '.auth-passport-mark {',
  '.auth-pilgrimage-stack { display: grid; gap: 1rem; }',
  '.auth-journey-panel { position: static; display: grid; grid-template-columns:',
  '.auth-journey-steps { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }',
  '.auth-workbench { min-height: 0;',
  '@media (max-width: 760px) {',
  '/* Ver.4.0: 画面横断の紙面・カードリズム統一',
  '.prefecture-observatory-layout,\n.auth-pilgrimage-view {\n    width: min(100%, 960px);',
  '.prefecture-observatory-hero,\n.auth-passport-hero {\n    min-height: 250px;',
  '.prefecture-observatory-controls,\n.prefecture-ranking-panel,\n.prefecture-map-panel,\n.auth-journey-panel,\n.auth-workbench {\n    border-radius: 22px;',
].forEach((text) => {
  requireText(text, `参拝証の共通紙面・横方向の道程・レスポンシブ契約が失われています: ${text}`);
});
requireText(
  'auth-google-button',
  'Googleログイン用の公式ブランド対応スタイルがありません。'
);
requireText(
  '@media (prefers-reduced-motion: reduce)',
  '認証画面の低モーション対応がありません。'
);
assert.equal(
  countText('ゲストIDで識別<br>（端末とサーバーに保存）'),
  2,
  '参拝証の発行画面内のゲスト保存先説明が2箇所とも実装と一致していません。'
);
assert.equal(
  countText('端末のみ保存<br>（参拝者名の設定が必要）'),
  0,
  '参拝証の発行画面に古い端末のみ保存の説明が残っています。'
);

console.log('参拝証の発行UIの回帰テストに合格しました。');
console.log(JSON.stringify({
  accessibleChoices: true,
  formLabels: true,
  passwordManagerSupport: true,
  otpPasteSupport: true,
  googleBrandButton: true,
  turnstilePreserved: true,
  focusReturn: true,
  guestStorageDisclosureAligned: true,
  pilgrimageTemplate: true,
  sharedPaperLayout: true,
  horizontalJourneyPresent: true,
  stageSynchronization: true,
  titleIconRemoved: true,
  sharedCardRhythm: true,
}, null, 2));
