const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const developerStart = html.indexOf('<section id="view-developer"');
const privacyStart = html.indexOf('<section id="view-privacy"', developerStart);
const developerSection = developerStart >= 0 && privacyStart > developerStart
  ? html.slice(developerStart, privacyStart)
  : '';

const mainContentStart = html.indexOf('<main id="main-content"');
const mainContentEnd = html.indexOf('</main>', mainContentStart);
const mainContentBeforeDeveloper = mainContentStart >= 0 && developerStart > mainContentStart
  ? html.slice(mainContentStart, developerStart)
  : '';
assert(mainContentBeforeDeveloper, '開発者画面より前に本体のmainコンテナがありません。');
assert.equal(
  (mainContentBeforeDeveloper.match(/<main\\b/g) || []).length,
  1,
  'main-content内に入れ子のmain要素があり、ブラウザーが本体コンテナを自動終了する可能性があります。'
);
assert(mainContentEnd > developerStart, '本体のmainコンテナが開発者画面より前に閉じています。');

assert(developerSection, '開発者について画面のセクションを抽出できません。');

function requireText(text, message) {
  assert(html.includes(text), message);
}

function countText(text) {
  return html.split(text).length - 1;
}

requireText(
  '<section id="view-developer" class="view-section developer-study-layout" aria-labelledby="developer-page-title">',
  '開発者について画面が新しいdeveloper-study-layoutテンプレートとして定義されていません。'
);
requireText(
  'class="developer-study-hero"',
  '開発者について画面に新しい書見台ヒーローがありません。'
);
requireText(
  'class="developer-study-glance" aria-labelledby="developer-glance-title"',
  '開発者プロフィールの概要面がセマンティックに定義されていません。'
);
requireText(
  'class="developer-study-link-list"',
  '公式リンクの独立した導線構造がありません。'
);
requireText(
  'class="developer-study-repository-list"',
  '公開リポジトリの独立した一覧構造がありません。'
);
assert.equal(
  countText('developer-header-hero-card'),
  0,
  '開発者について画面の置換前ヒーロー構造または旧スタイルが残っています。'
);

[
  'こんにちは、nden148です。性別は男です。この名前は特に深い意味はなく、ぱっと思いついたものです。個人で活動しており、時々ウェブサイトを作っています。',
  '英語（読み書き・まだ修行中）',
  'Minecraftコマンド（統合版のみ）',
  'AIにコードを生成させること',
  'ゲーム',
  'YouTube鑑賞',
  '以前はFirebase Studioを愛用していましたが、ワークスペースの制限や読み込みの遅さを感じるようになりました。より柔軟な開発環境を求め、現在はGitHubをメインのプラットフォームとして活動しています。',
  '私自身はプログラミングの知識が全く無いため、開発は基本的にAIに全て任せています。',
  '天命乃杜 本体（index.html・認証バックエンド・Discordボット）',
  '社務所だより記事をAIで分析・可視化する外部ダッシュボード',
].forEach((text) => {
  requireText(text, `開発者について画面の既存本文または説明が失われています: ${text}`);
});

[
  'https://discord.gg/Ys6hpbNdcV',
  'https://github.com/nden14800',
  'https://www.youtube.com/@nden148-x2g',
  'https://github.com/nden14800/tenmei-mori',
  'https://github.com/nden14800/tenmei-mori-article-analysis-dashboard',
].forEach((href) => {
  requireText(href, `開発者について画面の既存リンクが失われています: ${href}`);
});

assert.equal(
  countText('target="_blank" rel="noopener noreferrer" class="developer-study-'),
  5,
  '開発者について画面の外部リンク5件に安全な新規タブ属性が揃っていません。'
);
assert.equal(
  (developerSection.match(/aria-label="/g) || []).length,
  6,
  '開発者について画面の活動要点と外部リンク5件にアクセシブルな名称が揃っていません。'
);
requireText(
  'class="bi bi-person-fill" aria-hidden="true"',
  'プロフィール概要が既存のBootstrap Iconsを使用していません。'
);
assert.equal(
  /[🧑🛠️🎮🌐]/u.test(developerSection),
  false,
  '開発者について画面のプロフィール項目に絵文字が残っています。'
);
requireText(
  '.developer-study-link:focus,',
  '公式リンクの可視フォーカス規則がありません。'
);
requireText(
  '.developer-study-repository:focus,',
  '公開リポジトリの可視フォーカス規則がありません。'
);
requireText(
  '.dark .developer-study-hero',
  '開発者ヒーローのダークテーマ規則がありません。'
);
requireText(
  '@media (max-width: 760px) {\n    .developer-study-hero,',
  '開発者画面のモバイル単列レイアウト規則がありません。'
);

console.log('開発者について画面の回帰テストに合格しました。');
console.log(JSON.stringify({
  developerStudyTemplate: true,
  profileContentPreserved: true,
  officialLinksPreserved: true,
  repositoriesPreserved: true,
  bootstrapIconsUnified: true,
  themeRulesPresent: true,
  visibleFocusPresent: true,
  mobileLayoutPresent: true,
}, null, 2));
