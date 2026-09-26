const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const privacySection = html.match(
  /<section id="view-privacy"[\s\S]*?<\/section>\s*<!-- サイトフッター/
)?.[0] || '';

assert(privacySection, 'プライバシーポリシー画面のセクションを抽出できません。');
const externalServicesSection = privacySection.match(
  /<h3[^>]*>[\s\S]*?第5条（外部サービスとの連携とデータ移転）[\s\S]*?<\/h3>([\s\S]*?)<h3[^>]*>[\s\S]*?第6条（個人情報の第三者提供）/
)?.[1] || '';
assert(externalServicesSection, '第5条の外部サービス開示範囲を抽出できません。');

function requireText(text, message) {
  assert(html.includes(text), message);
}

function requireSectionText(text, message) {
  assert(privacySection.includes(text), message);
}

requireText(
  '<section id="view-privacy" class="view-section privacy-ledger-layout" aria-labelledby="privacy-page-title">',
  'プライバシーポリシー画面が新しいprivacy-ledger-layoutテンプレートとして定義されていません。'
);
requireSectionText('class="privacy-ledger-hero"', 'プライバシーポリシー画面に規程書ヒーローがありません。');
requireSectionText(
  'class="privacy-ledger-guide" aria-labelledby="privacy-guide-heading"',
  'プライバシーポリシー画面に規程の閲覧ガイドがありません。'
);
requireSectionText(
  'id="privacy-toc-container" class="privacy-ledger-toc hidden" aria-labelledby="privacy-toc-heading"',
  'プライバシーポリシー画面の動的目次コンテナが新テンプレートに保持されていません。'
);
requireSectionText('id="privacy-toc-list"', 'プライバシーポリシー画面の動的目次リストIDが保持されていません。');
const revisionOptionsMatch = privacySection.match(/data-control-id="privacy-revision-select"[^>]*data-options='([^']+)'/);
assert(revisionOptionsMatch, 'プライバシー第9条の版選択肢が定義されていません。');
const revisionEditions = JSON.parse(revisionOptionsMatch[1]).map((option) => Number(option.value));
[32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,14,13,12,11,10,9,8,7,6,5,4,3].forEach((edition) => assert(revisionEditions.includes(edition), `プライバシー第${edition}版の選択肢がありません。`));
assert.equal(revisionEditions.includes(15), false, '確認できない第15版を推測で追加してはいけません。');
assert(html.includes('.dark .document-revision-selector{'), 'REVISION HISTORYのダークモードCSSがありません。');
assert(html.includes('.dark .document-revision-description{'), 'REVISION HISTORY説明欄のダークモードCSSがありません。');
requireSectionText(
  'id="privacy-content-area" class="privacy-ledger-content" aria-labelledby="privacy-articles-heading"',
  'プライバシーポリシー画面のPDF対象本文IDが新テンプレートに保持されていません。'
);
requireSectionText('id="privacy-pdf-btn"', 'プライバシーポリシー画面のPDF保存ボタンIDが保持されていません。');
requireSectionText(
  "onclick=\"downloadAsPDF('privacy')\"",
  'プライバシーポリシー画面のPDF保存ボタンの既存処理接続が失われています。'
);
assert.equal(
  privacySection.includes('privacy-hero-card'),
  false,
  'プライバシーポリシー画面に置換前のprivacy-hero-card構造が残っています。'
);

