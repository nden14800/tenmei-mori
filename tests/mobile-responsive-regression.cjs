const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'mobile-responsive.css'), 'utf8');
const outputCss = fs.readFileSync(path.join(root, 'output.css'), 'utf8');

assert.ok(
  outputCss.startsWith('@import url("./mobile-responsive.css");'),
  '共通レスポンシブCSSが出力スタイルシートから読み込まれていません。'
);

[
  'box-sizing: border-box',
  'text-size-adjust: 100%',
  'max-width: 100%',
  '@media (max-width: 1366px)',
  '@media (max-width: 1024px)',
  '@media (max-width: 760px)',
  '@media (max-width: 430px)',
  '@media (max-width: 360px)',
  '@media (orientation: landscape) and (max-height: 500px)',
  '@media (prefers-reduced-motion: reduce)',
  'max-height: calc(100dvh - 1rem)',
  'overflow-x: auto',
  'min-height: 2.75rem',
  'font-size: 16px',
].forEach((rule) => {
  assert.ok(css.includes(rule), `共通レスポンシブ規則が不足しています: ${rule}`);
});

console.log('共通レスポンシブCSSの読み込み・基本ルール検査に合格しました。');
[
  '/* Ver.4 cross-screen hero parity: events + member pass.',
  'html body #view-events .events-hero,',
  'html body #view-auth .auth-passport-hero',
  'font-size: clamp(2rem, 4.1vw, 3rem) !important;',
  'font-weight: 900 !important;',
  'letter-spacing: .035em !important;',
  'linear-gradient(135deg, #fffdfa 0%, #fbf4ec 58%, #f3e7dc 100%) !important;',
  'html.dark body #view-events .events-hero,',
  'html.dark body #view-auth .auth-passport-hero',
  '@media (max-width: 760px)',
  '@media (max-width: 460px)',
].forEach((rule) => {
  assert.ok(css.includes(rule), 'イベント・参拝証ヒーローの共通デザイン規則が不足しています: ' + rule);
});
