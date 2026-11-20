const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const tutorialSection = html.match(
  /<!-- ── チュートリアル ウォークスルー[\s\S]*?<\/div>\n\n<!-- ── 隠しコマンド演出用オーバーレイ/
)?.[0] || '';
const tutorialScript = html.match(
  /<script>\n\(function\(\) \{\n    var TOTAL = 5;[\s\S]*?\n\}\)\(\);\n<\/script>/
)?.[0] || '';

assert(tutorialSection, 'ウォークスルーのHTML領域を抽出できません。');
assert(tutorialScript, 'ウォークスルーの制御スクリプトを抽出できません。');

[
  'id="tutorial-overlay" role="dialog" aria-modal="true"',
  'aria-label="天命乃杜の簡単な案内"',
  'class="tutorial-card" role="document"',
  'class="tutorial-progress-row"',
  'id="tutorial-progress-value" class="tutorial-progress-value" aria-live="polite"',
  'role="tablist" aria-label="ウォークスルーのステップ"',
  'id="tutorial-prev-btn"',
  'id="tutorial-skip-btn"',
  'id="tutorial-next-btn"',
  'id="tutorial-next-label"',
  'id="tutorial-next-icon"',
  '画面右下のAI案内も使えます',
  '直近最大10件の会話',
  '見えている見出し（最大8件）',
  '操作ラベルと位置区分（最大12件）',
  '画面全体や入力欄の値は送信されません',
  '個人情報は入力しないでください',
].forEach((text) => {
  assert(tutorialSection.includes(text), `Ver.4.0ウォークスルーの構造が不足しています: ${text}`);
});

assert.equal(
  (tutorialSection.match(/class="tutorial-slide(?: active)?"/g) || []).length,
  5,
  'ウォークスルーの5ステップが保持されていません。'
);
assert.equal(
  (tutorialSection.match(/class="tutorial-dot(?: active)?" role="tab"/g) || []).length,
  5,
  '操作可能な5つのステップドットが定義されていません。'
);
assert.equal(
  (tutorialSection.match(/class="tutorial-icon" aria-hidden="true"><i class="bi /g) || []).length,
  5,
  '5ステップのアイコンが既存Bootstrap Iconsへ統一されていません。'
);
assert.equal(
  /[⛩️🎴✨🏯🗺️]/u.test(tutorialSection),
  false,
  'ウォークスルーに置換前の絵文字アイコンが残っています。'
);

[
  '.tutorial-card {',
  'border-radius: 28px;',
  '.tutorial-icon {',
  'border-radius: 50%;',
  '.tutorial-btn-previous,',
  'min-height: 48px;',
  'html.dark .tutorial-card {',
  '@media (max-width: 560px) {',
  '@media (prefers-reduced-motion: reduce) {',
  '#tutorial-overlay button:focus-visible {',
].forEach((text) => {
  assert(html.includes(text), `ウォークスルーのVer.4.0テーマ・レスポンシブ・フォーカス規則が不足しています: ${text}`);
});

[
  'window.previousTutorialSlide = function()',
  "overlay.setAttribute('aria-hidden', 'false');",
  "overlay.setAttribute('aria-hidden', 'true');",
  "dot.setAttribute('aria-selected', String(isActive));",
  "dot.setAttribute('tabindex', isActive ? '0' : '-1');",
  "previousButton.disabled = current === 0;",
  "event.key === 'Escape'",
  "event.key === 'ArrowRight'",
  "event.key === 'ArrowLeft'",
  "event.key === 'Home'",
  "event.key === 'End'",
  "lastTrigger.focus();",
  "if (!overlay || overlay.classList.contains('active')) return;",
].forEach((text) => {
  assert(tutorialScript.includes(text), `ウォークスルーの既存操作またはアクセシビリティ契約が不足しています: ${text}`);
});

console.log('ウォークスルーVer.4.0回帰テストに合格しました。');
console.log(JSON.stringify({
  fiveSlidesPreserved: true,
  bootstrapIconsApplied: true,
  noLegacyEmojiIcons: true,
  accessibleDialogAndTabs: true,
  keyboardNavigation: true,
  focusReturn: true,
  lightDarkResponsiveReducedMotionRules: true,
}, null, 2));
