const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const visualScript = fs.readFileSync(path.join(root, 'assets', 'js', 'column-editorial-visuals.js'), 'utf8');
const enhancedCss = fs.readFileSync(path.join(root, 'assets', 'css', 'column-editorial-visuals-plus.css'), 'utf8');

assert(html.includes('<script src="assets/js/column-editorial-visuals.js" defer></script>'), '記事ビジュアルの遅延読み込みがありません。');
assert(html.includes('window.TenmeiColumnVisuals.clean(item.content)'), '旧AI画像の除去処理がありません。');
assert(html.includes('window.TenmeiColumnVisuals.mount(item, container)'), '記事を開いたときのビジュアル構成処理がありません。');
assert(!html.includes('column-editorial-images.js') && !html.includes('TenmeiColumnImages'), '旧画像ライブラリへの参照が残っています。');

const modes = ['timeline', 'process', 'comparison', 'beforeAfter', 'hierarchy', 'statistics', 'editorial', 'decision', 'causal', 'lifecycle'];
for (const mode of modes) {
  assert(visualScript.includes("column-native-visual--" + mode) || visualScript.includes("'" + mode + "'"), 'ビジュアル種別がありません: ' + mode);
  if (['decision', 'causal', 'lifecycle'].includes(mode)) {
    assert(enhancedCss.includes('.column-visual-' + mode), '専用レイアウトCSSがありません: ' + mode);
  } else {
    assert(html.includes('.column-native-visual--' + mode), '専用レイアウトCSSがありません: ' + mode);
  }
}
for (const token of ['detectMode', 'collectSections', 'extractMetrics', 'renderTimeline', 'renderProcess', 'renderComparison', 'renderBeforeAfter', 'renderHierarchy', 'renderStatistics', 'renderDecision', 'renderCausal', 'renderLifecycle', 'renderStoryline', 'textContent', 'MIN_SECTIONS', 'window.TenmeiColumnVisuals']) {
  assert(visualScript.includes(token), '記事内容に応じた描画機能がありません: ' + token);
}
for (const forbidden of ['wikimedia.org', 'apiKey', 'workers.dev', '<svg', '<img', "createElement('img')"]) {
  assert(!visualScript.includes(forbidden), '外部画像API・SVG・写真取得方式が混入しています: ' + forbidden);
}
assert(!html.includes('column-editorial-attribution') && !html.includes('column-editorial-loading'), '旧画像クレジットまたは読み込み表示が残っています。');
assert(visualScript.includes('ensureStylesheet') && visualScript.includes('data-column-visuals-plus'), '拡張ビジュアルCSSの読み込み処理がありません。');
assert(enhancedCss.includes('@media (max-width: 640px)') && enhancedCss.includes('@media (prefers-reduced-motion: reduce)'), 'モバイルまたは動きの軽減に対応していません。');
assert(visualScript.includes('compareDocumentPosition'), '見出し間の複数段落を正しく収集していません。');
console.log('記事ビジュアル回帰テストに合格しました。10種類の意味別構成・本文連動・モバイル対応を確認しました。');
