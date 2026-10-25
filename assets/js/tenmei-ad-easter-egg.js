(function () {
'use strict';
if (window.__tenmeiMockAdsInstalled) return;
window.__tenmeiMockAdsInstalled = true;

var ads = [
 {type:'DISPLAY AD · 300 × 250',tag:'広告',icon:'⛩️',name:'神社Wi-Fi',body:'神様直結。通信速度は、最後は神頼み。境内でも圏外でも、気持ちだけは高速通信。',price:'月額 980円（架空）',cta:'通信のご利益を見る'},
 {type:'おすすめ · アフィリエイト風',tag:'PR',icon:'🧿',name:'お守り Pro Max',body:'従来比300%のご利益（当社比）。軽量設計で持ち運びも簡単。※ご利益の感じ方には個人差があります。',price:'特別価格 3,980円',cta:'商品詳細を見る'},
 {type:'SPONSORED CONTENT',tag:'PR記事',icon:'📜',name:'運気を整える朝の習慣7選',body:'神職監修……ではありません。まずは窓を開けて深呼吸。広告なのに、いちばん普通のことを勧めてきます。',price:'提供：架空の天命広告社',cta:'記事を読む'},
 {type:'NATIVE AD · あなたへのおすすめ',tag:'広告',icon:'🎴',name:'開運プレミアム',body:'今日の運勢を、さらにプレミアムに。大吉の気分を毎日に。なお、おみくじの結果そのものは変わりません。',price:'月額 980円（税込・架空）',cta:'プランを確認する'},
 {type:'DISPLAY AD · 横長バナー',tag:'広告',icon:'✨',name:'AI神託 EX',body:'AIがあなたの未来を予測。予測が外れた場合は「運命は変わりました」と表示します。',price:'初回無料・2回目以降は神のみぞ知る',cta:'未来をのぞく'},
 {type:'おすすめ · サブスクリプション',tag:'PR',icon:'🧹',name:'厄払いサブスク',body:'毎月自動で厄払い。解約方法は、境内のどこかにある小さな鳥居を探してください。',price:'月額 480円（架空）',cta:'自動更新を申し込む'},
 {type:'SPECIAL OFFER',tag:'広告',icon:'🚫',name:'広告を非表示にするプレミアム',body:'広告を消すためのプランです。なお、この広告も広告です。広告を消すには、まずこの広告を読んでください。',price:'月額 1,280円（架空）',cta:'広告を非表示にする'}
];

function showGallery() {
 try {
  var previous=document.getElementById('tenmei-mock-ad-scene');
  if(previous){previous.remove();return;}
  var selected=[];
  while(selected.length<4){var candidate=ads[Math.floor(Math.random()*ads.length)];if(selected.indexOf(candidate)<0)selected.push(candidate);}
  if(!selected.some(function(a){return a.name===ads[6].name;})&&Math.random()<.6)selected[3]=ads[6];
  var stage=document.createElement('div');stage.id='tenmei-mock-ad-scene';stage.className='tenmei-mock-ad-stage';
  stage.setAttribute('role','dialog');stage.setAttribute('aria-modal','true');stage.setAttribute('aria-labelledby','tenmei-mock-ad-title');
  var panel=document.createElement('section');panel.className='tenmei-mock-ad-panel';
  var header=document.createElement('div');header.className='tenmei-mock-ad-header';
  var eyebrow=document.createElement('span');eyebrow.textContent='TENMEI AD NETWORK · SIMULATION';
  var close=document.createElement('button');close.type='button';close.className='tenmei-mock-ad-close';close.textContent='閉じる';close.setAttribute('aria-label','架空広告を閉じる');
  header.appendChild(eyebrow);header.appendChild(close);
  var title=document.createElement('h2');title.id='tenmei-mock-ad-title';title.textContent='天命乃杜 広告配信センター';
  var intro=document.createElement('p');intro.className='tenmei-mock-ad-intro';intro.textContent='もし、このサイトに広告が掲載されていたら。そんな架空の広告枠をのぞいてみましょう。';
  var grid=document.createElement('div');grid.className='tenmei-mock-ad-grid';
  selected.forEach(function(ad){
   var card=document.createElement('article');card.className='tenmei-mock-ad-card';
   var meta=document.createElement('div');meta.className='tenmei-mock-ad-meta';
   var kind=document.createElement('span');kind.textContent=ad.type;
   var tag=document.createElement('span');tag.className='tenmei-mock-ad-tag';tag.textContent=ad.tag;
   meta.appendChild(kind);meta.appendChild(tag);
   var icon=document.createElement('div');icon.className='tenmei-mock-ad-icon';icon.textContent=ad.icon;
   var heading=document.createElement('h3');heading.textContent=ad.name;
   var body=document.createElement('p');body.textContent=ad.body;
   var price=document.createElement('strong');price.className='tenmei-mock-ad-price';price.textContent=ad.price;
   var action=document.createElement('button');action.type='button';action.className='tenmei-mock-ad-action';action.textContent=ad.cta;
   action.addEventListener('click',function(){
    var note=card.querySelector('.tenmei-mock-ad-note');
    if(!note){note=document.createElement('p');note.className='tenmei-mock-ad-note';card.appendChild(note);}
    note.textContent='これは天命乃杜の架空広告です。実際の販売・申込み・外部リンクはありません。';
    action.textContent='架空広告でした';action.disabled=true;
   });
   card.appendChild(meta);card.appendChild(icon);card.appendChild(heading);card.appendChild(body);card.appendChild(price);card.appendChild(action);grid.appendChild(card);
  });
  var footer=document.createElement('footer');footer.className='tenmei-mock-ad-footer';
  var note=document.createElement('p');note.textContent='※すべて架空の広告です。実際の広告配信、個人情報の送信、購入・申込み、外部サイトへの移動は発生しません。';
  var dismiss=document.createElement('button');dismiss.type='button';dismiss.className='tenmei-mock-ad-dismiss';dismiss.textContent='広告を閉じる';
  footer.appendChild(note);footer.appendChild(dismiss);
  panel.appendChild(header);panel.appendChild(title);panel.appendChild(intro);panel.appendChild(grid);panel.appendChild(footer);stage.appendChild(panel);document.body.appendChild(stage);
  function closeGallery(){stage.remove();document.removeEventListener('keydown',onKey,true);}
  function onKey(event){if(event.key==='Escape')closeGallery();}
  close.addEventListener('click',closeGallery);dismiss.addEventListener('click',closeGallery);
  stage.addEventListener('click',function(event){if(event.target===stage)closeGallery();});
  document.addEventListener('keydown',onKey,true);close.focus();
 } catch (_) {}
}

var style=document.createElement('style');style.id='tenmei-mock-ad-style';
style.textContent='.tenmei-mock-ad-stage{position:fixed;inset:0;z-index:100002;display:grid;place-items:center;padding:16px;box-sizing:border-box;background:rgba(14,18,24,.74);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);overflow:auto}.tenmei-mock-ad-panel{width:min(900px,100%);max-height:90vh;overflow:auto;box-sizing:border-box;padding:clamp(18px,4vw,34px);border:1px solid rgba(184,151,91,.4);border-radius:22px;background:var(--surface,#fffdf8);color:var(--text,#28231e);box-shadow:0 28px 90px rgba(0,0,0,.3)}.tenmei-mock-ad-header{display:flex;justify-content:space-between;align-items:center;gap:12px;color:#987746;font:700 10px/1.4 system-ui,sans-serif;letter-spacing:.12em}.tenmei-mock-ad-close,.tenmei-mock-ad-dismiss,.tenmei-mock-ad-action{font:inherit;cursor:pointer;border-radius:999px}.tenmei-mock-ad-close{padding:8px 13px;border:1px solid var(--border,rgba(0,0,0,.15));background:transparent;color:inherit}.tenmei-mock-ad-panel h2{margin:18px 0 7px;font-size:clamp(21px,3vw,29px)}.tenmei-mock-ad-intro{margin:0 0 20px;color:var(--muted,#777);font-size:13px;line-height:1.8}.tenmei-mock-ad-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.tenmei-mock-ad-card{min-width:0;padding:16px;border:1px solid var(--border,rgba(0,0,0,.12));border-radius:15px;background:var(--surface-elevated,#fff);display:flex;flex-direction:column;align-items:flex-start}.tenmei-mock-ad-meta{width:100%;display:flex;justify-content:space-between;gap:8px;color:var(--muted,#777);font:600 9px/1.4 system-ui,sans-serif;letter-spacing:.06em}.tenmei-mock-ad-tag{padding:3px 7px;border-radius:5px;background:rgba(179,143,82,.13);color:#987746}.tenmei-mock-ad-icon{margin:12px 0 5px;font-size:27px}.tenmei-mock-ad-card h3{margin:0 0 7px;font-size:17px}.tenmei-mock-ad-card p{margin:0 0 12px;color:var(--muted,#777);font-size:12px;line-height:1.75}.tenmei-mock-ad-price{margin-top:auto;padding:8px 0;font-size:12px}.tenmei-mock-ad-action{width:100%;margin-top:7px;padding:10px;border:1px solid rgba(174,139,78,.45);background:rgba(179,143,82,.12);color:inherit;font-size:12px}.tenmei-mock-ad-action:disabled{opacity:.6;cursor:default}.tenmei-mock-ad-card .tenmei-mock-ad-note{margin:9px 0 0;font-size:11px}.tenmei-mock-ad-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:18px;padding-top:14px;border-top:1px solid var(--border,rgba(0,0,0,.12))}.tenmei-mock-ad-footer p{margin:0;color:var(--muted,#777);font-size:10px;line-height:1.7}.tenmei-mock-ad-dismiss{padding:10px 17px;border:0;background:#3f493d;color:#fff;font-size:12px}@media(max-width:600px){.tenmei-mock-ad-stage{padding:8px;align-items:start}.tenmei-mock-ad-panel{max-height:94vh;padding:17px 13px;border-radius:17px}.tenmei-mock-ad-grid{grid-template-columns:1fr;gap:10px}.tenmei-mock-ad-footer{align-items:stretch;flex-direction:column}.tenmei-mock-ad-dismiss{width:100%}}@media(prefers-reduced-motion:reduce){.tenmei-mock-ad-stage{scroll-behavior:auto}}';
document.head.appendChild(style);

function normalize(value){try{return String(value||'').normalize('NFKC').toLowerCase().replace(/[\s\-_]+/g,'');}catch(_){return String(value||'').toLowerCase();}}
var originalTry=window._trySecretWord;
window._trySecretWord=function(word){var key=normalize(word);if(key==='koukoku'||key==='ads'||key==='advertisement'||key==='広告'){showGallery();return true;}return typeof originalTry==='function'?originalTry(word):false;};
var buffer='',resetTimer=null;
document.addEventListener('keydown',function(event){
 var target=event.target,tag=String(target&&target.tagName||'').toUpperCase();
 if(event.isComposing||event.keyCode===229||event.ctrlKey||event.metaKey||event.altKey||tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(target&&(target.isContentEditable||(target.closest&&target.closest('[role="textbox"]'))))){buffer='';return;}
 if(event.key.length!==1){buffer='';return;}
 var key=normalize(event.key);
 if(!/^[a-z0-9]$/.test(key)){buffer='';return;}
 buffer=(buffer+key).slice(-14);
 if(buffer.endsWith('koukoku')||buffer.endsWith('advertisement')||buffer.endsWith('ads')){buffer='';showGallery();}
 if(resetTimer)clearTimeout(resetTimer);resetTimer=setTimeout(function(){buffer='';},1800);
},false);

var armed=false,sessionKey='tenmei_mock_ads_shown';
window.setTimeout(function(){if(document.hidden)return;try{if(sessionStorage.getItem(sessionKey))return;}catch(_){}armed=true;},90000);
function maybeShow(){if(!armed||document.hidden)return;armed=false;try{if(sessionStorage.getItem(sessionKey))return;sessionStorage.setItem(sessionKey,'1');}catch(_){}if(Math.random()<.18)window.setTimeout(showGallery,650);}
['pointerdown','touchstart','keydown'].forEach(function(type){document.addEventListener(type,maybeShow,{once:true,passive:true});});
})();
