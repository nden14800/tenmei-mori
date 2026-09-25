const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

[
  '読書を妨げない、シンプルなリスト型ナビゲーション',
  'article-toc-unified__title',
  'article-toc-unified__list',
  'article-toc-unified__item--sub',
  'article-toc-unified__link',
  'grid-template-columns: repeat(2, minmax(0, 1fr));',
  '@media (max-width: 640px) { .article-toc-unified__list { grid-template-columns: 1fr; } }',
  '<i class="bi bi-bookmark" aria-hidden="true"></i> 読書中',
  'border-radius: 10px;',
  '.tenmei-choice__option-detail { display: none; }',
  '.tenmei-choice__options { display: grid; max-height: 252px; gap: 1px;',
].forEach((text) => assert(html.includes(text), `モダンな読書・選択UIの契約が不足しています: ${text}`));

assert(!html.includes('READING NAVIGATION'), '旧式の英語ラベルを読書ナビゲーションに残してはいけません。');
assert(html.includes("toc.className = 'article-toc-unified mb-6';"), '記事目次の既存コンテナ契約を維持する必要があります。');
assert(html.includes("t.scrollIntoView({behavior:\\'smooth\\', block:\\'start\\'})"), '目次のスムーズスクロールを維持する必要があります。');

console.log('reading navigation and custom control UI regression passed');
