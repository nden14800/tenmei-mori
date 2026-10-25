(function () {
  'use strict';
  // Legacy reader retained as a compatibility bridge only.
  // All page-level TTS UI is now rendered by TenmeiSiteTTS, using the article player.
  window.__tenmeiSiteSpeechReader = true;
  // 全ページ共通の軽量な隠し広告演出を読み込む（広告配信サービスには接続しない）。
  if (!document.querySelector('script[data-tenmei-mock-ads]')) {
    const adScript = document.createElement('script');
    adScript.src = '/assets/js/tenmei-ad-easter-egg.js';
    adScript.defer = true;
    adScript.dataset.tenmeiMockAds = 'true';
    document.head.appendChild(adScript);
  }
  const sync = () => window.TenmeiSiteTTS?.scan?.();
  if (window.TenmeiSiteTTS) sync();
  else document.addEventListener('tenmei:tts-ready', sync, { once: true });
})();
