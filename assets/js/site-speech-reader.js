(function () {
  'use strict';
  // 全ページ共通の軽量な隠し広告演出を読み込む（広告配信サービスには接続しない）。
  if (!document.querySelector('script[data-tenmei-mock-ads]')) {
    const adScript = document.createElement('script');
    adScript.src = '/assets/js/tenmei-ad-easter-egg.js';
    adScript.defer = true;
    adScript.dataset.tenmeiMockAds = 'true';
    document.head.appendChild(adScript);
  }
})();
