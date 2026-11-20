#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('index.html');
const headers = read('_headers');
const translationModule = read('assets/js/static-translation.js');
const translationBuilder = read('scripts/build-static-translation-data.py');

for (const expected of [
  "const COOKIE_PREFERENCES_VERSION = 4",
  "const aiGuideState = { loaded: false, scriptRequested: false, generation: 0 }",
  "script.id = 'tenmei-ai-agent-script'",
  "script.src = '/assets/js/tenmei-ai-agent.js'",
  "天命乃杜独自のAI案内（Cloudflare Workers AI）",
  "質問文と直近最大10件の会話メッセージに加え、質問送信時のページタイトル",
]) assert.ok(html.includes(expected), '独自AIへの移行実装が不足しています: ' + expected);
for (const prohibited of ["CHATLING_CHATBOT_ID","window.chtlConfig","chatling.ai","Chatling AI Agent","Chatlingの標準ウィジェット","chtl-script","chtl-chat-iframe"]) {
  assert.ok(!html.toLowerCase().includes(prohibited.toLowerCase()), '旧外部AI実装がHTMLに残っています: ' + prohibited);
  assert.ok(!headers.toLowerCase().includes(prohibited.toLowerCase()), '旧外部AIのCSP許可が残っています: ' + prohibited);
}
assert.ok(!headers.includes('https://chatling.ai') && !headers.includes('https://embed.chatling.ai'), '旧外部AIのCSP許可が残っています');
assert.ok(headers.includes('https://*.cdninstagram.com'), '既存のInstagram画像許可が失われています');

for (const prohibited of [
  'https://*.channel.io',
  'https://*.channel.app',
  'https://*.sentry.io',
  'wss://*.channel.io',
  'wss://*.front-ws.channel.io',
  'https://*.sentry-cdn.com',
  'translate.google',
  'storage.googleapis.com',
  'Bergamot',
  'browsermt',
]) {
  assert.ok(!headers.includes(prohibited), `CSPに不要な許可が残っています: ${prohibited}`);
  assert.ok(!html.includes(prohibited), `HTMLに不要な旧方式の参照が残っています: ${prohibited}`);
  assert.ok(!translationModule.includes(prohibited), `翻訳モジュールに不要な旧方式の参照が残っています: ${prohibited}`);
}

const directory = path.join(root, 'assets', 'data', 'static-translations');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1, '静的翻訳マニフェストのスキーマが不正です');
assert.equal(manifest.generationVersion, 2, '品質改善済み辞書の生成版が不正です');
assert.ok(Number.isInteger(manifest.entryCount) && manifest.entryCount > 3000, '翻訳元エントリ数が不正です');
assert.deepEqual(manifest.languages, ['en', 'ko', 'zh', 'zh_hant', 'fr', 'de', 'es', 'pt', 'vi', 'id', 'th'], '対象言語が不足しています');

for (const language of manifest.languages) {
  const dictionary = JSON.parse(fs.readFileSync(path.join(directory, `${language}.json`), 'utf8'));
  assert.equal(dictionary.schemaVersion, 1, `${language}辞書のスキーマが不正です`);
  assert.equal(dictionary.generationVersion, 2, `${language}辞書に品質改善版の印がありません`);
  assert.equal(Object.keys(dictionary.translations).length, manifest.entryCount, `${language}辞書のエントリ数が不正です`);
}

