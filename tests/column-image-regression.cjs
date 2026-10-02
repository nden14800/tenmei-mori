const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const indexPath = path.join(repositoryRoot, 'index.html');
const assetDirectory = path.join(repositoryRoot, 'assets', 'article-images');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const generatedImages = [
  ...[2, 3, 4].map((id) => ({ id, extension: 'webp' })),
  ...Array.from({ length: 20 }, (_, offset) => ({ id: 5 + offset, extension: 'webp' })),
  ...Array.from({ length: 20 }, (_, offset) => ({ id: 25 + offset, extension: 'webp' })),
  ...[45, 46, 47, 48, 49, 50, 51, 52, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65].map((id) => ({ id, extension: 'webp' })),
];
const additionalGeneratedImageSources = [
  'assets/article-images/omikuji-rank-order-12.webp',
];
const tallScreenshotSources = [
  'assets/article-images/atago-jinja-omikuji-full-page.webp',
  'assets/article-images/macchan-mikuji-full-page.webp',
  'assets/article-images/omikuji-do-full-page.webp',
  'assets/article-images/omikuji-online-full-page.webp',
  'assets/article-images/prism-japan-omikuji-full-page.webp',
];
const failures = [];

for (const { id, extension } of generatedImages) {
  const paddedId = String(id).padStart(3, '0');
  const imageReference = `assets/article-images/column-${paddedId}-overview.${extension}`;
  const svgReference = `assets/article-images/column-${paddedId}-overview.svg`;
  const assetPath = path.join(assetDirectory, `column-${paddedId}-overview.${extension}`);
  const imageTagPattern = new RegExp(`<img src="${imageReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" alt="([^"]+)" loading="lazy">`);
  const isLatestColumnFallback = id === 62;
  const fallbackReference = 'assets/article-images/column-062-overview.jpg';
  const fallbackPath = path.join(assetDirectory, 'column-062-overview.jpg');
  const latestFallbackPattern = new RegExp(`<picture class="article-visual-media"><source srcset="${imageReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=[^"]+" type="image/webp"><img src="${fallbackReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=[^"]+" alt="([^"]+)" width="2560" height="1440" loading="eager" decoding="async" onerror="[^"]+"></picture>`);

  if (!fs.existsSync(assetPath)) {
    failures.push(`生成画像が存在しません: ${assetPath}`);
  }
  if (!indexHtml.includes(imageReference)) {
    failures.push(`AI生成画像の参照がありません: ${imageReference}`);
  }
  if (indexHtml.includes(svgReference)) {
    failures.push(`AI生成画像へ置換済みの記事にSVG参照が残っています: ${svgReference}`);
  }
  if (isLatestColumnFallback) {
    if (!fs.existsSync(fallbackPath)) {
      failures.push(`最新記事のJPEGフォールバック画像が存在しません: ${fallbackPath}`);
    }
    if (!latestFallbackPattern.test(indexHtml)) {
      failures.push('最新記事のWebP・JPEGフォールバック構造、固定寸法、または画像エラー時の代替処理がありません。');
    }
  } else if (!imageTagPattern.test(indexHtml)) {
    failures.push(`空でないalt属性またはlazy loadingを持つ画像タグがありません: ${imageReference}`);
  }
}

if (!indexHtml.includes('.article-visual--ai-generated img') || !indexHtml.includes('aspect-ratio: 16 / 9') || !indexHtml.includes('object-fit: cover')) {
  failures.push('AI生成画像向けの表示比率・object-fit規則がありません。');
}
if (indexHtml.includes('.article-content .article-visual img[src$=".webp"]')) {
  failures.push('全WebPへ固定16:9を適用する規則が残っています。');
}
for (const source of additionalGeneratedImageSources) {
  const assetPath = path.join(repositoryRoot, source);
  const imageTagPattern = new RegExp(`<img src="${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" alt="([^"]+)" loading="lazy">`);
  if (!fs.existsSync(assetPath)) {
    failures.push(`追加のAI生成画像が存在しません: ${source}`);
  }
  if (!indexHtml.includes(source)) {
    failures.push(`追加のAI生成画像の参照がありません: ${source}`);
  }
  if (!imageTagPattern.test(indexHtml)) {
    failures.push(`空でないalt属性またはlazy loadingを持つ追加画像タグがありません: ${source}`);
  }
}

const residualArticleSvgReferences = indexHtml.match(/assets\/article-images\/[^"']+\.svg/g) || [];
if (residualArticleSvgReferences.length > 0) {
  failures.push(`神籤草子本文にSVG参照が残っています: ${residualArticleSvgReferences.join(', ')}`);
}
const residualArticleSvgAssets = fs.readdirSync(assetDirectory).filter((name) => name.endsWith('.svg'));
if (residualArticleSvgAssets.length > 0) {
  failures.push(`AI画像へ置換済みのSVGアセットが残っています: ${residualArticleSvgAssets.join(', ')}`);
}

for (const screenshotSource of tallScreenshotSources) {
  const imagePosition = indexHtml.indexOf(screenshotSource);
  const figureStart = indexHtml.lastIndexOf('<figure', imagePosition);
  const figureEnd = indexHtml.indexOf('</figure>', imagePosition);
  const figureFragment = indexHtml.slice(figureStart, figureEnd);
  if (imagePosition === -1 || !figureFragment.includes('article-visual--screen')) {
    failures.push(`縦長スクリーンショットの全体表示用クラスがありません: ${screenshotSource}`);
  }
}

if (/(?:src|href)=["']\/(?:assets|favicon)\//.test(indexHtml)) {
  failures.push('RawGitHackなどのサブパス配信で欠落するルート相対アセット参照が残っています。');
}

const disclosureLabelCount = (indexHtml.match(/<strong>AIで制作したイメージ<\/strong>/g) || []).length;
const nonPhotographNoticeCount = (indexHtml.match(/実在の場所・人物・出来事を撮影した写真ではありません。/g) || []).length;
const disclosureFigureCount = (indexHtml.match(/<figure class="article-visual article-visual--overview article-visual--ai-generated">/g) || []).length;

const expectedGeneratedImageCount = generatedImages.length + additionalGeneratedImageSources.length;
if (disclosureLabelCount !== expectedGeneratedImageCount) {
  failures.push(`AI生成ラベルの件数が不正です: ${disclosureLabelCount}`);
}
if (nonPhotographNoticeCount !== expectedGeneratedImageCount * 2) {
  failures.push(`非実写説明の件数が不正です: ${nonPhotographNoticeCount}`);
}
if (disclosureFigureCount !== expectedGeneratedImageCount) {
  failures.push(`AI生成画像用figureの件数が不正です: ${disclosureFigureCount}`);
}
if (!indexHtml.includes('ai-image-disclosure__mark') || !indexHtml.includes('ai-image-disclosure__badge') || !indexHtml.includes('ai-image-disclosure__copy')) {
  failures.push('AI生成画像の開示カード部品がありません。');
}
if (!indexHtml.includes('AIで制作したイメージ') || !indexHtml.includes('実在の場所・人物・出来事を撮影した写真ではありません。')) {
  failures.push('AI生成画像の開示カードに必要な平易な説明がありません。');
}

if (failures.length > 0) {
  console.error('神籤草子画像回帰テストに失敗しました。');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`神籤草子画像回帰テストに成功しました。AI生成画像 ${expectedGeneratedImageCount} 件、残存SVG 0 件、縦長スクリーンショット ${tallScreenshotSources.length} 件を確認しました。`);
