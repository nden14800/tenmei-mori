const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const mindsetSection = html.match(/<section id="view-omikuji-mindset"[\s\S]*?<section id="view-draw"/)?.[0] || '';
const drawSection = html.match(/<section id="view-draw"[\s\S]*?<section id="view-result"/)?.[0] || '';
const resultSection = html.match(/<section id="view-result"[\s\S]*?<section id="view-zodiac"/)?.[0] || '';
const profileSection = html.match(/<section id="view-profile"[\s\S]*?<!-- ビュー: おみくじの轍/)?.[0] || '';
const ver4StyleBlock = html.match(/\/\* ================================================================\n                       Ver\.4\.0 おみくじ導線[\s\S]*?<\/style>/)?.[0] || '';

assert(mindsetSection, 'おみくじ前の心構えを抽出できません。');
assert(drawSection, '天命の授与所を抽出できません。');
assert(resultSection, 'おみくじ結果を抽出できません。');
assert(profileSection, 'アカウント設定を抽出できません。');
assert(ver4StyleBlock, 'おみくじ導線のVer.4.0最終スタイルを抽出できません。');

function requireText(text, message) {
  assert(html.includes(text), message);
}

function requireIn(section, text, message) {
  assert(section.includes(text), message);
}

[
  'class="view-section omikuji-mindset-v4"',
  'class="omikuji-mindset-v4-hero"',
  'id="omikuji-mindset-title"',
  'data-ver4-hero-emblem',
  'onclick="proceedToDraw()"',
  'class="omikuji-mindset-v4-progress"',
  'class="omikuji-mindset-v4-ritual"',
  'class="omikuji-mindset-v4-ready"',
  'id="mindset-skip-checkbox"',
].forEach((text) => requireIn(mindsetSection, text, `心構えの既存操作またはVer.4.0構造が失われています: ${text}`));

[
  'class="view-section omikuji-draw-v4"',
  'omikuji-draw-v4-hero',
  'id="omikuji-draw-title"',
  'class="omikuji-draw-v4-guidance"',
  'class="omikuji-draw-v4-pool-panel"',
  'class="omikuji-draw-v4-explore"',
  'id="omikuji-pool"',
  'onclick="addOmikuji()"',
  'class="btn-primary omikuji-v4-more-btn"',
].forEach((text) => requireIn(drawSection, text, `天命の授与所の既存操作またはVer.4.0構造が失われています: ${text}`));

[
  'id="countdown-overlay" role="status" aria-live="assertive"',
  'class="omikuji-countdown-v4-surface"',
  'class="omikuji-countdown-v4-ring"',
  'class="omikuji-countdown-v4-ring-progress"',
  'id="countdown-number"',
  "function drawResult(element) {",
  "async function showResultDetail(isNewDraw, dataOverride = null) {",
  "if(window.labSpeedMode) {",
  "progressRing.style.animation = 'omikuji-countdown-v4-progress 5s linear forwards';",
  "let omikujiSelectionInProgress = false;",
  "function selectOmikujiStick(stick) {",
  "document.createElement('button')",
  "stick.type = 'button';",
  "stick.setAttribute('role', 'button');",
  "stick.tabIndex = 0;",
  "stick.addEventListener('click', function(event) {",
  "event.key === 'Enter' || event.key === ' '",
  "selectOmikujiStick(this);",
  "if (item instanceof HTMLButtonElement) item.disabled = true;",
].forEach((text) => requireText(text, `結果待機・神速の祈りの既存導線またはVer.4.0構造が失われています: ${text}`));

