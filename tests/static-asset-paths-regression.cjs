const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const visualScriptPath = path.join(root, 'assets', 'js', 'column-editorial-visuals.js');
const imageAssetDirectory = path.join(root, 'assets', 'article-images');
const requiredFaviconFiles = [
  'favicon-96x96.png',
  'favicon.svg',
  'favicon.ico',
  'apple-touch-icon.png',
  'site.webmanifest',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
];

assert.equal(
  /(?:src|href)=["']\/(?:assets|favicon)\//.test(html),
  false,
  'RawGitHackなどのサブパス配信で欠落するルート相対アセット参照が残っています。'
);

[
  '<link rel="icon" type="image/png" href="favicon/favicon-96x96.png" sizes="96x96" />',
  '<link rel="icon" type="image/svg+xml" href="favicon/favicon.svg" />',
  '<link rel="shortcut icon" href="favicon/favicon.ico" />',
  '<link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png" />',
  '<link rel="manifest" href="favicon/site.webmanifest" />',
  '<img src="favicon/apple-touch-icon.png" alt="天命乃杜">',
].forEach((reference) => {
  assert(html.includes(reference), `配信先非依存のアイコン参照がありません: ${reference}`);
});

for (const file of requiredFaviconFiles) {
  assert(fs.existsSync(path.join(root, 'favicon', file)), `必要な本サイトアイコンがありません: favicon/${file}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'favicon', 'site.webmanifest'), 'utf8'));
assert.equal(manifest.name, '天命乃杜', 'Manifestのサイト名が天命乃杜と一致しません。');
assert(manifest.icons.some((icon) => icon.src === 'web-app-manifest-192x192.png' && icon.sizes === '192x192'), '192pxのManifestアイコン参照が不正です。');
assert(manifest.icons.some((icon) => icon.src === 'web-app-manifest-512x512.png' && icon.sizes === '512x512'), '512pxのManifestアイコン参照が不正です。');

assert(fs.existsSync(visualScriptPath), '記事ネイティブビジュアルの共通スクリプトがありません。');
assert(fs.existsSync(imageAssetDirectory), '記事資料画像ディレクトリがありません。');
assert(html.includes('<script src="assets/js/column-editorial-visuals.js" defer></script>'), '記事ネイティブビジュアルの配信参照がありません。');
const visualSource = fs.readFileSync(visualScriptPath, 'utf8');
for (const mode of ['timeline', 'process', 'comparison', 'beforeAfter', 'hierarchy', 'statistics', 'editorial']) {
  assert(visualSource.includes(mode), `記事ビジュアルの種別がありません: ${mode}`);
}
assert(!/assets\/article-images\/column-\d{3}-overview\.(?:webp|svg)/.test(html), '旧AI生成画像への参照が残っています。');
assert.equal(
  fs.readdirSync(imageAssetDirectory).filter((name) => /^column-\d{3}-overview\.(?:webp|jpg|jpeg|png|svg)$/i.test(name)).length,
  0,
  '旧AI生成コラム画像ファイルが残っています。'
);

assert(!html.includes('column-editorial-images.js'), '旧編集画像ライブラリの参照が残っています。');
console.log('静的アセット参照回帰テストに合格しました。記事ネイティブビジュアルと本サイトアイコンを確認しました。');
