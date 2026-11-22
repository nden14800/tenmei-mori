const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const privacySection = html.match(
  /<section id="view-privacy"[\s\S]*?<\/section>\s*<!-- サイトフッター/
)?.[0] || '';

assert(privacySection, 'プライバシーポリシー画面のセクションを抽出できません。');
const externalServicesSection = privacySection.match(
  /<h3[^>]*>[\s\S]*?第5条（外部サービスとの連携とデータ移転）[\s\S]*?<\/h3>([\s\S]*?)<h3[^>]*>[\s\S]*?第6条（個人情報の第三者提供）/
)?.[1] || '';
assert(externalServicesSection, '第5条の外部サービス開示範囲を抽出できません。');

function requireText(text, message) {
  assert(html.includes(text), message);
}

function requireSectionText(text, message) {
  assert(privacySection.includes(text), message);
}

requireText(
  '<section id="view-privacy" class="view-section privacy-ledger-layout" aria-labelledby="privacy-page-title">',
  'プライバシーポリシー画面が新しいprivacy-ledger-layoutテンプレートとして定義されていません。'
);
requireSectionText('class="privacy-ledger-hero"', 'プライバシーポリシー画面に規程書ヒーローがありません。');
requireSectionText(
  'class="privacy-ledger-guide" aria-labelledby="privacy-guide-heading"',
  'プライバシーポリシー画面に規程の閲覧ガイドがありません。'
);
requireSectionText(
  'id="privacy-toc-container" class="privacy-ledger-toc hidden" aria-labelledby="privacy-toc-heading"',
  'プライバシーポリシー画面の動的目次コンテナが新テンプレートに保持されていません。'
);
requireSectionText('id="privacy-toc-list"', 'プライバシーポリシー画面の動的目次リストIDが保持されていません。');
const revisionOptionsMatch = privacySection.match(/data-control-id="privacy-revision-select"[^>]*data-options='([^']+)'/);
assert(revisionOptionsMatch, 'プライバシー第9条の版選択肢が定義されていません。');
const revisionEditions = JSON.parse(revisionOptionsMatch[1]).map((option) => Number(option.value));
[36,35,34,33,32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3].forEach((edition) => assert(revisionEditions.includes(edition), `プライバシー第${edition}版の選択肢がありません。`));
assert(revisionEditions.includes(15), 'プライバシー第15版の欠番・記録なし表示が選択肢にありません。');
assert(privacySection.includes('第15版</span>') || privacySection.includes('第15版'), 'プライバシー第15版の明示がHTMLにありません。');
assert(html.includes('.dark .document-revision-selector{'), 'REVISION HISTORYのダークモードCSSがありません。');
assert(html.includes('.dark .document-revision-description{'), 'REVISION HISTORY説明欄のダークモードCSSがありません。');
requireSectionText(
  'id="privacy-content-area" class="privacy-ledger-content" aria-labelledby="privacy-articles-heading"',
  'プライバシーポリシー画面のPDF対象本文IDが新テンプレートに保持されていません。'
);
requireSectionText('id="privacy-pdf-btn"', 'プライバシーポリシー画面のPDF保存ボタンIDが保持されていません。');
requireSectionText(
  "onclick=\"downloadAsPDF('privacy')\"",
  'プライバシーポリシー画面のPDF保存ボタンの既存処理接続が失われています。'
);
assert.equal(
  privacySection.includes('現行版（第34版）の本文です。'),
  false,
  '現行の第33版本文に古い第32版ラベルが残っています。'
);
assert.equal(
  privacySection.includes('privacy-hero-card'),
  false,
  'プライバシーポリシー画面に置換前のprivacy-hero-card構造が残っています。'
);

