const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const tts=fs.readFileSync(path.resolve(__dirname,'..','assets/js/tenmei-site-tts.js'),'utf8');
const games=fs.readFileSync(path.resolve(__dirname,'..','assets/js/tenmei-mini-games.js'),'utf8');

assert(tts.includes('function splitAnchored(nodes)'), '記事段落単位の音声分割がありません。');
assert(tts.includes('const anchored=anchorNodes.length?splitAnchored(anchorNodes):[]'), '記事音声がDOM段落に対応していません。');
assert(tts.includes('anchored.map(item=>item.anchor)'), '音声チャンクとハイライト対象の対応がありません。');
assert(tts.includes('function highlightCurrentPart()'), '段落ハイライト関数がありません。');
assert(tts.includes("activeAnchor.classList.add('tenmei-article-audio__active')"), '読み上げ中の段落ハイライトがありません。');
assert(tts.includes('audio.onended='), '音声チャンク終了時の次段落切替がありません。');
assert(!tts.includes('SpeechSynthesisUtterance'), '音声エンジンを誤ってブラウザ標準TTSに変更しています。');

assert(html.includes("minigame:  ['🎮','杜のミニゲーム'"), '隠し機能の合言葉が登録されていません。');
assert(html.includes("if (key==='minigame')"), '合言葉からミニゲームを起動できません。');
assert(html.includes('window.TenmeiMiniGames.close()'), '隠し機能一括終了からミニゲームを閉じられません。');
assert(html.includes('assets/js/tenmei-mini-games.js'), 'ミニゲームJSが読み込まれていません。');
assert(html.includes('const initialCalendarDate=new Date()'), 'イベントカレンダーが現在の月を初期表示しません。');
assert(html.includes('data-event-status'), 'イベント開催状況フィルターがありません。');
assert(html.includes('data-event-category'), 'イベントカテゴリーフィルターがありません。');
assert(html.includes('data-event-date'), 'イベント日付選択がありません。');

['記憶の札','灯籠の道','鈴の反射'].forEach(name=>assert(games.includes(name),'ゲームがありません: '+name));
['memoryStart','puzzleStart','reactionStart','saveBest','localStorage','aria-modal','data-memory','data-puzzle','data-reaction'].forEach(n=>assert(games.includes(n),'ゲーム機能が不足: '+n));
assert(games.includes('window.TenmeiMiniGames={open,close}'), 'ミニゲーム起動APIがありません。');
assert(games.includes('prefers-reduced-motion:reduce'), '動きを抑える設定に対応していません。');
console.log('Mini games / TTS highlight regression checks passed.');
// Shared TTS must follow the site's html.dark theme and keep source-only hosts invisible.
assert(tts.includes('html.dark .tenmei-article-audio{'), '共通TTSプレーヤーにサイト標準のダークモード対応がありません。');
['--card-bg:#211b19;', '--card-border:#493b35;', '--input-bg:#2b2320;', '--text-main:#f5e8df;', '--text-sub:#c8b8ad;', '--accent-red:#c56b70;', '--accent-gold:#d5b36a;'].forEach(token=>assert(tts.includes(token), 'TTSダークテーマの共通色トークンが不足しています: '+token));
assert(tts.includes('html.dark .tenmei-article-audio .tenmei-choice__trigger'), 'TTSの速度・音声選択欄がダークモードに対応していません。');
assert(tts.includes('html.dark .tenmei-article-audio .tenmei-choice__popover'), 'TTSの選択メニューがダークモードに対応していません。');
assert(tts.includes('.tenmei-site-tts-host[hidden]{display:none!important}'), 'hidden属性を持つTTS本文ホストがdisplay:blockにより露出する問題が残っています。');
assert(tts.includes('function extractFortuneText(result)'), 'おみくじ結果の読み上げ本文を整理する抽出処理がありません。');
assert(tts.includes("holder.setAttribute('aria-hidden','true')"), 'おみくじの読み上げ専用本文が支援技術へ露出しないようにしてください。');
assert(tts.includes('other.contains(node)'), 'おみくじ本文抽出で親子セレクターの重複を除去していません。');
assert(tts.includes("filter(node=>!node.matches('.hidden,.d-none,.visually-hidden,.sr-only,[aria-hidden=\"true\"],[hidden]'))"), 'おみくじの非表示・読み上げ専用ノードを抽出対象から除外してください。');
assert((tts.match(/holder\.hidden=true/g)||[]).length===1, 'hiddenなTTS本文ホストはおみくじの読み上げソースだけに限定してください。');
