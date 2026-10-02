const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

function requireText(text, message) {
  assert(html.includes(text), message);
}

const historyHtml = html.match(/<div class="ver-history-overlay"[\s\S]*?<\/body>/)?.[0] || '';
assert(historyHtml, '更新の軌跡のパネルHTMLを抽出できません。');

[
  '<style id="version-history-v4-style">',
  'id="ver-history-overlay"',
  'id="ver-history-panel"',
  'class="ver-panel-header"',
  'class="ver-panel-eyebrow"><i class="bi bi-clock-history" aria-hidden="true"></i> UPDATE ARCHIVE',
  '<h2 class="ver-panel-title">更新の軌跡</h2>',
  'class="ver-panel-emblem" data-ver4-hero-emblem',
  'class="ver-panel-close" type="button" onclick="closeVerHistory()" aria-label="更新の軌跡を閉じる"',
  'id="ver-detail-panel"',
  'id="ver-detail-content"',
].forEach((text) => requireText(text, `更新の軌跡のVer.4.0構造が失われています: ${text}`));

[
  '運勢・天命乃杜 <strong>Ver. 4.2</strong>',
  '2026年10月2日リリース',
  "openVerDetail('v42')",
  "v42: {",
  "ver: 'Ver. 4.2'",
  "date: '2026年9月28日'",
  'Ver. 4.0',
  "v40: {",
  "ver: 'Ver. 4.0'",
  '「静謐な即応」全画面UI/UX大規模刷新',
  'OS標準に依存しない選択リスト・日付選択カレンダーへ移行し、キーボード操作と既存の値連携を維持。',
].forEach((text) => requireText(text, `Ver.4.0の正式リリース表記または詳細データが失われています: ${text}`));

[
  "openVerDetail('v41')",
  '2026年9月28日リリース',
  'Ver. 4.1',
  'id: 89,',
  'date: "2026/10/02"',
].forEach((text) => requireText(text, `Ver.4.1の現在版・記事契約が不足しています: ${text}`));

assert(historyHtml.includes("openVerDetail('v40')"), 'Ver.4.0が以前の版として残っていません。');
assert(!historyHtml.includes("openVerDetail('beta')"), '最古のbeta履歴が一覧から除外されていません。');

const historyItems = (historyHtml.match(/class="ver-timeline-item/g) || []).length;
assert.equal(historyItems, 20, `更新の軌跡の履歴件数が変わっています（期待値: 20、実際: ${historyItems}）。`);

[
  "openVerDetail('v40')",
  "openVerDetail('v36')",
  "openVerDetail('v35')",
  "openVerDetail('v30')",
  "openVerDetail('beta')",
  'function openVerHistory() {',
  'function closeVerHistory() {',
  'function openVerDetail(key) {',
  'function closeVerDetail() {',
  'function verGoToArticle(newsId) {',
  'function verToggleTooltip(tooltipId) {',
  'window._verTooltipMap = {};',
  "openArticle('news', newsId);",
].forEach((text) => requireText(text, `更新の軌跡の既存操作またはデータ接続が失われています: ${text}`));

[
  'function syncVerHistoryKeyboard() {',
  "item.setAttribute('role', 'button')",
  "item.setAttribute('tabindex', '0')",
  "if (event.key !== 'Enter' && event.key !== ' ') return;",
  'verHistoryReturnFocus = document.activeElement instanceof HTMLElement',
  "if (event.key !== 'Escape') return;",
  'verDetailOrigin = document.querySelector(`.ver-timeline-item[onclick*="openVerDetail(\'${key}\')"]`);',
].forEach((text) => requireText(text, `更新の軌跡のキーボード・フォーカス規則が失われています: ${text}`));

[
  '.ver-history-panel {',
  'width: min(calc(100% - 48px), var(--ver4-content-width, 960px));',
  'height: min(calc(100% - 48px), 860px);',
  'border-radius: var(--ver4-hero-radius, 28px) !important;',
  '.ver-panel-header {',
  'min-height: var(--ver4-hero-min-height, 258px);',
  '.ver-panel-header::before {',
  'inset: var(--ver4-hero-inner-inset, 12px);',
  '.ver-panel-emblem[data-ver4-hero-emblem] {',
  'width: 128px;',
  'height: 128px;',
  '.ver-item-card {',
  'padding: var(--ver4-card-padding, 24px) !important;',
  'border-radius: var(--ver4-card-radius, 24px) !important;',
  '.ver-detail-section {',
  'html.dark .ver-history-panel {',
  '@media (max-width: 768px) {',
  '.ver-history-panel { top: 16px; right: 16px; width: calc(100% - 32px);',
  '@media (prefers-reduced-motion: reduce) {',
].forEach((text) => requireText(text, `更新の軌跡のVer.4.0意匠規則が失われています: ${text}`));

console.log('更新の軌跡Ver.4.2 UI回帰テストに合格しました。');
console.log(JSON.stringify({
  archiveHeroContract: true,
  twentyHistoryItemsPreserved: true,
  ver42LatestReleasePresent: true,
  ver40ArchivedReleasePresent: true,
  homeVersionLabelUpdatedTo42: true,
  customChoiceAndDateControlsDocumented: true,
  detailAndSourceLinkContractsPreserved: true,
  keyboardAndFocusContractsPresent: true,
  normalCardHierarchyPresent: true,
  lightDarkMobileReducedMotionRulesPresent: true,
}, null, 2));
