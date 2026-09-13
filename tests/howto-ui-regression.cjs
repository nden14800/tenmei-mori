const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const howtoSection = html.match(
  /<section id="view-howto"[\s\S]*?<section id="view-status"/
)?.[0] || '';

assert(howtoSection, '天命乃杜の使い方画面のセクションを抽出できません。');

function requireText(text, message) {
  assert(html.includes(text), message);
}

function requireSectionText(text, message) {
  assert(howtoSection.includes(text), message);
}

requireText(
  '<section id="view-howto" class="view-section howto-guide-layout" aria-labelledby="howto-page-title">',
  '天命乃杜の使い方画面が新しいhowto-guide-layoutテンプレートとして定義されていません。'
);
requireSectionText('class="howto-guide-hero"', '使い方画面に参拝案内所ヒーローがありません。');
requireSectionText(
  'class="howto-guide-overview" aria-labelledby="howto-overview-heading"',
  '使い方画面に案内所の閲覧ガイドがありません。'
);
requireSectionText(
  'id="howto-toc-container" class="howto-guide-toc hidden" aria-labelledby="howto-toc-heading"',
  '使い方画面の動的目次コンテナが新テンプレートに保持されていません。'
);
requireSectionText('id="howto-toc-list"', '使い方画面の動的目次リストIDが保持されていません。');
requireSectionText(
  'id="howto-content-area" class="howto-guide-content" aria-labelledby="howto-content-heading"',
  '使い方画面の本文コンテナIDが新テンプレートに保持されていません。'
);

[
  '天命乃杜の使い方',
  'おみくじを引く（天命の授与所）',
  '12星座占い',
  'デジタル御守授与所',
  '参拝の記録',
  'おみくじの轍',
  '全国・土地の運気',
  '社務所だより・神籤草子',
  '参拝証の発行（会員登録・ログイン）',
  '公式Discordサーバー',
  '環境・表示設定',
  '環境・表示設定を開く',
  'AI夢占い',
  'TENMEI LABS',
  'もう一度、簡単な案内を見る',
  'おみくじの結果を画像またはPDFとして端末に保存したり、公式Discordサーバーへ結果を共有したりできます。',
  '未ログインの場合、端末のlocalStorageに保存したゲストIDで記録を識別し、参拝記録とゲストプロフィールは当サイトのサーバーにも保存されます。',
  '取得した位置情報はサーバーには送信・保存されません',
  '要約はAIによる自動生成のため、実際の記事内容と異なる場合があります。',
  'Googleアカウントでのログインにも対応しています。',
  '合言葉を見つけたら、Labsの「合言葉入力」欄で確かめられます。',
].forEach((text) => {
  requireSectionText(text, `使い方画面の本文または重要な案内が失われています: ${text}`);
});

assert.equal(
  (howtoSection.match(/class="howto-guide-entry-number"/g) || []).length,
  14,
  '使い方画面の案内見出しh3が14件ではありません。'
);

assert.equal(
  howtoSection.includes("AppConfig.toggle('"),
  false,
  '使い方画面に設定を変更する重複UIが残っています。'
);
assert.ok(
  howtoSection.includes("onclick=\"showView('settings')\""),
  '使い方画面から正本の環境・表示設定へ移動できません。'
);
assert.ok(
  html.includes('id="settings-public-documents-toggle"') && html.includes("AppConfig.toggle('publicDocumentReading', this.checked)"),
  '公開文書の読書設定を切り替える正本の操作がありません。'
);
assert.ok(
  html.includes('id="settings-draw-history-toggle"') && html.includes("AppConfig.toggle('saveDrawHistory', this.checked)"),
  'おみくじ保存を切り替える正本の操作がありません。'
);

assert.equal(
  howtoSection.includes('howto-hero-card'),
  false,
  '使い方画面に置換前のhowto-hero-card構造が残っています。'
);
assert.equal(
  howtoSection.includes('class="bento-card"'),
  false,
  '使い方画面に置換前のBentoカード構造が残っています。'
);

[
  '.howto-guide-layout {',
  '.dark .howto-guide-layout {',
  '@media (prefers-color-scheme: dark) {\n    html:not(.light) .howto-guide-layout {',
  '#view-howto a:focus-visible,',
  '@media (prefers-reduced-motion: reduce) {',
  '#view-howto #howto-toc-list a {',
  '.howto-guide-option-group .theme-select-btn.active {',
  'body.sidebar-collapsed #view-howto {',
  'margin-left: max(144px, calc((100% - 920px) / 2));',
  '@media (min-width: 761px) and (max-width: 1366px) {',
  'body.sidebar-collapsed #main-content #view-howto.howto-guide-layout {',
  'margin-left: auto !important;',
  ':is(#view-howto, #view-settings, #cookie-preferences-dialog) .howto-guide-switch input {',
  'position: absolute;',
  "btn.setAttribute('aria-pressed', String(isSelected));",
].forEach((text) => {
  requireText(text, `使い方画面のテーマ・フォーカス・状態同期契約が失われています: ${text}`);
});

console.log('天命乃杜の使い方画面の回帰テストに合格しました。');
console.log(JSON.stringify({
  howtoGuideTemplate: true,
  guideTextPreserved: true,
  fourteenHeadingsPreserved: true,
  tocContractPreserved: true,
  settingsContractPreserved: true,
  walkthroughContractPreserved: true,
  themeRulesPresent: true,
  visibleFocusPresent: true,
  reducedMotionRulePresent: true,
  tabletCenteredLayoutPresent: true,
  explicitSwitchStatePresent: true,
}, null, 2));
