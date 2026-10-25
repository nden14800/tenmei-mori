(function(){
'use strict';
if(window.TenmeiMiniGames)return;
const STORE='tenmei_minigames_v1';
let root=null,previousFocus=null,game='home',memory=null,puzzle=null,reaction=null,timers=[],tickers=[];
const $=(s,base=root)=>base&&base.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readStore(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(_){return {};}}
function saveBest(key,value,mode){const data=readStore(),old=data[key];if(old==null||(mode==='lower'?value<old:value>old)){data[key]=value;try{localStorage.setItem(STORE,JSON.stringify(data));}catch(_){}return true;}return false;}
function best(key){const n=readStore()[key];return Number.isFinite(n)?n:null;}
function later(fn,ms){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);fn();},ms);timers.push(id);return id;}
function clearTimers(){timers.forEach(clearTimeout);timers=[];tickers.forEach(clearInterval);tickers=[];}
function installStyles(){
 if(document.getElementById('tenmei-mini-games-style'))return;
 const style=document.createElement('style');style.id='tenmei-mini-games-style';
 style.textContent=`
#tenmei-mini-games{position:fixed;z-index:12000;inset:0;display:grid;place-items:center;padding:clamp(10px,3vw,28px);background:rgba(17,20,17,.72);backdrop-filter:blur(12px);color:var(--text-main,#302923);font-family:'Zen Kaku Gothic New',sans-serif}
#tenmei-mini-games[hidden]{display:none}
#tenmei-mini-games .tmg-shell{position:relative;width:min(100%,920px);max-height:min(92dvh,900px);overflow:auto;border:1px solid color-mix(in srgb,var(--accent-gold,#c4a059) 28%,var(--card-border,#ddd));border-radius:25px;background:var(--card-bg,#fffdf9);box-shadow:0 28px 100px #0005}
#tenmei-mini-games .tmg-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 22px;border-bottom:1px solid var(--card-border,#e8e0d8);background:color-mix(in srgb,var(--card-bg,#fffdf9) 92%,transparent);backdrop-filter:blur(12px)}
#tenmei-mini-games .tmg-brand{display:flex;align-items:center;gap:11px;min-width:0}
#tenmei-mini-games .tmg-brand-mark{display:grid;width:42px;height:42px;flex:none;place-items:center;border:1px solid color-mix(in srgb,var(--accent-gold,#c4a059) 45%,transparent);border-radius:14px;background:color-mix(in srgb,var(--accent-gold,#c4a059) 10%,transparent);color:var(--accent-red,#8f252b);font-size:20px}
#tenmei-mini-games .tmg-eyebrow{display:block;color:var(--accent-gold,#a77d3c);font-size:9px;font-weight:900;letter-spacing:.18em}
#tenmei-mini-games .tmg-title{display:block;margin-top:2px;font-family:'Zen Old Mincho','Shippori Mincho',serif;font-size:17px;font-weight:800;letter-spacing:.04em}
#tenmei-mini-games .tmg-close{display:grid;width:42px;height:42px;flex:none;place-items:center;border:1px solid var(--card-border,#e4ddd5);border-radius:13px;background:var(--input-bg,#f7f3ed);color:var(--text-main);font-size:20px;cursor:pointer}
#tenmei-mini-games .tmg-close:hover{border-color:var(--accent-gold,#c4a059);background:color-mix(in srgb,var(--accent-gold,#c4a059) 10%,var(--card-bg,#fff));}
#tenmei-mini-games .tmg-content{padding:clamp(17px,3vw,30px)}
#tenmei-mini-games .tmg-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px}
#tenmei-mini-games .tmg-hero h2{margin:0;color:var(--text-main);font-family:'Zen Old Mincho','Shippori Mincho',serif;font-size:clamp(24px,4vw,34px);letter-spacing:.04em}
#tenmei-mini-games .tmg-hero p{max-width:560px;margin:8px 0 0;color:var(--text-sub,#786e67);font-size:13px;line-height:1.8}
#tenmei-mini-games .tmg-secret-label{padding:7px 10px;border:1px solid color-mix(in srgb,var(--accent-gold,#c4a059) 35%,transparent);border-radius:999px;color:var(--accent-gold,#a77d3c);font-size:10px;font-weight:900;letter-spacing:.08em;white-space:nowrap}
#tenmei-mini-games .tmg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}
#tenmei-mini-games .tmg-game-card{display:flex;min-width:0;min-height:220px;flex-direction:column;padding:18px;border:1px solid var(--card-border,#e7dfd7);border-radius:19px;background:var(--card-bg,#fff);text-align:left;cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s}
#tenmei-mini-games .tmg-game-card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--accent-gold,#c4a059) 60%,var(--card-border,#e7dfd7));box-shadow:0 12px 28px #47332312}
#tenmei-mini-games .tmg-game-icon{display:grid;width:52px;height:52px;place-items:center;border-radius:16px;background:color-mix(in srgb,var(--accent-gold,#c4a059) 12%,transparent);font-size:26px}
#tenmei-mini-games .tmg-game-card h3{margin:15px 0 6px;font-family:'Zen Old Mincho','Shippori Mincho',serif;font-size:17px}
#tenmei-mini-games .tmg-game-card p{margin:0;color:var(--text-sub,#786e67);font-size:11px;line-height:1.75}
#tenmei-mini-games .tmg-game-meta{display:flex;justify-content:space-between;gap:8px;margin-top:auto;padding-top:16px;color:var(--accent-red,#8f252b);font-size:10px;font-weight:850}
#tenmei-mini-games .tmg-stats{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 17px}
#tenmei-mini-games .tmg-stat{min-width:92px;padding:9px 12px;border:1px solid var(--card-border,#e7dfd7);border-radius:12px;background:var(--input-bg,#f8f5f0)}
#tenmei-mini-games .tmg-stat small{display:block;color:var(--text-sub,#786e67);font-size:9px;font-weight:800}
#tenmei-mini-games .tmg-stat strong{display:block;margin-top:2px;font-size:16px;font-variant-numeric:tabular-nums}
#tenmei-mini-games .tmg-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 16px}
#tenmei-mini-games .tmg-btn{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:7px;padding:0 14px;border:1px solid var(--card-border,#e7dfd7);border-radius:11px;background:var(--input-bg,#f8f5f0);color:var(--text-main);font:inherit;font-size:12px;font-weight:850;cursor:pointer}
#tenmei-mini-games .tmg-btn.primary{border-color:var(--accent-red,#8f252b);background:var(--accent-red,#8f252b);color:#fff}
#tenmei-mini-games .tmg-btn:disabled{opacity:.45;cursor:not-allowed}
#tenmei-mini-games .tmg-btn:focus-visible,#tenmei-mini-games button:focus-visible{outline:2px solid var(--accent-gold,#c4a059);outline-offset:3px}
#tenmei-mini-games .tmg-status{min-height:24px;margin:0 0 12px;color:var(--text-sub,#786e67);font-size:12px;line-height:1.7}
#tenmei-mini-games .tmg-board-wrap{display:grid;place-items:center;padding:16px;border:1px solid var(--card-border,#e7dfd7);border-radius:19px;background:color-mix(in srgb,var(--input-bg,#f8f5f0) 70%,transparent)}
#tenmei-mini-games .tmg-memory-board{display:grid;width:min(100%,490px);grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
#tenmei-mini-games .tmg-memory-card{display:grid;min-width:0;aspect-ratio:1;place-items:center;border:1px solid color-mix(in srgb,var(--accent-gold,#c4a059) 38%,var(--card-border,#e7dfd7));border-radius:14px;background:linear-gradient(145deg,var(--card-bg,#fff),var(--input-bg,#f8f5f0));color:var(--accent-red,#8f252b);font-size:clamp(22px,5vw,36px);font-weight:800;cursor:pointer;transition:transform .18s,background .18s}
#tenmei-mini-games .tmg-memory-card.is-hidden{background:linear-gradient(145deg,color-mix(in srgb,var(--accent-red,#8f252b) 9%,var(--card-bg,#fff)),var(--card-bg,#fff));font-size:clamp(17px,3vw,25px)}
#tenmei-mini-games .tmg-memory-card.is-matched{border-color:#6d9b78;background:color-mix(in srgb,#6d9b78 13%,var(--card-bg,#fff));cursor:default}
#tenmei-mini-games .tmg-puzzle-board{display:grid;width:min(100%,430px);grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;touch-action:manipulation}
#tenmei-mini-games .tmg-puzzle-tile{display:grid;aspect-ratio:1;place-items:center;border:1px solid color-mix(in srgb,var(--accent-gold,#c4a059) 35%,var(--card-border,#e7dfd7));border-radius:12px;background:linear-gradient(145deg,var(--card-bg,#fff),var(--input-bg,#f8f5f0));color:var(--text-main);font-size:clamp(18px,4vw,27px);font-weight:900;cursor:pointer}
#tenmei-mini-games .tmg-puzzle-tile.empty{border:1px dashed var(--card-border,#ddd);background:transparent;cursor:default}
#tenmei-mini-games .tmg-puzzle-tile:not(.empty):hover{border-color:var(--accent-red,#8f252b);background:color-mix(in srgb,var(--accent-gold,#c4a059) 13%,var(--card-bg,#fff))}
#tenmei-mini-games .tmg-reaction-stage{display:grid;min-height:250px;width:100%;place-items:center;border:1px solid var(--card-border,#e7dfd7);border-radius:18px;background:linear-gradient(145deg,var(--card-bg,#fff),var(--input-bg,#f8f5f0));}
#tenmei-mini-games .tmg-reaction-hit{display:grid;width:min(78%,320px);min-height:150px;place-items:center;border:1px solid var(--card-border,#ddd);border-radius:20px;background:var(--input-bg,#f8f5f0);color:var(--text-main);font:inherit;font-size:19px;font-weight:900;cursor:pointer;touch-action:manipulation}
#tenmei-mini-games .tmg-reaction-hit.ready{border-color:#438c61;background:#438c61;color:#fff;box-shadow:0 0 0 8px #438c6120}
#tenmei-mini-games .tmg-footnote{margin:20px 0 0;padding-top:14px;border-top:1px solid var(--card-border,#e7dfd7);color:var(--text-sub,#786e67);font-size:10px;line-height:1.7}
@media(max-width:700px){#tenmei-mini-games .tmg-grid{grid-template-columns:1fr}#tenmei-mini-games .tmg-game-card{min-height:0;padding:15px}#tenmei-mini-games .tmg-game-card h3{margin-top:9px}#tenmei-mini-games .tmg-game-icon{width:44px;height:44px}#tenmei-mini-games .tmg-hero{align-items:flex-start;flex-direction:column;gap:9px}#tenmei-mini-games .tmg-board-wrap{padding:10px}#tenmei-mini-games .tmg-memory-board{gap:6px}#tenmei-mini-games .tmg-memory-card{border-radius:10px}#tenmei-mini-games .tmg-puzzle-board{gap:5px}#tenmei-mini-games .tmg-puzzle-tile{border-radius:9px}#tenmei-mini-games .tmg-top{padding:13px 15px}#tenmei-mini-games .tmg-content{padding:17px 14px}}
@media(prefers-reduced-motion:reduce){#tenmei-mini-games *{transition:none!important;scroll-behavior:auto!important}}
`;
 document.head.appendChild(style);
}
function shell(){
 if(root)return;
 installStyles();
 root=document.createElement('div');root.id='tenmei-mini-games';root.hidden=true;
 root.innerHTML='<div class="tmg-shell" role="dialog" aria-modal="true" aria-labelledby="tmg-title"><header class="tmg-top"><div class="tmg-brand"><span class="tmg-brand-mark" aria-hidden="true">🎮</span><div><span class="tmg-eyebrow">A SECRET CORNER OF TENMEI MORI</span><strong class="tmg-title" id="tmg-title">杜のミニゲーム</strong></div></div><button type="button" class="tmg-close" data-tmg-close aria-label="ミニゲームを閉じる">×</button></header><main class="tmg-content" id="tmg-content"></main></div>';
 document.body.appendChild(root);
 root.addEventListener('click',onClick);
 root.addEventListener('keydown',onBoardKey);
}
function open(){shell();previousFocus=document.activeElement;root.hidden=false;document.body.dataset.tmgPreviousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';showHome();$('[data-tmg-close]').focus();}
function close(){if(!root||root.hidden)return;clearTimers();root.hidden=true;document.body.style.overflow=document.body.dataset.tmgPreviousOverflow||'';delete document.body.dataset.tmgPreviousOverflow;if(previousFocus&&previousFocus.isConnected)previousFocus.focus();game='home';}
function homeCard(id,icon,title,desc,record){return '<button type="button" class="tmg-game-card" data-tmg-game="'+id+'"><span class="tmg-game-icon" aria-hidden="true">'+icon+'</span><h3>'+title+'</h3><p>'+desc+'</p><span class="tmg-game-meta"><span>プレイする <span aria-hidden="true">→</span></span><span>'+record+'</span></span></button>';}
function showHome(){
 clearTimers();game='home';
 const memoryBest=best('memory'),puzzleBest=best('puzzle'),reactionBest=best('reaction');
 $('#tmg-content').innerHTML='<section class="tmg-hero"><div><h2>ひと休み、遊んでいきませんか。</h2><p>境内の片隅に、こっそり用意された小さな遊び場。記憶・ひらめき・反射神経の3つのゲームを楽しめます。</p></div><span class="tmg-secret-label">HIDDEN FEATURE · 01</span></section><div class="tmg-grid">'+
 homeCard('memory','🃏','記憶の札','札をめくって、同じ絵柄の組み合わせを見つけよう。手数と時間を記録します。',memoryBest==null?'未プレイ':'最少 '+memoryBest+'手')+
 homeCard('puzzle','🏮','灯籠の道','数字の札を順番に並べるスライドパズル。少ない手数で完成を目指そう。',puzzleBest==null?'未プレイ':'最少 '+puzzleBest+'手')+
 homeCard('reaction','🔔','鈴の反射','合図が変わった瞬間にタップ。全5回の平均反応時間に挑戦。',reactionBest==null?'未プレイ':'ベスト '+reactionBest+'ms')+
 '</div><p class="tmg-footnote">記録はこの端末のブラウザ内に保存されます。アカウント情報やサーバーには送信しません。音を出さなくても遊べます。</p>';
}
function gameHeader(title,desc,stats,back=true){return '<section class="tmg-hero"><div><h2>'+title+'</h2><p>'+desc+'</p></div><span class="tmg-secret-label">MINI GAME</span></section><div class="tmg-actions">'+(back?'<button class="tmg-btn" type="button" data-tmg-back>← ゲーム一覧</button>':'')+'<button class="tmg-btn primary" type="button" data-tmg-restart>↻ もう一度</button></div><div class="tmg-stats">'+stats+'</div>';}
function stat(label,value){return '<div class="tmg-stat"><small>'+label+'</small><strong>'+value+'</strong></div>';}
function memoryStart(){
 clearTimers();game='memory';const icons=['🌸','🦊','⛩️','🍁','🦉','🎐','🌙','🪷'];const deck=icons.concat(icons).map((v,i)=>({id:i,value:v,matched:false,open:false}));for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 memory={deck,first:null,lock:false,moves:0,pairs:0,started:Date.now(),elapsed:0,done:false};
 renderMemory();
 const ticker=setInterval(()=>{if(game!=='memory'||!memory||memory.done)return;const el=$('[data-memory-time]');if(el)el.textContent=Math.floor((Date.now()-memory.started)/1000)+'秒';},1000);tickers.push(ticker);
}
function renderMemory(){
 if(game!=='memory'||!memory)return;
 const m=memory,secs=Math.floor((Date.now()-m.started)/1000);
 $('#tmg-content').innerHTML=gameHeader('記憶の札','2枚ずつめくって同じ絵柄をそろえよう。すべての札を見つけるとクリアです。',stat('手数',m.moves)+stat('そろえた組',m.pairs+' / 8')+stat('経過時間','<span data-memory-time>'+secs+'秒</span>')+stat('自己ベスト',best('memory')==null?'—':best('memory')+'手'))+
 '<p class="tmg-status" role="status" aria-live="polite">'+(m.done?'全ての札がそろいました。お見事！':m.lock?'絵柄を確認中…':'札を2枚選んでください。')+'</p><div class="tmg-board-wrap"><div class="tmg-memory-board" aria-label="神経衰弱の札">'+m.deck.map((c,i)=>'<button type="button" class="tmg-memory-card '+(!c.open&&!c.matched?'is-hidden ':'')+(c.matched?'is-matched':'')+'" data-memory="'+i+'" aria-label="'+(c.matched?'一致した '+c.value:c.open?'開いた '+c.value:'伏せた札 '+(i+1))+'" '+(c.matched||m.lock||c.open?'disabled':'')+'>'+(c.open||c.matched?c.value:'✦')+'</button>').join('')+'</div></div>';
}
function memoryPick(i){
 const m=memory;if(!m||m.lock||m.done)return;const c=m.deck[i];if(!c||c.open||c.matched)return;
 c.open=true;
 if(m.first===null){m.first=i;renderMemory();$('[data-memory="'+i+'"]')?.focus();return;}
 m.moves++;const first=m.deck[m.first];m.first=null;
 if(first.value===c.value){first.matched=true;c.matched=true;m.pairs++;if(m.pairs===8){m.done=true;clearTimers();const isBest=saveBest('memory',m.moves,'lower');renderMemory();const p=$('.tmg-status');if(p)p.textContent='クリア！ '+m.moves+'手で完成'+(isBest?' · 自己ベスト更新！':'');return;}renderMemory();$('[data-memory="'+i+'"]')?.focus();}
 else{m.lock=true;renderMemory();$('[data-memory="'+i+'"]')?.focus();later(()=>{if(!memory||game!=='memory')return;first.open=false;c.open=false;m.lock=false;renderMemory();$('[data-memory="'+i+'"]')?.focus();},750);}
}
function puzzleStart(){
 clearTimers();game='puzzle';puzzle={tiles:Array.from({length:16},(_,i)=>(i+1)%16),moves:0,done:false};
 let prev=-1;for(let n=0;n<240;n++){const z=puzzle.tiles.indexOf(0),opts=[z%4?z-1:-1,z%4<3?z+1:-1,z>=4?z-4:-1,z<12?z+4:-1].filter(x=>x>=0&&x!==prev);const pick=opts[Math.floor(Math.random()*opts.length)];[puzzle.tiles[z],puzzle.tiles[pick]]=[puzzle.tiles[pick],puzzle.tiles[z]];prev=z;}
 if(puzzle.tiles.every((v,i)=>v===((i+1)%16)))return puzzleStart();
 renderPuzzle();
}
function puzzleMove(i){
 const p=puzzle;if(!p||p.done)return;const z=p.tiles.indexOf(0);if(Math.abs((z%4)-(i%4))+Math.abs(Math.floor(z/4)-Math.floor(i/4))!==1)return;
 [p.tiles[z],p.tiles[i]]=[p.tiles[i],p.tiles[z]];p.moves++;
 if(p.tiles.every((v,i)=>v===((i+1)%16))){p.done=true;const isBest=saveBest('puzzle',p.moves,'lower');renderPuzzle();const status=$('.tmg-status');if(status)status.textContent='完成！ '+p.moves+'手で灯籠の道がつながりました。'+(isBest?' 自己ベスト更新！':'');return;}
 renderPuzzle();
}
function renderPuzzle(){
 const p=puzzle;if(!p)return;
 $('#tmg-content').innerHTML=gameHeader('灯籠の道','空いたマスの隣にある札を動かして、1から15まで順番に並べよう。札を選ぶか、矢印キーでも操作できます。',stat('手数',p.moves)+stat('状態',p.done?'完成':'挑戦中')+stat('自己ベスト',best('puzzle')==null?'—':best('puzzle')+'手'))+
 '<p class="tmg-status" role="status" aria-live="polite">'+(p.done?'完成！':'数字を順番に並べてください。')+'</p><div class="tmg-board-wrap"><div class="tmg-puzzle-board" role="group" aria-label="15パズル">'+p.tiles.map((v,i)=>'<button type="button" class="tmg-puzzle-tile '+(!v?'empty':'')+'" data-puzzle="'+i+'" '+(!v||p.done?'disabled':'')+' aria-label="'+(v?'数字 '+v:'空きマス')+'">'+(v||'')+'</button>').join('')+'</div></div>';
}
function reactionStart(){
 clearTimers();game='reaction';reaction={round:1,total:5,phase:'idle',times:[],start:0,done:false,message:'開始を押してください。'};
 renderReaction();
}
function renderReaction(){
 const r=reaction;if(!r)return;
 const avg=r.times.length?Math.round(r.times.reduce((a,b)=>a+b,0)/r.times.length):null;
 const bestVal=best('reaction');
 $('#tmg-content').innerHTML=gameHeader('鈴の反射','「待機中」から画面が緑に変わったら、できるだけ早く押そう。早押しはやり直しです。',stat('ラウンド',r.round+' / 5')+stat('今回の平均',avg==null?'—':avg+' ms')+stat('ベスト平均',bestVal==null?'—':bestVal+' ms'))+
 '<p class="tmg-status" role="status" aria-live="polite">'+esc(r.message)+'</p><div class="tmg-reaction-stage"><button type="button" class="tmg-reaction-hit '+(r.phase==='ready'?'ready':'')+'" data-reaction '+(r.phase==='idle'||r.phase==='result'||r.phase==='finished'?'disabled':'')+'>'+({idle:'開始して挑戦',waiting:'まだです…',ready:'今！',result:r.times[r.times.length-1]+' ms',finished:'挑戦完了'})[r.phase]+'</button></div><div class="tmg-actions" style="margin-top:14px"><button type="button" class="tmg-btn primary" data-reaction-start>'+(r.phase==='idle'?'スタート':r.phase==='finished'?'もう一度挑戦':'次へ')+'</button></div>';
}
function reactionBegin(){
 const r=reaction;if(!r)return;r.phase='waiting';r.message='画面が緑に変わるまで待ってください。';renderReaction();$('[data-reaction]')?.focus();
 later(()=>{if(!reaction||game!=='reaction'||reaction.phase!=='waiting')return;reaction.phase='ready';reaction.start=performance.now();reaction.message='今すぐタップ！';renderReaction();$('[data-reaction]')?.focus();},1000+Math.random()*2200);
}
function reactionHit(){
 const r=reaction;if(!r||r.phase!=='ready')return;const ms=Math.round(performance.now()-r.start);r.times.push(ms);
 if(r.times.length>=r.total){r.phase='finished';const avg=Math.round(r.times.reduce((a,b)=>a+b,0)/r.times.length);const isBest=saveBest('reaction',avg,'lower');r.message='5回の平均は '+avg+' ms。'+(isBest?'自己ベスト更新！':'お疲れさまでした。');}
 else{r.phase='result';r.round=r.times.length+1;r.message='反応時間：'+ms+' ms。次のラウンドへ進もう。';}
 renderReaction();
 $('[data-reaction-start]')?.focus();
}
function onClick(e){
 if(e.target.closest('[data-tmg-close]')||e.target===root){close();return;}
 const card=e.target.closest('[data-tmg-game]');if(card){const id=card.dataset.tmgGame;if(id==='memory')memoryStart();if(id==='puzzle')puzzleStart();if(id==='reaction')reactionStart();return;}
 if(e.target.closest('[data-tmg-back]')){showHome();return;}
 if(e.target.closest('[data-tmg-restart]')){if(game==='memory')memoryStart();else if(game==='puzzle')puzzleStart();else if(game==='reaction')reactionStart();return;}
 const m=e.target.closest('[data-memory]');if(m){memoryPick(Number(m.dataset.memory));return;}
 const p=e.target.closest('[data-puzzle]');if(p){const i=Number(p.dataset.puzzle),blank=puzzle?.tiles.indexOf(0);puzzleMove(i);$('[data-puzzle="'+blank+'"]')?.focus();return;}
 if(e.target.closest('[data-reaction-start]')){if(reaction.phase==='idle'||reaction.phase==='finished')reactionStart();else if(reaction.phase==='result')reactionBegin();return;}
 if(e.target.closest('[data-reaction]')){if(reaction.phase==='waiting'){clearTimers();reaction.phase='idle';reaction.message='早押し！ 合図が出る前に押しました。もう一度スタート。';renderReaction();}else reactionHit();}
}
function onBoardKey(e){
 if(root.hidden)return;
 if(e.key==='Escape'){e.stopPropagation();close();return;}
 if(game!=='puzzle'||!puzzle||puzzle.done)return;
 const z=puzzle.tiles.indexOf(0);let i=-1;
 if(e.key==='ArrowLeft'&&z%4<3)i=z+1;
 if(e.key==='ArrowRight'&&z%4>0)i=z-1;
 if(e.key==='ArrowUp'&&z<12)i=z+4;
 if(e.key==='ArrowDown'&&z>=4)i=z-4;
 if(i>=0){e.preventDefault();puzzleMove(i);const next=$('[data-puzzle="'+z+'"]');if(next)next.focus();}
}
window.TenmeiMiniGames={open,close};
document.addEventListener('keydown',e=>{if(root&&!root.hidden&&e.key==='Escape')close();});
})();