const curated = JSON.parse(read('assets/data/static-translations/curated.json'));
assert.equal(curated.schemaVersion, 1, 'ChatGPT翻訳辞書のスキーマが不正です');
assert.deepEqual(Object.keys(curated.languages).sort(), [...manifest.languages].sort(), 'ChatGPT翻訳辞書の対象言語が一致しません');
const curatedKeys = Object.keys(curated.languages.en);
assert.ok(curatedKeys.length >= 20, 'ChatGPT翻訳辞書の基本UI翻訳が不足しています');
for (const language of manifest.languages) {
  assert.deepEqual(Object.keys(curated.languages[language]).sort(), [...curatedKeys].sort(), `${language}のChatGPT翻訳キーが一致しません`);
  assert.ok(Object.values(curated.languages[language]).every((value) => typeof value === 'string' && value.trim()), `${language}のChatGPT翻訳に空欄があります`);
}
assert.equal(curated.languages.en['おみくじ'], 'Omikuji');
assert.equal(curated.languages.en['ログイン'], 'Log in');
assert.equal(curated.languages.ko['ログイン'], '로그인');
assert.equal(curated.languages.zh_hant['プライバシーポリシー'], '隱私權政策');
assert.ok(translationModule.includes('curated.json'), 'ChatGPT翻訳辞書がランタイムで読み込まれていません');
assert.ok(translationModule.includes('Object.assign({}, legacyTranslations, curatedTranslations)'), 'ChatGPT翻訳が旧辞書より優先されていません');
assert.ok(translationBuilder.includes('def apply_english_overrides'), '英語の品質修正が辞書生成処理に組み込まれていません');
assert.ok(translationBuilder.includes('apply_english_overrides(translate_mapping('), '英語辞書の再生成時に品質修正が適用されません');
assert.ok(translationBuilder.includes("'curatedGenerationVersion'"), '辞書再生成時にChatGPT翻訳の版情報が維持されません');

const english = JSON.parse(fs.readFileSync(path.join(directory, 'en.json'), 'utf8')).translations;
for (const [source, expected] of Object.entries({
  'アクセシビリティ': 'Accessibility',
  'コンテンツ': 'Content',
  '会員登録': 'Sign up',
  '本文へ移動': 'Skip to content',
  '集計中...': 'Calculating…',
  '難航する': 'Encounter difficulties',
  '養生せよ': 'Take care of your health',
})) {
  assert.equal(english[source], expected, `英語辞書の誤訳・汎用置換が残っています: ${source}`);
}
assert.ok(!Object.values(english).includes('Contact Us'), '英語辞書に汎用的な誤訳 Contact Us が残っています');
assert.ok(!Object.values(english).includes('Click here for more information.'), '英語辞書に文脈を失った汎用リンク文が残っています');
assert.equal(manifest.generation.mode, 'static-dictionary-with-chatgpt-curated-overrides', '翻訳マニフェストが旧Argos方式へ巻き戻っています');
assert.equal(manifest.curatedEntryCount, curatedKeys.length, '翻訳マニフェストのChatGPT翻訳件数が一致しません');
for (const expectedLabel of ['Tenmei no Mori', 'Omikuji History', 'Pilgrimage Certificate', 'Shrine Office News', 'Omikuji Journal']) {
  assert.ok(Object.values(english).some((value) => value.includes(expectedLabel)), `英語辞書に用語表ラベルがありません: ${expectedLabel}`);
}

for (const expected of [
  '12. 天命乃杜独自のAI案内（Cloudflare Workers AI）',
  '送信される情報：利用者が入力した質問、直近最大10件の会話メッセージ、質問送信時のページタイトル',
  '当サイトはAI案内の会話履歴をデータベース、アカウント、ブラウザー内ストレージへ保存しません',
  'AI案内はアカウント操作、データ変更、有人対応、運営者への転送を行いません',
]) {
  assert.ok(html.includes(expected), `独自AIの公開説明が不足しています: ${expected}`);
}

