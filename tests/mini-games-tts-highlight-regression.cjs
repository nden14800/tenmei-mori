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
// TTS must inherit the site's existing theme and custom-select implementation without its own palette.
assert(tts.includes('var(--card-bg,'), 'TTSカードがサイト共通の背景トークンを参照していません。');
assert(tts.includes('var(--card-border,'), 'TTSカードがサイト共通の境界色トークンを参照していません。');
assert(tts.includes('var(--input-bg,'), 'TTS操作ボタンがサイト共通の入力背景トークンを参照していません。');
assert(tts.includes("className='tenmei-choice'"), 'TTSの速度・音声選択欄がサイト共通の選択欄コンポーネントを使っていません。');
assert(!tts.includes('html.dark'), 'TTS専用のダークモード上書きが残っています。');
assert(!tts.includes('.dark .tenmei-choice__'), 'TTS専用の選択欄ダーク配色が残っています。');
assert(!/--(?:card-bg|card-border|text-main|text-sub|input-bg|accent-red|accent-gold):#[0-9a-f]{3,8}/i.test(tts), 'TTS内にサイトと競合する固定カラー変数が残っています。');
assert(html.includes('<style id="tenmei-custom-control-unification-fix">'), 'サイト共通の選択欄スタイル定義が見つかりません。');
assert(html.includes('#main-content .tenmei-choice__trigger'), '共通選択欄のトリガースタイルがありません。');
assert(html.includes('.dark .tenmei-choice__trigger'), '共通選択欄のダークモードスタイルがありません。');
assert(html.includes('.dark .tenmei-choice__popover'), '共通選択欄メニューのダークモードスタイルがありません。');

assert(tts.includes('.tenmei-site-tts-host[hidden]{display:none!important}'), 'hidden属性を持つTTS本文ホストがdisplay:blockにより露出する問題が残っています。');
assert(tts.includes('function extractFortuneText(result)'), 'おみくじ結果の読み上げ本文を整理する抽出処理がありません。');
assert(tts.includes("holder.setAttribute('aria-hidden','true')"), 'おみくじの読み上げ専用本文が支援技術へ露出しないようにしてください。');
assert(tts.includes('other.contains(node)'), 'おみくじ本文抽出で親子セレクターの重複を除去していません。');
assert(tts.includes("filter(node=>!node.matches('.hidden,.d-none,.visually-hidden,.sr-only,[aria-hidden=\"true\"],[hidden]'))"), 'おみくじの非表示・読み上げ専用ノードを抽出対象から除外してください。');
assert((tts.match(/holder\.hidden=true/g)||[]).length===1, 'hiddenなTTS本文ホストはおみくじの読み上げソースだけに限定してください。');

assert(tts.includes('result.parentElement.insertBefore(holder,result);'), 'おみくじTTSを結果表示エリアの外側へ配置していません。');
assert(tts.includes('結果カードの内部レイアウト（横並び2カラム）には入れず'), 'おみくじTTSを結果カードの内部レイアウトから分離する方針がありません。');
assert(!tts.includes("playerMount.insertAdjacentElement('beforebegin',holder)"), 'おみくじTTSを結果カード内部の2カラム領域へ配置する旧実装が残っています。');
assert(!tts.includes("playerMount.insertAdjacentElement('afterend',holder)"), 'おみくじTTSを結果カードの後ろへ配置する旧実装が残っています。');