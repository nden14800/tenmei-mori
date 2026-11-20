#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const directory = path.join(root, 'assets/data/static-translations');
const manifest = JSON.parse(read('assets/data/static-translations/manifest.json'));
const curated = JSON.parse(read('assets/data/static-translations/curated.json'));
const translationModule = read('assets/js/static-translation.js');
const translationBuilder = read('scripts/build-static-translation-data.py');
const languages = ['en', 'ko', 'zh', 'zh_hant', 'fr', 'de', 'es', 'pt', 'vi', 'id', 'th'];

assert.equal(manifest.generation.mode, 'chatgpt-authored-only');
assert.equal(manifest.curatedFile, 'curated.json');
assert.equal(manifest.curatedGenerationVersion, 29);
assert.equal(manifest.curatedEntryCount, Object.keys(curated.languages.en).length);
assert.deepEqual(manifest.languages, languages);
assert.equal(manifest.entryCount, 3378);
assert.deepEqual(Object.keys(curated.languages).sort(), [...languages].sort());

const curatedKeys = Object.keys(curated.languages.en).sort();
assert.equal(curatedKeys.length, 1092);
for (const language of languages) {
  const dictionary = JSON.parse(read(`assets/data/static-translations/${language}.json`));
  assert.equal(Object.keys(dictionary.translations).length, manifest.entryCount);
  assert.deepEqual(Object.keys(curated.languages[language]).sort(), curatedKeys);
  assert.ok(Object.values(curated.languages[language]).every((value) => typeof value === 'string' && value.trim()));
  assert.ok(Object.values(curated.languages[language]).every((value) => typeof value === 'string' && value.trim()), `${language} has an empty ChatGPT translation`);
  assert.equal(manifest.sizes[language], Buffer.byteLength(read(`assets/data/static-translations/${language}.json`), 'utf8'));
}

const english = curated.languages.en;
for (const [source, expected] of Object.entries({
  'アクセシビリティ': 'Accessibility',
  'コンテンツ': 'Content',
  '会員登録': 'Sign up',
  '本文へ移動': 'Skip to content',
  '集計中...': 'Calculating…',
  '難航する': 'Encounter difficulties',
  '養生せよ': 'Take care of your health',
})) {
  assert.equal(english[source], expected, `Known English translation error remains: ${source}`);
}
assert.ok(!Object.values(english).includes('Contact Us'));
assert.ok(!Object.values(english).includes('Click here for more information.'));
assert.ok(translationModule.includes('curated.json'));
assert.ok(translationModule.includes('loadCuratedDictionary().then((curated) =>'));
assert.ok(!translationModule.includes('legacyTranslations'));
assert.ok(!translationModule.includes('fetch(`/assets/data/static-translations/${language}.json`'));
assert.ok(translationModule.includes('まだ翻訳が用意されていない項目は'));
assert.ok(!translationModule.includes('従来の機械翻訳辞書で補完します'));
assert.ok(translationModule.includes('ChatGPT作成の翻訳がない項目は日本語のまま表示されます'));
assert.ok(translationModule.includes('if (translatedValue !== normalized) translated += 1;'));
assert.ok(translationBuilder.includes('chatgpt-authored-only'));
assert.ok(translationBuilder.includes('Only reviewed ChatGPT-authored entries'));
assert.ok(!translationBuilder.includes('argostranslate'));
assert.ok(!translationBuilder.includes('OpenCC'));
assert.ok(!translationBuilder.includes('translate_mapping'));
assert.ok(translationBuilder.includes('curated.json'));

console.log(JSON.stringify({
  status: 'ok',
  languages: languages.length,
  totalKeysPerLanguage: manifest.entryCount,
  chatgptOnlyKeys: manifest.curatedEntryCount,
  chatgptOnlyCoveragePercent: Number((manifest.curatedEntryCount / manifest.entryCount * 100).toFixed(1)),
  untranslatedKeysPerLanguage: manifest.entryCount - manifest.curatedEntryCount,
  englishGenericFallbacks: 0,
}, null, 2));