[
  '制定: 2026/01/02 ・ 改定: 2026/11/22 (第36版) ・ 運営: nden148',
  '第1条（定義）',
  '第2条（収集する個人情報および収集方法）',
  '第3条（個人情報の利用目的）',
  '第4条（個人情報の安全管理措置）',
  '第5条（外部サービスとの連携とデータ移転）',
  '第6条（個人情報の第三者提供）',
  '第7条（クッキー(Cookie)およびローカルストレージ）',
  '第8条（個人情報の開示・訂正・削除）',
  '第9条（プライバシーポリシーの変更・改定履歴）',
  '第10条（免責事項）',
  '第11条（連絡方法と個別対応の制限）',
  '利用者が環境・表示設定または初回表示の選択カードで同意した場合に限り、Google Analytics および Microsoft Clarity によるアクセス解析を行い、閲覧・操作傾向をサービス改善に役立てるため（解析情報は単独で直接個人を特定することを目的としません）',
  'Googleアカウントの表示名（Googleアカウントでのログインを利用する場合のみ。初期ユーザー名の候補として使用する場合があります）',
  'Cookieおよび疑似匿名ID、マウス操作・タップ操作の軌跡、クリック位置、スクロール深度、ページ閲覧情報、端末・ブラウザ情報',
  'AI夢占いの夢の本文および生成解釈を含む夢の記録（dream_history）',
  'AI要約への評価・コメント記録（summary_feedback）',
  'サービス運営上必要な確認・対応を行うため（個別の問い合わせ対応・返信を保証するものではありません）',
  '現行版：第36版（最終改定日：2026年11月22日）',
  '現行版（第36版）の本文です。',
  '4. 下の選択欄から版を選ぶと、その版について確認できた実際の改定内容を表示します。本文スナップショットを確認できない版については、推測で内容を補いません。',
  'アカウント削除後のデータ復旧は一切できません。',
].forEach((text) => {
  requireSectionText(text, `プライバシーポリシー第18版の本文または開示が失われています: ${text}`);
});

assert.equal(
  (privacySection.match(/<h3\b/g) || []).length,
  11,
  'プライバシーポリシーの条見出しh3が11件ではありません。'
);
assert.equal(
  (externalServicesSection.match(/<p class="font-bold text-sm">(?:1[0-4]|[1-9])\./g) || []).length,
  14,
  '外部サービス14件の開示カードが保持されていません。'
);
assert.equal(
  (privacySection.match(/<p class="font-bold text-sm">(?:1[0-4]|[1-9])\./g) || []).length,
  14,
  '外部サービス開示が規程書外へ重複して漏れています。'
);
assert.equal(
  privacySection.includes('</section>">3. Turso (ChiselStrike, Inc.)</p>'),
  false,
  '規程書終了後に不要なタグ断片が残っています。'
);
assert.equal(
  (externalServicesSection.match(/target="_blank" rel="noopener noreferrer"/g) || []).length,
  18,
  '外部サービス開示の安全な新規タブリンク18件が保持されていません（第36版: Argos Translate・OpenCCの2件を削除、unpkgの1件を追加）。'
);

[
  'https://maileroo.com/legal/privacy-policy',
  'https://maileroo.com/legal/data-processing-addendum',
  'https://maileroo.com/trust-center',
  'https://www.cloudflare.com/privacypolicy/',
  'https://turso.tech/privacy-policy',
  'https://policies.google.com/privacy',
  'https://privacy.microsoft.com/ja-jp/privacystatement',
  'https://wiki.osmfoundation.org/wiki/Privacy_Policy',
  'https://discord.com/privacy',
  'https://www.jsdelivr.com/terms/privacy-policy',
].forEach((href) => {
  requireSectionText(href, `プライバシーポリシーの外部サービスリンクが失われています: ${href}`);
});

[
  '.privacy-ledger-layout {',
  '.dark .privacy-ledger-layout {',
  '@media (prefers-color-scheme: dark) {\n    html:not(.light) .privacy-ledger-layout {',
  '#view-privacy #privacy-pdf-btn:focus-visible,',
  '#view-privacy.printing .privacy-ledger-hero {',
  '#view-privacy.printing .privacy-ledger-article > div {',
  '#view-privacy.printing .privacy-ledger-article > div:last-child {',
  'break-before: page !important;',
  'page-break-before: always !important;',
  '#view-privacy.printing .privacy-ledger-article { overflow: visible !important; }',
  'privacy-ledger-hero h1',
].forEach((text) => {
  requireText(text, `プライバシーポリシー画面のテーマ・フォーカス・PDF出力契約が失われています: ${text}`);
});