[
  'class="view-section omikuji-result-v4"',
  'class="omikuji-result-v4-hero"',
  'class="omikuji-result-v4-hero"',
  'class="result-v4-reading-guide result-screen-only"',
  'class="result-v4-action-group result-v4-action-group--save"',
  'class="result-v4-action-group result-v4-action-group--next"',
  'class="result-v4-action-group result-v4-action-group--share"',
  'id="result-card-outer"',
  'id="result-ai-consult"',
  'id="worry-input"',
  'onclick="submitWorryConsult()"',
  'class="result-actions-container result-v4-actions"',
  'onclick="generateResultImage()"',
  'onclick="downloadResultAsPDF()"',
  'onclick="shareToX()"',
  'onclick="shareToDiscord()"',
].forEach((text) => requireIn(resultSection, text, `結果画面の既存操作またはVer.4.0構造が失われています: ${text}`));

[
  'class="view-section account-settings-page"',
  'aria-label="アカウント設定"',
  'id="profile-dashboard-content"',
  'function renderSettingsDashboard() {',
  'class="account-settings-v2"',
  'class="account-settings-v2-profile"',
  'class="account-settings-v2-form"',
  'onclick="updateAccountSettings()"',
  'onclick="deleteAccount()"',
  'id="account-details-heading"',
  'id="account-connection-heading"',
  'id="account-actions-heading"',
].forEach((text) => requireText(text, `アカウント設定の既存機能またはVer.4.0構造が失われています: ${text}`));

[
  '.omikuji-mindset-v4-hero,',
  '.omikuji-draw-v4-hero {',
  '.omikuji-mindset-v4-progress {',
  '.omikuji-mindset-v4-ritual,',
  '.omikuji-draw-v4-guidance-list {',
  '.omikuji-countdown-v4-ring {',
  '.result-v4-reading-guide,',
  '.result-v4-actions {',
  '.profile-v4-context {',
  '.profile-v4-dashboard-overview,',
  'grid-template-columns: minmax(0, 1fr) 128px;',
  'border-radius: 28px !important;',
  'inset: 12px;',
  '.omikuji-v4-mark[data-ver4-hero-emblem] {',
  'width: 128px;',
  'height: 128px;',
  '.omikuji-result-v4-hero,',
  '.profile-v4-hero {',
  '.result-v4-consult,',
  '.profile-bento-grid > .stats-card-interactive {',
  'html:not(.dark) .omikuji-mindset-v4-hero,',
  'html:not(.dark) .omikuji-result-v4-hero,',
  '@media (max-width: 700px) {',
].forEach((text) => requireIn(ver4StyleBlock, text, `Ver.4.0共通意匠規則が失われています: ${text}`));

const stickAccessibilityRule = ver4StyleBlock.match(/\.omikuji-draw-v4 \.omikuji-stick\s*\{([\s\S]*?)\}/)?.[1] || '';
assert(stickAccessibilityRule.includes('outline-offset'), 'おみくじ棒はキーボード利用時のフォーカス表示を備える必要があります。');
assert(!/(?:width|height|border-radius|background|transform)\s*:/.test(stickAccessibilityRule), 'おみくじ棒の視覚意匠をVer.4.0最終スタイルで変更してはいけません。');
assert(!ver4StyleBlock.includes('#result-card-outer {'), 'おみくじ結果札の意匠をVer.4.0最終スタイルで変更してはいけません。');



assert(!html.includes('bi-google'), 'GoogleロゴはBootstrap Iconsと公式ロゴで混在させてはいけません。');
assert(html.includes('const googleBrandMark = "<svg class=\\"google-brand-mark\\"'), 'サイト共通のGoogleブランドロゴ定義がありません。');
assert(html.includes('data-google-brand-mark'), 'ログイン画面が共通Googleロゴの描画先を持っていません。');
assert(html.includes("document.querySelectorAll('[data-google-brand-mark]')"), 'ログイン画面に共通Googleロゴを適用する処理がありません。');
assert(html.includes("section.icon === 'google-brand-mark' ? googleBrandMark"), '更新履歴のGoogleロゴが共通ブランド表示を使用していません。');
assert(!profileSection.includes('profile-v4-context-list'), 'アカウント概要と詳細セクションを重複表示してはいけません。');
assert(!profileSection.includes('profile-v4-hero'), 'アカウント設定のヒーローを二重表示してはいけません。');