const archive = JSON.parse(read('assets/data/public-document-history.json'));
assert.equal(archive.schemaVersion, 1, '公開文書旧版アーカイブのスキーマが不正です');
assert.ok(archive.documents || archive.about || archive.privacy, '公開文書旧版アーカイブが空です');
const archivedAbout = archive.documents?.about?.versions || archive.about?.versions || [];
const archivedPrivacy = archive.documents?.privacy?.versions || archive.privacy?.versions || [];
assert.ok(archivedAbout.some((version) => version.edition === 22 && version.html?.includes('view-about')), '公開文書旧版アーカイブに改定前の当サイトについて第22版がありません');
assert.ok(archivedPrivacy.some((version) => version.edition === 22), '公開文書旧版アーカイブに改定前のプライバシーポリシー第22版がありません');
assert.ok(archivedPrivacy.some((version) => version.edition === 23 && version.html?.includes('view-privacy')), '公開文書旧版アーカイブに改定前のプライバシーポリシー第23版がありません');
assert.ok(archivedPrivacy.some((version) => version.edition === 24 && version.html?.includes('view-privacy')), '公開文書旧版アーカイブに改定前のプライバシーポリシー第24版がありません');
assert.ok(html.includes("container.querySelectorAll('.view-section').forEach((element) => element.setAttribute('data-document-history-source-view', ''));"), '旧版プレビューのview-sectionへ表示用属性を付与する必要があります');
assert.ok(html.includes('.document-history-preview [data-document-history-source-view] { display: block !important;'), '旧版プレビューの表示用属性に非表示解除CSSが必要です');

for (const expected of [
  'id="nav-settings"',
  'id="view-settings"',
  "showView('settings')",
  'data-settings-sync-root',
  'function syncPreferenceControls',
  "AppConfig.toggle('theme','system')",
  "AppConfig.toggle('speed', this.checked)",
  "AppConfig.toggle('sidebarButton', this.checked)",
  "AppConfig.toggle('tabTitle', this.checked)",
  "AppConfig.toggle('fontSize','md')",
  "AppConfig.toggle('lineHeight','normal')",
  "AppConfig.toggle('bodyFont','serif')",
  "AppConfig.toggle('contentWidth','standard')",
  "AppConfig.toggle('reduceMotion', this.checked)",
  '14の機能案内と、環境・表示設定をご用意しています。',
  '<span class="howto-guide-entry-number">13</span>',
  '<span class="howto-guide-entry-number">14</span>',
  'SERVICE STATUS',
  'タイムゾーンを選ぶ',
  ':is(#view-howto, #view-settings, #cookie-preferences-dialog) .howto-guide-switch {',
  ":is(#view-howto, #view-settings, #cookie-preferences-dialog) .howto-guide-switch-state::before { content: 'OFF'; }",
  ":is(#view-howto, #view-settings, #cookie-preferences-dialog) .howto-guide-switch input:checked ~ .howto-guide-switch-state::before { content: 'ON'; }",
  'id="nav-language"',
  'onclick="openTranslationPanel()"',
  '表示言語</span>',
  'href="#translation-dialog" onclick="event.preventDefault(); openTranslationPanel();"',
  'bottom: calc(96px + env(safe-area-inset-bottom, 0px));',
  '#cookie-banner, #cookie-preferences-dialog, #time-zone-dialog, #translation-dialog, #document-history-dialog',
  'href="https://tenmei-mori-status.pages.dev"',
  'aria-label="サービス状況を別サイトで開く"',
  'メインサイトとは別に配信する状態確認サイトを開けます。',
  '#cookie-preferences-dialog { --howto-red: #9a2830; --howto-red-deep: #731e24; --howto-muted: #6d5c55; }',
  '状態確認のために、利用者の入力内容・おみくじ履歴・AI相談内容を送信しません。',
  'ログイン中は、環境・表示設定をアカウント単位で同期するため',
]) {
  assert.ok(html.includes(expected), `設定導線または公開文書の実装が不足しています: ${expected}`);
}

console.log(JSON.stringify({
  status: 'ok',
  languages: manifest.languages.length,
  entryCount: manifest.entryCount,
  translationBytes: manifest.languages.reduce((sum, language) => sum + fs.statSync(path.join(directory, `${language}.json`)).size, 0),
}, null, 2));
