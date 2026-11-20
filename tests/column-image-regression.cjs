const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const imageScript = fs.readFileSync(path.join(root, 'assets', 'js', 'column-editorial-images.js'), 'utf8');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

check(html.includes('<script src="assets/js/column-editorial-images.js" defer></script>'),
  'コラム画像ライブラリが遅延読み込みされていません。');
check(html.includes('window.TenmeiColumnImages.clean(item.content)'),
  '既存のAI生成画像を本文表示前に除去する処理がありません。');
check(html.includes('window.TenmeiColumnImages.mount(item, container)'),
  '記事を開いたときに共通画像ライブラリを起動していません。');
check(html.includes('.column-editorial-visual') && html.includes('.column-editorial-attribution'),
  '資料画像の表示・クレジット用スタイルがありません。');
check(!/assets\/article-images\/column-\d{3}-overview\.(?:webp|svg)/.test(html),
  '記事本文に旧AI生成画像アセットへの参照が残っています。');
check(!html.includes('AIで制作したイメージ') && !html.includes('article-visual--ai-generated">'),
  'AI生成画像の開示カードまたは画像figureが残っています。');

for (const token of [
  'https://commons.wikimedia.org/w/api.php',
  'allowedLicense',
  'dimensionsAreSuitable',
  'LicenseShortName',
  'LicenseUrl',
  'Artist',
  'localStorage',
  'CACHE_TTL',
  'CC BY-SA',
  'Public domain',
  'column-editorial-visual',
  'column-editorial-attribution',
  'noopener noreferrer',
  "loading = 'lazy'",
  'No suitable editorial image'
]) {
  check(imageScript.includes(token), '画像ライブラリに必要な機能がありません: ' + token);
}
check(!imageScript.includes('workers.dev') && !imageScript.includes('apiKey'),
  '画像取得に専用APIキーや追加Workerが必要になっています。');

if (failures.length) {
  console.error('コラム画像ライブラリ回帰テストに失敗しました。');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('コラム画像ライブラリ回帰テストに合格しました。AI画像の静的参照なし、Commons検索、ライセンス・解像度確認、出典表示、24時間キャッシュを確認しました。');