assert(html.indexOf('const googleBrandMark') >= 0 && html.indexOf('const googleBrandMark') < html.indexOf('function renderSettingsDashboard()'), 'Googleロゴは複数画面から利用できる共通スコープで定義してください。');
const accountRenderer = html.slice(html.indexOf('async function renderSettingsDashboard()'), html.indexOf('function renderProfilePage'));
assert(accountRenderer.includes('account-settings-v2'), '新しいアカウント設定UIがありません。');
assert(accountRenderer.includes('class="profile-v4-hero account-settings-v2-hero"'), 'アカウント設定の最上部は全ページ共通のVer.4ヒーローを使用してください。');
assert(accountRenderer.includes('class="profile-v4-mark" data-ver4-hero-emblem'), 'アカウント設定のヒーロー印章は共通デザインを使用してください。');
assert(accountRenderer.includes('padding:var(--ver4-card-padding)'), 'アカウント概要カードは共通カード余白を使用してください。');
assert(accountRenderer.includes('border-radius:var(--ver4-card-radius)'), 'アカウント概要カードは共通カード角丸を使用してください。');
assert(accountRenderer.includes('box-shadow:0 8px 22px rgba(57,37,28,.05)'), 'アカウント概要カードは他画面と同じカード影を使用してください。');
assert(!accountRenderer.includes('account-settings-v2-settings-link'), '環境・表示設定への重複導線をアカウント画面に置いてはいけません。');
assert(!accountRenderer.includes('.account-settings-v2-hero { display:flex'), 'アカウント設定だけの独自ヒーローCSSを残してはいけません。');
assert(!accountRenderer.includes('AppConfig.toggle('), '環境・表示設定の操作をアカウント画面に重複配置してはいけません。');
assert(!accountRenderer.includes('resetAllSettings()'), '環境設定の初期化操作をアカウント画面に重複配置してはいけません。');
// 環境・表示設定は専用画面に集約し、アカウント画面には重複導線を置かない。

const accountStart = html.indexOf('async function renderSettingsDashboard()');
const accountEnd = html.indexOf('function renderProfilePage', accountStart);
const accountSource = html.slice(accountStart, accountEnd);
assert(accountSource.includes('account-settings-v2-heading-icon'), 'アカウント設定の各セクションに識別アイコンが必要です。');
assert(!accountSource.includes('loadUserProfile('), '廃止済みの公開プロフィール機能をアカウント設定から復活させてはいけません。');
assert(!accountSource.includes('公開プロフィール'), '廃止済みの公開プロフィールへの導線を表示してはいけません。');
assert(accountSource.includes("onclick=\"showView('history')\""), '参拝履歴へのショートカットがありません。');
assert(accountSource.includes('account-settings-v2-shortcuts'), '参拝履歴ショートカットのレイアウトがありません。');
assert(!accountSource.includes('.account-settings-v2 .profile-v4-hero {'), 'アカウント設定だけのヒーロー寸法上書きを残してはいけません。');
assert(!accountSource.includes('.account-settings-v2 .profile-v4-mark[data-ver4-hero-emblem]'), 'アカウント設定だけのヒーロー印章上書きを残してはいけません。');
assert(accountSource.includes('class="profile-v4-hero account-settings-v2-hero"'), '最上部カードは他画面と同じ共通Ver.4ヒーローを使用してください。');

console.log('おみくじ導線・アカウント設定のVer.4.0回帰テストに合格しました。');
console.log(JSON.stringify({
  mindsetHeroAndSkipPreserved: true,
  drawHeroAndPoolPreserved: true,
  countdownAndSkipModePreserved: true,
  resultActionsPreserved: true,
  omikujiStickInteractionUnified: true,
  omikujiStickAndResultCardProtected: true,
  profileDashboardOperationsPreserved: true,
  lightDarkResponsiveRulesPresent: true,
}, null, 2));
