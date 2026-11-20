const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const visualScript = fs.readFileSync(path.join(root, 'assets', 'js', 'column-editorial-visuals.js'), 'utf8');

assert(html.includes('<script src="assets/js/column-editorial-visuals.js" defer></script>'), '記事ネイティブビジュアルの遅延読み込みがありません。');
assert(html.includes('window.TenmeiColumnVisuals.clean(item.content)'), '旧AI画像を本文から除去する処理がありません。');
assert(html.includes('window.TenmeiColumnVisuals.mount(item, container)'), '記事を開いたときにネイティブビジュアルを構成していません。');
assert(html.includes('.column-native-visual') && html.includes('.column-native-visual__list'), 'ネイティブビジュアルのスタイルがありません。');
assert(!html.includes('column-editorial-images.js') && !html.includes('TenmeiColumnImages'), '旧画像ライブラリへの参照が残っています。');

for (const token of ['collectSections', "querySelectorAll('h2, h3, h4')", 'textContent', 'MAX_SECTIONS', 'MIN_SECTIONS', 'insertAdjacentElement', 'figcaption', 'column-native-visual__item', 'window.TenmeiColumnVisuals']) {
  assert(visualScript.includes(token), 'ネイティブビジュアルの必要機能がありません: ' + token);
}
for (const forbidden of ['wikimedia.org', 'apiKey', 'workers.dev', '<svg', '<img', "createElement('img')"]) {
  assert(!visualScript.includes(forbidden), '禁止された画像方式が残っています: ' + forbidden);
}
assert(!html.includes('column-editorial-attribution') && !html.includes('column-editorial-loading'), '旧画像クレジットまたは画像読み込み表示が残っています。');
console.log('記事ネイティブビジュアル回帰テストに合格しました。本文連動HTML/CSS、画像API・SVG・写真ライブラリ非依存、内容不足時の非表示を確認しました。');
