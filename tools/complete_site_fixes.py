from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
README = ROOT / "README.md"
PRIVACY_TEST = ROOT / "tests" / "privacy-ui-regression.cjs"
READING_TEST = ROOT / "tests" / "public-document-reading-regression.cjs"

text = INDEX.read_text(encoding="utf-8")

# Analytics consent: deny by default and only grant after explicit opt-in.
pattern = re.compile(r"        function loadOptionalAnalytics\(\) \{[\s\S]*?\n        \}\n\n        function removeStorageKeys")
replacement = '''        function ensureAnalyticsConsentDefault() {
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
            if (!window.__tenmeiAnalyticsConsentInitialized) {
                window.gtag('consent', 'default', {
                    analytics_storage: 'denied',
                    ad_storage: 'denied',
                    ad_user_data: 'denied',
                    ad_personalization: 'denied',
                    wait_for_update: 500
                });
                window.__tenmeiAnalyticsConsentInitialized = true;
            }
        }

        function loadOptionalAnalytics() {
            ensureAnalyticsConsentDefault();
            const preferences = readPreferences();
            if (!preferences || preferences.analytics !== true) {
                window.gtag('consent', 'update', { analytics_storage: 'denied' });
                return;
            }
            window.gtag('consent', 'update', { analytics_storage: 'granted' });
            window.gtag('js', new Date());
            window.gtag('config', 'G-LMJV6EK1DD', { anonymize_ip: true, send_page_view: false });
            appendScript('tenmei-google-analytics', 'https://www.googletagmanager.com/gtag/js?id=G-LMJV6EK1DD', () => {
                window.gtag('event', 'page_view', {
                    page_location: window.location.href,
                    page_title: document.title
                });
            });
            appendScript('tenmei-microsoft-clarity', 'https://www.clarity.ms/tag/wo73lcg3xc');
        }

        function removeStorageKeys'''
if pattern.search(text):
    text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise RuntimeError("analytics replacement count != 1")
elif "ensureAnalyticsConsentDefault" not in text:
    raise RuntimeError("expected loadOptionalAnalytics block not found")

if "window.gtag('consent', 'update', { analytics_storage: 'denied' });" not in text:
    marker = "        function removeAnalyticsCookies() {\n            const domains"
    repl = "        function removeAnalyticsCookies() {\n            ensureAnalyticsConsentDefault();\n            window.gtag('consent', 'update', { analytics_storage: 'denied' });\n            const domains"
    if marker not in text:
        raise RuntimeError("removeAnalyticsCookies marker not found")
    text = text.replace(marker, repl, 1)

