const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const aboutSection = html.match(
  /<section id="view-about"[\s\S]*?<\/section>\n\s*<!-- ビュー: 開発者について -->/
)?.[0] || '';

assert(aboutSection, '当サイトについて画面のセクションを抽出できません。');

function requireText(text, message) {
  assert(html.includes(text), message);
}

function requireSectionText(text, message) {
  assert(aboutSection.includes(text), message);
}

requireText(
  '<section id="view-about" class="view-section about-codex-layout" aria-labelledby="about-page-title">',
  '当サイトについて画面が新しいabout-codex-layoutテンプレートとして定義されていません。'
);
requireSectionText(
  'class="about-codex-hero"',
  '当サイトについて画面に新しい文書殿ヒーローがありません。'
);
requireSectionText(
  'class="about-codex-guide" aria-labelledby="about-guide-heading"',
  '当サイトについて画面に文書の閲覧ガイドがありません。'
);
requireSectionText(
  'id="about-toc-container" class="about-codex-toc hidden" aria-labelledby="about-toc-heading"',
  '当サイトについて画面の動的目次コンテナが新テンプレートに保持されていません。'
);
requireText("list.className='article-toc-unified__list'", '当サイトについて画面の動的目次リスト生成処理がありません。');
requireSectionText(
  'id="about-content-area" class="about-codex-content"',
  '当サイトについて画面のPDF対象本文IDが新テンプレートに保持されていません。'
);
requireSectionText(
  'id="about-terms-section"',
  '利用規約への既存ページ内リンク先IDが保持されていません。'
);
requireSectionText(
  'id="about-pdf-btn" type="button"',
  'PDF保存ボタンIDまたはbutton種別が保持されていません。'
);
requireSectionText(
  "onclick=\"downloadAsPDF('about')\"",
  'PDF保存ボタンの既存処理接続が失われています。'
);
assert.equal(
  aboutSection.includes('about-hero-card'),
  false,
  '当サイトについて画面に置換前のabout-hero-card構造が残っています。'
);

[
  '制定: 2026/01/02 ・ 改定: 2026/10/10 (第26版) ・ 運営: nden148',
  '天命乃杜は、テクノロジーで再定義された<br>「現代の鎮守の杜」です',
  '天命乃杜の特徴と機能（完全版）',
  '当サイトの運用ポリシーと技術的背景',
  '利用規約',
  '著作権と二次利用',
  '免責事項および連絡窓口について',
  '第1条（サービスの性質）',
  '第2条（アカウント管理）',
  '第3条（禁止事項）',
  'Cloudflare Workers AI（GLM-4.7-Flash）',
  '公式Discord参拝所',
].forEach((text) => {
  requireSectionText(text, `当サイトについて画面の既存本文または表記が失われています: ${text}`);
});

assert.equal(
  (aboutSection.match(/class="about-codex-chapter about-codex-chapter--/g) || []).length,
  5,
  '当サイトについて画面の5章構成が保持されていません。'
);
assert.equal(
  (aboutSection.match(/<h3\b/g) || []).length,
  5,
  '当サイトについて画面の章見出しh3が5件ではありません。'
);
assert.equal(
  (aboutSection.match(/<h4\b/g) || []).length,
  14,
  '当サイトについて画面の節見出しh4が14件ではありません。'
);

[
  '.about-codex-layout {',
  '.dark .about-codex-layout {',
  '@media (prefers-color-scheme: dark) {\n    html:not(.light) .about-codex-layout {',
  '#view-about #about-pdf-btn:focus-visible,',
  '#view-about.printing .about-codex-hero {',
  '#view-about.printing .about-codex-chapter > div {',
  '.about-codex-hero h1, .privacy-ledger-hero h1',
].forEach((text) => {
  requireText(text, `当サイトについて画面のテーマ・フォーカス・PDF出力契約が失われています: ${text}`);
});

console.log('当サイトについて画面の回帰テストに合格しました。');
console.log(JSON.stringify({
  aboutCodexTemplate: true,
  publicTextPreserved: true,
  tocContractPreserved: true,
  pdfContractPreserved: true,
  semanticHeadingHierarchy: true,
  themeRulesPresent: true,
  printRulesPresent: true,
  visibleFocusPresent: true,
}, null, 2));
