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