// Consent revocation must stop further analytics collection after a user changes the setting to OFF.
const analyticsRuntimeStart = html.indexOf('function loadOptionalAnalytics()');
const analyticsRuntimeEnd = html.indexOf('function removeStorageKeys', analyticsRuntimeStart);
assert(analyticsRuntimeStart >= 0 && analyticsRuntimeEnd > analyticsRuntimeStart, '解析同意処理のソース範囲を確認できません。');
const analyticsRuntime = html.slice(analyticsRuntimeStart, analyticsRuntimeEnd);
const consentBootstrapStart = html.indexOf('function ensureAnalyticsConsentDefault()');
const consentBootstrapEnd = html.indexOf('function loadOptionalAnalytics()', consentBootstrapStart);
assert(consentBootstrapStart >= 0 && consentBootstrapEnd > consentBootstrapStart, '解析同意の初期化処理を確認できません。');
const consentBootstrap = html.slice(consentBootstrapStart, consentBootstrapEnd);
assert.match(consentBootstrap, /command === 'consent'[\s\S]*?preferences\.analytics === true/, 'Google Analytics commands must be gated after consent is revoked.');
assert.match(analyticsRuntime, /function sendClarityConsent\(granted\)/, 'Clarity consent signal helper is missing.');
assert.match(analyticsRuntime, /consentv2[\s\S]*?ad_Storage:[\s\S]*?analytics_Storage:/, 'Clarity must receive an explicit Consent V2 signal.');
assert.match(analyticsRuntime, /if \(granted\) window\.clarity\('consent'\);[\s\S]*?else window\.clarity\('consent', false\)/, 'Clarity must resume on consent and stop tracking when consent is revoked.');
assert.match(analyticsRuntime, /function stopOptionalAnalytics\(\)/, 'Analytics revocation handler is missing.');
assert.match(analyticsRuntime, /analytics_storage: 'denied'[\s\S]*?sendClarityConsent\(false\)/, 'Revoking analytics must deny Google and Clarity consent.');
assert.match(analyticsRuntime, /__tenmeiGoogleAnalyticsLoaded[\s\S]*?__tenmeiClarityLoaded/, 'Analytics scripts must distinguish pending scripts from loaded SDKs.');
const savePreferencesStart = html.indexOf('function savePreferences(');
const savePreferencesEnd = html.indexOf('// UX計測は', savePreferencesStart);
const savePreferencesSource = html.slice(savePreferencesStart, savePreferencesEnd);
assert.match(savePreferencesSource, /if \(normalized\.analytics\) loadOptionalAnalytics\(\);[\s\S]*?else stopOptionalAnalytics\(\);/, 'Turning analytics OFF must call stopOptionalAnalytics.');
assert.match(html, /stopOptionalAnalytics,\s*loadOptionalSupportChat/, 'The cookie consent controller must expose the stop handler for consistent settings behavior.');

console.log('プライバシーポリシー画面の回帰テストに合格しました。');
console.log(JSON.stringify({
  privacyLedgerTemplate: true,
  policyVersion18Preserved: true,
  articleTextPreserved: true,
  thirdPartyDisclosuresPreserved: true,
  deletionDisclosurePreserved: true,
  tocContractPreserved: true,
  pdfContractPreserved: true,
  themeRulesPresent: true,
  printRulesPresent: true,
  visibleFocusPresent: true,
}, null, 2));