# Reading settings: make the public-document scope resilient to different page-specific wrappers,
# and re-run after AppConfig toggles, SPA navigation, class changes, or dynamically rendered content.
reading_fix = r'''
<style id="tenmei-public-document-reading-complete-fix">
html:not(.public-document-reading-disabled) :is(#view-about, #view-privacy, #view-howto) :is(p, li, td, th, blockquote, dt, dd, figcaption) {
    font-size: var(--article-font-size) !important;
    line-height: var(--article-line-height) !important;
    font-family: var(--article-font-family) !important;
}
html:not(.public-document-reading-disabled) :is(#view-about, #view-privacy, #view-howto) :is(.about-codex-content, .privacy-ledger-content, .howto-guide-content, article, .article-content) {
    max-width: var(--article-max-width) !important;
    margin-left: auto !important;
    margin-right: auto !important;
}
</style>
<script>
(function () {
    'use strict';
    function refreshPublicDocumentReading() {
        const root = document.documentElement;
        const enabled = !root.classList.contains('public-document-reading-disabled');
        const styles = getComputedStyle(root);
        const fontSize = styles.getPropertyValue('--article-font-size').trim();
        const lineHeight = styles.getPropertyValue('--article-line-height').trim();
        const fontFamily = styles.getPropertyValue('--article-font-family').trim();
        const maxWidth = styles.getPropertyValue('--article-max-width').trim();

        document.querySelectorAll(':is(#view-about, #view-privacy, #view-howto) :is(p, li, td, th, blockquote, dt, dd, figcaption)').forEach((element) => {
            element.toggleAttribute('data-reading-settings-inline', enabled);
            if (!enabled) {
                element.style.removeProperty('font-size');
                element.style.removeProperty('line-height');
                element.style.removeProperty('font-family');
                return;
            }
            if (fontSize) element.style.setProperty('font-size', fontSize);
            if (lineHeight) element.style.setProperty('line-height', lineHeight);
            if (fontFamily) element.style.setProperty('font-family', fontFamily);
        });

        document.querySelectorAll(':is(#view-about, #view-privacy, #view-howto) :is(.about-codex-content, .privacy-ledger-content, .howto-guide-content, article, .article-content)').forEach((element) => {
            if (!enabled) {
                element.style.removeProperty('max-width');
                element.style.removeProperty('margin-left');
                element.style.removeProperty('margin-right');
                return;
            }
            if (maxWidth) element.style.setProperty('max-width', maxWidth);
            element.style.setProperty('margin-left', 'auto');
            element.style.setProperty('margin-right', 'auto');
        });
    }

    function hookAppConfig() {
        if (!window.AppConfig || typeof window.AppConfig.toggle !== 'function') return false;
        if (window.AppConfig.__tenmeiPublicReadingHook) return true;
        const original = window.AppConfig.toggle.bind(window.AppConfig);
        window.AppConfig.toggle = function (key, value) {
            const result = original(key, value);
            if (key === 'publicDocumentReading') {
                queueMicrotask(refreshPublicDocumentReading);
                setTimeout(refreshPublicDocumentReading, 50);
                setTimeout(refreshPublicDocumentReading, 250);
            }
            return result;
        };
        window.AppConfig.__tenmeiPublicReadingHook = true;
        return true;
    }

    const observer = new MutationObserver(() => refreshPublicDocumentReading());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    const installTimer = setInterval(() => { if (hookAppConfig()) clearInterval(installTimer); }, 100);
    setTimeout(() => clearInterval(installTimer), 15000);
    document.addEventListener('click', () => setTimeout(refreshPublicDocumentReading, 0), true);
    window.addEventListener('hashchange', () => setTimeout(refreshPublicDocumentReading, 0));
    window.addEventListener('popstate', () => setTimeout(refreshPublicDocumentReading, 0));
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refreshPublicDocumentReading, { once: true });
    } else {
        refreshPublicDocumentReading();
    }
    window.TenmeiPublicDocumentReading = { refresh: refreshPublicDocumentReading };
}());
</script>
'''
if "tenmei-public-document-reading-complete-fix" not in text:
    text = text.replace("</body>", reading_fix + "\n</body>", 1)

# Skip link: hidden during ordinary browsing, visible to keyboard users.
if "tenmei-skip-link-fix" not in text:
    text = text.replace("</body>", r'''
<style id="tenmei-skip-link-fix">
.sidebar-v4-skip-link { top: -100px !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; transform: none !important; }
.sidebar-v4-skip-link:focus-visible { top: 12px !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; }
</style>
''' + "\n</body>", 1)

# PDF/print output: A4 page flow, no fixed-container clipping, sensible breaks.
if "tenmei-pdf-print-fix-final" not in text:
    text = text.replace("</body>", r'''
<style id="tenmei-pdf-print-fix-final">
@page { size: A4; margin: 14mm 12mm 16mm; }
@media print {
  html, body { width: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #111 !important; overflow: visible !important; }
  body { display: block !important; }
  #main-content { width: auto !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .view-section.printing { position: static !important; display: block !important; width: 100% !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
  .view-section.printing * { max-width: 100% !important; box-sizing: border-box !important; }
  .view-section.printing h1, .view-section.printing h2, .view-section.printing h3, .view-section.printing h4 { break-after: avoid-page !important; page-break-after: avoid !important; }
  .view-section.printing p, .view-section.printing li, .view-section.printing blockquote { orphans: 3; widows: 3; }
  .view-section.printing table { width: 100% !important; max-width: 100% !important; border-collapse: collapse !important; overflow: visible !important; }
  .view-section.printing thead { display: table-header-group !important; }
  .view-section.printing tr { break-inside: avoid !important; page-break-inside: avoid !important; }
  .view-section.printing img, .view-section.printing svg { max-width: 100% !important; height: auto !important; }
  .view-section.printing a { overflow-wrap: anywhere !important; color: #111 !important; text-decoration: underline !important; }
}
</style>
''' + "\n</body>", 1)

