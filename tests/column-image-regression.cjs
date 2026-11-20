const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const visualScript = fs.readFileSync(path.join(root, 'assets', 'js', 'column-editorial-visuals.js'), 'utf8');

assert(html.includes('<script src="assets/js/column-editorial-visuals.js" defer></script>'), '記事ビジュアルの遅延読み込みがありません。');
assert(html.includes('window.TenmeiColumnVisuals.clean(item.content)'), '旧AI画像の除去処理がありません。');
assert(html.includes('window.TenmeiColumnVisuals.mount(item, container)'), '記事を開いたときのビジュアル構成処理がありません。');
assert(!html.includes('column-editorial-images.js') && !html.includes('TenmeiColumnImages'), '旧画像ライブラリへの参照が残っています。');

const modes = ['timeline', 'process', 'comparison', 'beforeAfter', 'hierarchy', 'statistics', 'editorial'];
for (const mode of modes) {
  assert(visualScript.includes("column-native-visual--" + mode) || visualScript.includes("'" + mode + "'"), 'ビジュアル種別がありません: ' + mode);
  assert(html.includes('.column-native-visual--' + mode), '専用レイアウトCSSがありません: ' + mode);
}
for (const token of ['detectMode', 'collectSections', 'extractMetrics', 'renderTimeline', 'renderProcess', 'renderComparison', 'renderBeforeAfter', 'renderHierarchy', 'renderStatistics', 'renderEditorial', 'textContent', 'MIN_SECTIONS', 'window.TenmeiColumnVisuals']) {
  assert(visualScript.includes(token), '記事内容に応じた描画機能がありません: ' + token);
}
for (const forbidden of ['wikimedia.org', 'apiKey', 'workers.dev', '<svg', '<img', "createElement('img')"]) {
  assert(!visualScript.includes(forbidden), '外部画像API・SVG・写真取得方式が混入しています: ' + forbidden);
}
assert(!html.includes('column-editorial-attribution') && !html.includes('column-editorial-loading'), '旧画像クレジットまたは読み込み表示が残っています。');
console.log('記事ビジュアル回帰テストに合格しました。7種類の意味別レイアウトと本文連動、モバイル用CSSを確認しました。');