// 公開文書手動アーカイブの正本性・スナップショット契約
const archivePath = path.resolve(__dirname, '..', 'assets', 'data', 'public-document-history.json');
const archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
for (const documentKey of ['about', 'privacy']) {
  const document = archive.documents[documentKey];
  assert(document && document.current, documentKey + 'のcurrentメタデータがありません。');
  const editions = document.versions.map((version) => version.edition);
  assert.equal(new Set(editions).size, editions.length, documentKey + 'の版番号が重複しています。');
  assert(editions.includes(Number(document.current.edition)), documentKey + 'の現行版が版一覧に収録されていません。');
  const currentVersion = document.versions.find((version) => version.edition === Number(document.current.edition));
  assert(currentVersion, documentKey + 'の現行版アーカイブがありません。');
  assert(currentVersion.availability === 'full', documentKey + 'の現行版がfullとして記録されていません。');
  assert(currentVersion.html && currentVersion.html.trim(), documentKey + 'の現行版本文スナップショットがありません。');
  if (documentKey === 'privacy') {
    assert.equal(document.current.edition, 36, 'プライバシーポリシーの現行版メタデータが第36版ではありません。');
    assert.equal(document.current.revisedLabel, '2026/11/22 (第36版)', 'プライバシーポリシーの現行改定日が一致しません。');
    assert(currentVersion.html.includes('現行版（第36版）の本文です。'), 'プライバシーポリシー第36版の本文ラベルが現行版と一致しません。');
    assert(!currentVersion.html.includes('現行版（第32版）の本文です。'), 'プライバシーポリシー第36版のアーカイブに古い第32版ラベルが残っています。');
  }
  assert(currentVersion.changeDescription && currentVersion.changeDescription.trim(), documentKey + 'の現行版改定内容がありません。');
  document.versions.forEach((version) => {
    if (version.availability === 'missing' || version.availability === 'metadata-only') {
      assert(!version.html || !version.html.trim(), documentKey + '第' + version.edition + '版は未記録扱いなのに本文HTMLがあります。');
      assert(version.changeDescription && version.changeDescription.trim(), documentKey + '第' + version.edition + '版の確認済み情報がありません。');
    } else {
      assert(version.html && version.html.trim(), documentKey + '第' + version.edition + '版の本文スナップショットがありません。');
      assert(version.changeDescription && version.changeDescription.trim(), documentKey + '第' + version.edition + '版の改定内容がありません。');
    }
  });
}
assert.equal(archive.documents.about.versions.find((version) => version.edition === 24).html, '', '当サイトについて第24版の未記録本文をHTMLで擬似再現してはいけません。');
assert.equal(archive.documents.privacy.versions.find((version) => version.edition === 15).availability, 'missing', 'プライバシー第15版は欠番・記録なしとして保持します。');
assert.equal(archive.documents.about.versions[0].edition, 28, '当サイトについての現行版がアーカイブ先頭にありません。');
assert.equal(archive.documents.about.current.edition, 28, '当サイトについての現行版メタデータが第28版ではありません。');
assert.ok(archive.documents.about.versions[0].html.includes('直近最大10件の会話メッセージ'), '第28版アーカイブにAI案内の画面情報・会話範囲がありません。');
assert.equal(archive.source.lastReviewedAt, '2026-11-22', '公開文書アーカイブの確認日が更新されていません。');
assert.equal(archive.documents.privacy.versions[0].edition, 36, 'プライバシーポリシーの現行版がアーカイブ先頭にありません。');
assert.match(archive.documents.privacy.versions[0].changeDescription, /unpkg/);
assert.ok(archive.documents.privacy.versions[0].html.includes('12. 天命乃杜独自のAI案内'), '第36版アーカイブにAI案内の開示がありません。');
assert.ok(archive.documents.privacy.versions[0].html.includes('直近最大10件の会話メッセージ'), '第36版アーカイブにAI案内の画面情報・会話範囲がありません。');
assert.ok(privacySection.includes('<input type="hidden" id="privacy-revision-select" value="36">'), '改定履歴の初期選択が現行版36になっていません。');
assert.ok(privacySection.includes('<strong>第36版 ・ 2026/11/22 ・ 現行版</strong>'), '改定履歴の初期説明が現行版36になっていません。');
assert.ok(privacySection.includes('第36版の本文スナップショットを読み込みます。'), '改定履歴の初期スナップショット表示が現行版36になっていません。');
assert.ok(privacySection.includes('HttpOnly属性により、JavaScriptからCookie値を読み取ることはできません。'), 'HttpOnlyセッションCookieの説明がありません。');
assert.ok(privacySection.includes('最大14日') && privacySection.includes('最大30日'), 'Mailerooの公表保持期間が最新情報に更新されていません。');
assert.ok(privacySection.includes('関連するすべての処理がEU内だけで完結することを意味しません。'), 'Mailerooのサブプロセッサーによる補助処理の範囲が明示されていません。');
assert.ok(privacySection.includes('期限はデータベース上の削除期限を意味しません。'), 'Tursoのレート制限データの期限と物理削除が区別されていません。');
assert.ok(privacySection.includes('10. CDN配信の静的ライブラリ（jsDelivr／cdnjs／unpkg／Google Fonts 等）'), '外部CDNの項目にunpkgが記載されていません。');
assert.ok(privacySection.includes('leaflet-gesture-handling') && privacySection.includes('専用のプライバシーポリシーは確認できておらず'), 'unpkgの利用目的と、公式方針を確認できていない旨が記載されていません。');
assert.ok(privacySection.includes('14. 軽量な自己配信多言語表示（事前作成の翻訳辞書）'), '多言語表示の項目が現行の運用に更新されていません。');
assert.ok(privacySection.includes('ChatGPTを用いて作成した翻訳') && privacySection.includes('辞書に収録されていない項目は日本語のまま表示されます。'), 'ChatGPT作成の翻訳辞書と未収録項目の表示が記載されていません。');
assert.equal(/Argos|OpenCC|自動生成します/.test(privacySection.match(/14\. 軽量な自己配信多言語表示[\s\S]*?<\/div>/)?.[0] || ''), false, '多言語表示の項目に廃止済みの翻訳エンジンの記載が残っています。');
assert(fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8').includes('本文スナップショット未記録'), '未記録版の正直なスナップショット表示がありません。');
assert(html.includes('class="document-revision-snapshot__details"'), '本文スナップショットが開閉可能なdetailsになっていません。');
assert(html.includes('class="document-revision-snapshot__summary"'), '本文スナップショットの開閉見出しがありません。');
assert(html.includes('bi bi-chevron-down document-revision-snapshot__chevron'), '本文スナップショットの開閉アイコンがサイト共通のBootstrap Iconsになっていません。');
assert(html.includes('.document-revision-snapshot__details[open] .document-revision-snapshot__chevron'), '本文スナップショットの開閉状態とアイコン表示が連動していません。');
assert(!html.includes('<details class="document-revision-snapshot__details" open>'), '本文スナップショットは初期状態で開いてはいけません。');
assert(html.includes('第28版の本文スナップショットを読み込みます。'), '当サイトについての初期スナップショット表示が現行第28版と一致しません。');
assert(html.includes('第36版の本文スナップショットを読み込みます。'), 'プライバシーポリシーの初期スナップショット表示が現行第36版と一致しません。');
assert(!html.includes('第24版の本文スナップショットは保存されていません。'), '初期表示に別版のスナップショット状態が残っています。');
assert(!html.includes('第32版の本文スナップショットを読み込みます。'), '初期表示に旧版のスナップショット読み込み表示が残っています。');
// 改定履歴スナップショット内の旧カスタム選択欄が本体側コントロールを壊さないことを保証する。
assert(html.includes("const CURRENT={about:{edition:'28',date:'2026/11/22'},privacy:{edition:'36',date:'2026/11/22'}}"), '公開文書のフォールバック版番号が現行の当サイトについて第28版・プライバシーポリシー第36版と一致しません。');
assert(html.includes('snapshot.querySelectorAll') && html.includes('[data-control-id], [data-control-kind="choice"], [data-control-kind="date"], .tenmei-choice'), '過去版スナップショット内の新旧カスタム選択欄を静的表示へ変換していません。');
assert(html.includes('document-revision-static-control'), '過去版の選択欄を表示専用にするスタイルがありません。');
assert(html.includes("if(/^on/i.test(attribute.name))element.removeAttribute(attribute.name);"), '過去版スナップショットのインライン操作を無効化していません。');
const homeStart = html.indexOf('<section id="view-home"');
const homeEnd = html.indexOf('<section id="view-omikuji-mindset"', homeStart);
const homeSection = homeStart >= 0 && homeEnd > homeStart ? html.slice(homeStart, homeEnd) : '';
assert(homeSection, 'ホーム画面を抽出できません。');
assert((homeSection.match(/class="home-v4-shortcut home-v4-shortcut--/g) || []).length === 6, 'ホーム画面の機能ショートカットが6件ではありません。');
assert(homeSection.indexOf('id="home-shortcuts-title"') < homeSection.indexOf('class="home-v4-counter-grid"'), '機能ショートカットがホームヒーロー直後にありません。');
['omamori','column','settings'].forEach((view) => assert(homeSection.includes("trackFeatureDiscovery('" + view + "','home_quick_access')"), view + 'のホーム機能発見計測がありません。'));
assert(html.includes("'feature_discovery_click'"), '機能発見のアクセス解析イベントが許可リストにありません。');
assert(html.includes("['view_name', 'account_state', 'entry_point']"), '機能発見イベントの安全なentry_pointパラメータが許可されていません。');

console.log('公開文書手動アーカイブの回帰テストに合格しました。')
