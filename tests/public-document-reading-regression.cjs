const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

[
  'data-setting="publicDocumentReading"',
  "AppConfig.toggle('publicDocumentReading', true)",
  "AppConfig.toggle('publicDocumentReading', false)",
  'tenmei-public-document-reading-complete-fix',
  'html.public-document-reading-content-width-custom:not(.public-document-reading-disabled)',
  ':is(#view-about, #view-privacy, #view-howto)',
  'data-reading-settings-inline',
  'AppConfig.__tenmeiPublicReadingHook',
  "key === 'publicDocumentReading'",
  'refreshPublicDocumentReading',
  "typeof AppConfig === 'undefined' || !AppConfig || typeof AppConfig.toggle !== 'function'",
].forEach((text) => assert(html.includes(text), `公開文書の読書設定契約がありません: ${text}`));

const readingSettingControl = '<div class="theme-select-group opt-select-group howto-guide-option-group" data-setting="publicDocumentReading"';
assert.equal(html.split(readingSettingControl).length - 1, 1,
  '公開文書の読書設定UIは正本の環境・表示設定に1つだけ配置してください。');
const trueControl = "data-value=\"true\" onclick=\"AppConfig.toggle('publicDocumentReading', true)\"";
const falseControl = "data-value=\"false\" onclick=\"AppConfig.toggle('publicDocumentReading', false)\"";
assert.equal(html.split(trueControl).length - 1, 1);
assert.equal(html.split(falseControl).length - 1, 1);
const settingsStart = html.indexOf('<section id="view-settings"');
const settingsEnd = html.indexOf('<section id="view-howto"', settingsStart);
const howtoStart = settingsEnd;
const howtoEnd = html.indexOf('<section id="view-status"', howtoStart);
const settingsSection = settingsStart >= 0 && settingsEnd > settingsStart ? html.slice(settingsStart, settingsEnd) : '';
const howtoSection = howtoStart >= 0 && howtoEnd > howtoStart ? html.slice(howtoStart, howtoEnd) : '';
assert(settingsSection.includes('data-setting="publicDocumentReading"'), '読書設定の操作UIが正本の環境・表示設定にありません。');
assert(!howtoSection.includes('data-setting="publicDocumentReading"') && !howtoSection.includes("AppConfig.toggle('publicDocumentReading'"),
  '使い方ページに設定変更UIが重複しています。');
assert(html.includes("group.dataset.value = String(enabled)"), '公開文書の適用状態がセグメントコントロールへ同期されません。');
console.log('公開文書の読書設定回帰テストに合格しました。');

assert(html.includes('public-document-reading-font-size-custom'), '文字サイズの公開文書向け適用クラスがありません。');
assert(html.includes('public-document-reading-line-height-custom'), '行間の公開文書向け適用クラスがありません。');
assert(html.includes('public-document-reading-body-font-custom'), '書体の公開文書向け適用クラスがありません。');
assert(html.includes('public-document-reading-content-width-custom'), '本文幅の公開文書向け適用クラスがありません。');
assert(html.includes('public-document-reading-font-size-custom:not(.public-document-reading-disabled) #view-about .about-codex-chapter>div:not(.about-codex-chapter-head)'), '当サイトについての章本文に文字サイズ設定が適用されません。');
assert(html.includes('public-document-reading-line-height-custom:not(.public-document-reading-disabled) #view-about .about-codex-chapter>div:not(.about-codex-chapter-head)'), '当サイトについての章本文に行間設定が適用されません。');
assert(html.includes('public-document-reading-body-font-custom:not(.public-document-reading-disabled) #view-about .about-codex-chapter>div:not(.about-codex-chapter-head)'), '当サイトについての章本文に書体設定が適用されません。');
assert(html.includes('<section id="view-settings"') && html.includes('公開文書への読書設定') && html.includes('settings-public-documents-heading'), '環境・表示設定の正本画面に公開文書読書設定がありません。');

assert(!html.includes("if (!window.AppConfig || typeof window.AppConfig.toggle !== 'function')"), 'AppConfig は window プロパティではないため、読書設定フックはトップレベルの AppConfig を参照する必要があります。');