[
  '制定: 2026/01/02 ・ 改定: 2026/08/14 (第18版) ・ 運営: nden148',
  '第1条（定義）',
  '第2条（収集する個人情報および収集方法）',
  '第3条（個人情報の利用目的）',
  '第4条（個人情報の安全管理措置）',
  '第5条（外部サービスとの連携とデータ移転）',
  '第6条（個人情報の第三者提供）',
  '第7条（クッキー(Cookie)およびローカルストレージ）',
  '第8条（個人情報の開示・訂正・削除）',
  '第9条（プライバシーポリシーの変更・改定履歴）',
  '第10条（免責事項）',
  '第11条（連絡方法と個別対応の制限）',
  'Google Analytics および Microsoft Clarity を利用したアクセス解析のため',
  'Googleアカウントの表示名（Googleアカウントでのログインを利用する場合のみ。初期ユーザー名の候補として使用する場合があります）',
  'Cookieおよび疑似匿名ID、マウス操作・タップ操作の軌跡、クリック位置、スクロール深度、ページ閲覧情報、端末・ブラウザ情報',
  'AI夢占いの夢の本文および生成解釈を含む夢の記録（dream_history）',
  '第18版の主な変更：',
  '未ログイン時の参拝記録のサーバー保存、Googleログイン時に取得する表示名、Microsoft ClarityによるCookie・疑似匿名ID・セッション記録、退会時に削除するAI夢占いの夢の記録を明確化しました。',
  'アカウント削除後のデータ復旧は一切できません。',
].forEach((text) => {
  requireSectionText(text, `プライバシーポリシー第18版の本文または開示が失われています: ${text}`);
});

assert.equal(
  (privacySection.match(/<h3\b/g) || []).length,
  11,
  'プライバシーポリシーの条見出しh3が11件ではありません。'
);
assert.equal(
  (externalServicesSection.match(/<p class="font-bold text-sm">(?:1[0-2]|[1-9])\./g) || []).length,
  12,
  '外部サービス12件の開示カードが保持されていません。'
);
assert.equal(
  (privacySection.match(/<p class="font-bold text-sm">(?:1[0-2]|[1-9])\./g) || []).length,
  12,
  '外部サービス開示が規程書外へ重複して漏れています。'
);
assert.equal(
  privacySection.includes('</section>">3. Turso (ChiselStrike, Inc.)</p>'),
  false,
  '規程書終了後に不要なタグ断片が残っています。'
);
assert.equal(
  (externalServicesSection.match(/target="_blank" rel="noopener noreferrer"/g) || []).length,
  14,
  '外部サービス開示の安全な新規タブリンク14件が保持されていません。'
);

[
  'https://maileroo.com/legal/privacy-policy',
  'https://www.cloudflare.com/privacypolicy/',
  'https://turso.tech/privacy-policy',
  'https://policies.google.com/privacy',
  'https://privacy.microsoft.com/ja-jp/privacystatement',
  'https://wiki.osmfoundation.org/wiki/Privacy_Policy',
  'https://discord.com/privacy',
  'https://www.jsdelivr.com/terms/privacy-policy',
].forEach((href) => {
  requireSectionText(href, `プライバシーポリシーの外部サービスリンクが失われています: ${href}`);
});

[
  '.privacy-ledger-layout {',
  '.dark .privacy-ledger-layout {',
  '@media (prefers-color-scheme: dark) {\n    html:not(.light) .privacy-ledger-layout {',
  '#view-privacy #privacy-pdf-btn:focus-visible,',
  '#view-privacy.printing .privacy-ledger-hero {',
  '#view-privacy.printing .privacy-ledger-article > div {',
  '#view-privacy.printing .privacy-ledger-article > div:last-child {',
  'break-before: page !important;',
  'page-break-before: always !important;',
  '#view-privacy.printing .privacy-ledger-article { overflow: visible !important; }',
  'privacy-ledger-hero h1',
].forEach((text) => {
  requireText(text, `プライバシーポリシー画面のテーマ・フォーカス・PDF出力契約が失われています: ${text}`);
});

console.log('プライバシーポリシー画面の回帰テストに合格しました。');
console.log(JSON.stringify({
  privacyLedgerTemplate: true,
  policyVersion18Preserved: true,
  articleTextPreserved: true,
  thirdPartyDisclosuresPreserved: true,
  deletionDisclosurePreserved: true,
  tocContractPreserved: true,
  pdfContractPreserved: true,
  themeRulesPresent: true,
  printRulesPresent: true,
  visibleFocusPresent: true,
}, null, 2));
