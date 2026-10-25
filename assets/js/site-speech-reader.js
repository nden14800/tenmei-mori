(function () {
  'use strict';
  // Legacy reader retained as a compatibility bridge only.
  // All page-level TTS UI is now rendered by TenmeiSiteTTS, using the article player.
  window.__tenmeiSiteSpeechReader = true;
  const sync = () => window.TenmeiSiteTTS?.scan?.();
  if (window.TenmeiSiteTTS) sync();
  else document.addEventListener('tenmei:tts-ready', sync, { once: true });
})();