# Maileroo's current public privacy-policy page uses /legal/privacy-policy.
text = text.replace("https://maileroo.com/privacy-policy", "https://maileroo.com/legal/privacy-policy")

# Fill out Cloudflare's Article 5 entry instead of leaving it materially shorter than the other entries.
old_cloudflare = '''2. Cloudflare (Cloudflare, Inc.)
利用目的：コンテンツ配信（CDN）、サーバーレスコンピューティング（Workers）
送信される情報：アクセスログ、通信リクエスト
Cloudflareのデータ利用方針については'''
new_cloudflare = '''2. Cloudflare (Cloudflare, Inc.)
利用目的：コンテンツ配信（CDN）、サイトの高速化・セキュリティ機能、およびサーバーレスコンピューティング（Workers）の提供
送信される情報：IPアドレス、通信リクエスト、トラフィックルーティング情報、端末・システム構成情報、アクセス日時、User-Agent等の通信・アクセスに伴うメタデータ
特記事項：Cloudflareは、当サイトなどCloudflareのサービスを利用するエンドユーザーとの通信を処理します。Cloudflareの公式説明では、こうしたエンドユーザーデータにはIPアドレス、トラフィックルーティング情報、システム構成情報等が含まれる場合があり、これらの取り扱いはCloudflareのプライバシーポリシーおよび各サービスの説明に従います。Workers AIを含む当サイトのCloudflareサービスについては、個別の機能に応じて第5条の該当項目も適用されます。Cloudflareのデータ利用方針については'''
if old_cloudflare in text:
    text = text.replace(old_cloudflare, new_cloudflare, 1)

# Retain the already requested 30th revision marker when the prior 29th marker is present.
text = text.replace("制定: 2026/01/02 ・ 改定: 2026/08/29 (第29版)", "制定: 2026/01/02 ・ 改定: 2026/09/13 (第30版)")

INDEX.write_text(text, encoding="utf-8")

# Keep README synchronized with implementation.
r = README.read_text(encoding="utf-8")
r = r.replace(
    "環境・表示設定から、通常の記事だけでなく「当サイトについて」「プライバシーポリシー」「使い方」へ同じ読書設定を適用可能",
    "環境・表示設定から、通常の記事だけでなく「当サイトについて」「プライバシーポリシー」「使い方」へ同じ読書設定を適用可能。SPAで画面を切り替えても設定を再適用します",
)
r = r.replace(
    "**翻訳** — Bergamot系のローカル翻訳エンジンを使い、翻訳本文を外部翻訳APIへ送信せずにブラウザ内で翻訳",
    "**翻訳** — `@browsermt/bergamot-translator` とFirefox Translations系モデルを使い、翻訳本文を外部翻訳APIへ送信せずにブラウザ内で処理",
)
README.write_text(r, encoding="utf-8")

# Keep the existing privacy regression test aligned with the current canonical Maileroo URL.
if PRIVACY_TEST.exists():
    p = PRIVACY_TEST.read_text(encoding="utf-8")
    p = p.replace("https://maileroo.com/privacy-policy", "https://maileroo.com/legal/privacy-policy")
    PRIVACY_TEST.write_text(p, encoding="utf-8")

# Regression test for the public-document setting.
READING_TEST.write_text('''const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

[
  'id="settings-public-documents-toggle"',
  "AppConfig.toggle('publicDocumentReading', this.checked)",
  'tenmei-public-document-reading-complete-fix',
  'html:not(.public-document-reading-disabled)',
  ':is(#view-about, #view-privacy, #view-howto)',
  'data-reading-settings-inline',
  'window.AppConfig.__tenmeiPublicReadingHook',
  "key === 'publicDocumentReading'",
  'refreshPublicDocumentReading',
].forEach((text) => assert(html.includes(text), `公開文書の読書設定契約がありません: ${text}`));

assert.equal((html.match(/id="settings-public-documents-toggle"/g) || []).length, 1);
console.log('公開文書の読書設定回帰テストに合格しました。');
''', encoding="utf-8")

# Do not leave the one-shot helper/workflow behind after it runs.
workflow = ROOT / ".github" / "workflows" / "complete-sept13-site-fixes.yml"
if workflow.exists():
    workflow.unlink()
(Path(__file__)).unlink()

print("complete_site_fixes.py: all requested outstanding fixes applied")
