const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

[
  "window.buildArticleTOC = function()",
  "toc.className = 'article-toc-unified mb-6';",
  "data-toc-target",
  "article-toc-unified__mobile-toggle",
  "data-toc-open",
  "position: sticky;",
  "top: 84px;",
  "IntersectionObserver",
  "aria-current",
  "prefers-reduced-motion: reduce",
  "t.scrollIntoView({behavior:'smooth', block:'start'})",
].forEach((text) => {
  assert(html.includes(text), `Phase 5 article reading UI contract is missing: ${text}`);
});

// Phase 5 must extend the existing buildArticleTOC implementation in its existing script.
// It must never introduce the nested-script failure that previously rendered JavaScript as page text.
assert(!html.includes('tenmei-safe-article-reading-phase5'), 'The failed nested-script wrapper must not return.');
assert(!html.includes('tenmei-article-reading-phase5'), 'The failed standalone Phase 5 script must not return.');

const tocFnIndex = html.indexOf('window.buildArticleTOC = function()');
assert(tocFnIndex > 0, 'buildArticleTOC implementation not found.');
const precedingScript = html.lastIndexOf('<script', tocFnIndex);
const precedingStyle = html.lastIndexOf('<style', tocFnIndex);
assert(precedingScript > precedingStyle, 'buildArticleTOC must remain inside the existing JavaScript block.');
assert(html.indexOf('</script>', tocFnIndex) > tocFnIndex, 'The existing JavaScript block must close after buildArticleTOC.');

const progressCall = html.indexOf('buildArticleTOC();');
const readingProgressCall = html.indexOf('startReadingProgress(readingMeta);');
assert(progressCall >= 0 && readingProgressCall > progressCall, 'Reading progress must still start after TOC generation.');

console.log('Phase 5 article reading UI regression: OK');
