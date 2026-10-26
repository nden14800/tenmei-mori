(function(){
'use strict';
if(window.TenmeiSiteTTS)return;
const API='https://tenmei-mori-backend.nden14800.workers.dev/api/article-tts';
const VOICES=[{value:'ja-JP-NanamiNeural',label:'Nanami（女性）'},{value:'ja-JP-KeitaNeural',label:'Keita（男性）'}];
const RATES=[0.75,0.9,1,1.1,1.25,1.5,1.75,2].map(v=>({value:String(v),label:v+'倍'}));
let seq=0;
function split(text){
 const out=[];let cur='';
 const sentences=String(text||'').replace(/\s+/g,' ').trim().split(/(?<=[。！？.!?])\s*/);
 for(const sentence of sentences){if(!sentence)continue;
  if((cur+sentence).length>1500&&cur){out.push(cur.trim());cur='';}
  if(sentence.length>1500){for(let i=0;i<sentence.length;i+=1400)out.push(sentence.slice(i,i+1400));}
  else{if(cur&&!/\s$/.test(cur)&&!/^\s/.test(sentence))cur+=' ';cur+=sentence;}
 }
 if(cur.trim())out.push(cur.trim());return out;
}
function splitAnchored(nodes){
 const out=[];
 nodes.forEach(node=>{
  const text=(node.innerText||node.textContent||'').replace(/\s+/g,' ').trim();
  if(!text)return;
  split(text).forEach(part=>out.push({text,part,anchor:node}));
 });
 return out;
}
function makeChoice(id,label,options,icon){
 const shell=document.createElement('div');shell.className='tenmei-choice';shell.dataset.controlKind='choice';shell.dataset.controlId=id;shell.dataset.controlLabel=label;shell.dataset.options=JSON.stringify(options);
 shell.innerHTML='<input type="hidden" id="'+id+'" value="'+(options.find(x=>x.value==='1')?.value||options[0].value)+'"><button type="button" class="tenmei-choice__trigger" id="'+id+'-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="'+id+'-options" aria-label="'+label+'を選ぶ"><span class="tenmei-choice__icon" aria-hidden="true"><i class="bi '+icon+'"></i></span><span class="tenmei-choice__value"></span><i class="bi bi-chevron-down tenmei-choice__chevron" aria-hidden="true"></i></button><div class="tenmei-choice__popover" id="'+id+'-popover" hidden><div class="tenmei-choice__options" id="'+id+'-options" role="listbox" aria-label="'+label+'"></div></div>';
 return shell;
}
function installPlayerStyles(){
 if(document.getElementById('tenmei-site-tts-unified-styles'))return;
 const style=document.createElement('style');style.id='tenmei-site-tts-unified-styles';
 style.textContent=`.tenmei-site-tts-host{display:block;width:100%;min-width:0;clear:both}
.tenmei-site-tts-host:empty,.tenmei-site-tts-host[hidden]{display:none!important}
.tenmei-article-audio{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin:8px 0 12px;padding:5px 8px;border:1px solid var(--card-border,#e7ded7);border-radius:999px;background:var(--card-bg,#fffdfb);color:var(--text-main,#302923);font-family:'Zen Kaku Gothic New',sans-serif;font-size:.7rem;line-height:1.3}
.tenmei-article-audio *{box-sizing:border-box}
.tenmei-article-audio button{margin:0;min-height:0;font-family:inherit;line-height:1}
.tenmei-article-audio__title{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.tenmei-article-audio__bar{display:flex;flex:0 0 auto;align-items:center;gap:3px}
.tenmei-article-audio__button{position:relative;display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--text-sub,#786e67);font-size:.8rem;cursor:pointer}
.tenmei-article-audio__button:hover:not(:disabled){background:color-mix(in srgb,var(--accent-red,#8f252b) 9%,transparent);color:var(--accent-red,#8f252b)}
.tenmei-article-audio__button:disabled{opacity:.35;cursor:not-allowed}
.tenmei-article-audio__button--primary{width:30px;height:30px;background:var(--accent-red,#8f252b);color:#fff}
.tenmei-article-audio__button--primary:hover:not(:disabled){background:color-mix(in srgb,var(--accent-red,#8f252b) 86%,#000);color:#fff}
.tenmei-article-audio__button i{line-height:1}
.tenmei-article-audio__button span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.tenmei-article-audio__button:focus-visible,.tenmei-article-audio .tenmei-choice__trigger:focus-visible,.tenmei-article-audio .tenmei-choice__option:focus-visible,.tenmei-article-audio__seek:focus-visible{outline:2px solid var(--accent-gold,#c4a059);outline-offset:2px}
.tenmei-article-audio__spinner{width:13px;height:13px;animation:rotate 1s linear infinite}
.tenmei-article-audio__spinner .loader-path{stroke:currentColor;stroke-linecap:round;stroke-dasharray:89 150;stroke-dashoffset:0}
.tenmei-audio-seek-track{position:relative;flex:1 1 90px;min-width:70px;height:16px}
.tenmei-audio-seek-track::before{content:"";position:absolute;left:0;right:0;top:6px;height:4px;border-radius:999px;background:var(--card-border,#e7ded7)}
.tenmei-audio-seek-fill{position:absolute;z-index:1;left:0;top:6px;width:100%;height:4px;border-radius:999px;background:var(--accent-red,#8f252b);transform:scaleX(0);transform-origin:left center;pointer-events:none}
.tenmei-article-audio__seek{position:absolute;z-index:2;inset:0;width:100%;height:16px;margin:0;padding:0;border:0;background:transparent;appearance:none;-webkit-appearance:none;cursor:pointer;outline:none;touch-action:pan-y}
.tenmei-article-audio__seek:disabled{cursor:default}
.tenmei-article-audio__seek::-webkit-slider-runnable-track{height:16px;border:0;background:transparent}
.tenmei-article-audio__seek::-moz-range-track{height:16px;border:0;background:transparent}
.tenmei-article-audio__seek::-webkit-slider-thumb{-webkit-appearance:none;width:0;height:0;border:0;background:transparent}
.tenmei-article-audio__seek::-moz-range-thumb{width:0;height:0;border:0;background:transparent}
.tenmei-article-audio__time{flex:0 0 auto;color:var(--text-sub,#786e67);font-size:.64rem;font-variant-numeric:tabular-nums;white-space:nowrap}
.tenmei-article-audio__foot{display:flex;align-items:center;gap:5px;flex:0 0 auto;min-width:0}
.audio-count{color:var(--text-sub,#786e67);font-size:.6rem;font-variant-numeric:tabular-nums;white-space:nowrap}
.tenmei-article-audio__settings{display:flex;align-items:center;min-width:0}
.tenmei-article-audio__setting-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.tenmei-article-audio__rate-control{width:64px}
.tenmei-article-audio__voice-control{width:112px}
.tenmei-article-audio .tenmei-choice{width:100%;min-width:0;max-width:100%}
.tenmei-article-audio .tenmei-choice__trigger{display:flex;width:100%;min-width:0;height:24px;gap:3px;padding:0 6px;border-radius:999px;font-size:.62rem}
.tenmei-article-audio .tenmei-choice__value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tenmei-article-audio .tenmei-choice__popover{z-index:270;max-width:min(240px,calc(100vw - 32px))}
.tenmei-article-audio__status{flex-basis:100%;margin:0;font-size:.64rem;line-height:1.5;color:var(--accent-red,#8f252b)}
.tenmei-article-audio__status:not([data-state="error"]){display:none}
.tenmei-article-audio__active{background:color-mix(in srgb,var(--accent-gold,#c4a059) 17%,transparent)!important;border-radius:4px;scroll-margin:110px}
@media(max-width:560px){.tenmei-article-audio{border-radius:14px;padding:6px 8px}.tenmei-article-audio__foot{width:100%;justify-content:space-between}.tenmei-article-audio__rate-control{width:auto;flex:1 1 0}.tenmei-article-audio__voice-control{width:auto;flex:2 1 0}}
@media(prefers-reduced-motion:reduce){.tenmei-article-audio *{transition:none!important;scroll-behavior:auto!important}}
`;
 document.head.appendChild(style);
}
function create(target,title,providedText,anchorRoot){
 installPlayerStyles();
 if(!target||target.querySelector(':scope > .tenmei-article-audio'))return;
 const id='site-audio-'+(++seq);
 const anchorSelector='p,h1,h2,h3,h4,h5,li,blockquote,figcaption';
 const anchorNodes=anchorRoot?Array.from(anchorRoot.querySelectorAll(anchorSelector)).filter(el=>(el.innerText||el.textContent||'').trim().length>0&&!el.querySelector(anchorSelector)):[];
 // 記事では本文を先に一続きの文字列へ潰さず、DOMの段落・見出し単位で音声チャンクを作る。
 // これにより1つの音声が複数段落をまたいで、ハイライトが最初の段落に固定される問題を防ぐ。
 const anchored=anchorNodes.length?splitAnchored(anchorNodes):[];
 const parts=anchored.length?anchored.map(item=>item.part):split(providedText||target.innerText||target.textContent||'');
 const partAnchors=anchored.length?anchored.map(item=>item.anchor):parts.map(part=>{const key=part.replace(/\s+/g,' ').trim().slice(0,36);if(!key)return null;return anchorNodes.find(el=>(el.innerText||el.textContent||'').replace(/\s+/g,' ').includes(key))||null;});
 let activeAnchor=null;
 function highlightCurrentPart(){const next=partAnchors[index];if(activeAnchor&&activeAnchor!==next)activeAnchor.classList.remove('tenmei-article-audio__active');activeAnchor=next;if(activeAnchor){activeAnchor.classList.add('tenmei-article-audio__active');activeAnchor.scrollIntoView({behavior:'smooth',block:'center'});}}
 if(!parts.length)return;
 const sigText=parts.join('\n');
 const sig=sigText.length+'|'+sigText.slice(0,160)+'|'+sigText.slice(-160);
 if(Array.from(document.querySelectorAll('.tenmei-article-audio[data-site-tts="true"]')).some(p=>p.dataset.sig===sig)){
  if(target.classList.contains('tenmei-site-tts-host')&&!target.children.length)target.remove();
  return;
 }
 const player=document.createElement('section');player.className='tenmei-article-audio';player.setAttribute('aria-label','読み上げプレーヤー');player.dataset.siteTts='true';player.dataset.sig=sig;
player.innerHTML='<strong class="tenmei-article-audio__title"></strong><div class="tenmei-article-audio__bar"><button type="button" class="tenmei-article-audio__button tenmei-article-audio__button--primary audio-play"><i class="bi bi-play-fill"></i><span>再生</span></button><button type="button" class="tenmei-article-audio__button audio-prev" aria-label="前のセクション" title="前のセクション"><i class="bi bi-skip-backward-fill"></i></button><button type="button" class="tenmei-article-audio__button audio-next" aria-label="次のセクション" title="次のセクション"><i class="bi bi-skip-forward-fill"></i></button><button type="button" class="tenmei-article-audio__button audio-stop" aria-label="停止" title="停止"><i class="bi bi-stop-fill"></i></button></div><div class="tenmei-audio-seek-track"><span class="tenmei-audio-seek-fill"></span><input class="tenmei-article-audio__seek audio-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="再生位置" disabled></div><span class="tenmei-article-audio__time"><span class="audio-time-current">0:00</span>/<span class="audio-time-total">0:00</span></span><div class="tenmei-article-audio__foot"><span class="audio-count">1/'+parts.length+'</span><div class="tenmei-article-audio__settings tenmei-article-audio__rate-control"><span class="tenmei-article-audio__setting-label">速度</span></div><div class="tenmei-article-audio__settings tenmei-article-audio__settings--voice tenmei-article-audio__voice-control"><span class="tenmei-article-audio__setting-label">声</span></div></div><p class="tenmei-article-audio__status" role="status" aria-live="polite"></p>';
 player.querySelector('.tenmei-article-audio__title').textContent=title||'この内容を聴く';
 const rate=makeChoice(id+'-rate','再生速度',RATES,'bi-speedometer2'),voice=makeChoice(id+'-voice','読み上げ音声',VOICES,'bi-mic');
 rate.classList.add('tenmei-article-audio__rate-control');voice.classList.add('tenmei-article-audio__voice-control');
 player.querySelector('.tenmei-article-audio__settings').append(rate);player.querySelector('.tenmei-article-audio__settings--voice').append(voice);
 target.insertAdjacentElement('afterend',player);
 window.TenmeiCustomControls?.syncAll?.();
 const audio=new Audio();audio.preload='auto';audio.playsInline=true;audio.setAttribute('playsinline','');
 let index=0,busy=false,paused=false,rateValue=1,voiceValue=VOICES[0].value,generation=0,objectUrl='',decodedDuration=0;
 const $=sel=>player.querySelector(sel),status=(msg,state)=>{const el=$('.tenmei-article-audio__status');if(el){el.textContent=msg;el.dataset.state=state||'normal';}};
 const time=n=>{if(!Number.isFinite(n)||n<0)return'0:00';return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');};
 function mediaDuration(){return Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:decodedDuration;}
 async function measureDuration(blob,token){
  // MP3のXing/VBRIヘッダーがない音声でも、フレーム数から総時間を算出する。
  try{
   const bytes=new Uint8Array(await blob.arrayBuffer());
   let offset=0;
   if(bytes.length>10&&bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33){
    offset=10+((bytes[6]&0x7f)<<21)+((bytes[7]&0x7f)<<14)+((bytes[8]&0x7f)<<7)+(bytes[9]&0x7f);
   }
   const rates={
    '1-1':[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320],
    '1-2':[0,32,48,56,64,80,96,112,128,160,192,224,256,320,384],
    '1-3':[0,32,64,96,128,160,192,224,256,288,320,352,384,416,448],
    '2-1':[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160],
    '2-2':[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160],
    '2-3':[0,32,48,56,64,80,96,112,128,144,160,176,192,224,256]
   };
   let frames=0,totalSeconds=0;
   while(offset+4<=bytes.length){
    const h=(bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3];
    if((h>>>21)!==0x7ff){offset++;continue;}
    const version=(h>>>19)&3,layer=(h>>>17)&3,bitrateIndex=(h>>>12)&15,sampleIndex=(h>>>10)&3,padding=(h>>>9)&1;
    if(version===1||layer===0||bitrateIndex===0||bitrateIndex===15||sampleIndex===3){offset++;continue;}
    const versionKey=version===3?'1':'2',layerKey=String(layer),table=rates[versionKey+'-'+layerKey];
    const bitrate=table?.[bitrateIndex]*1000;
    const base=[44100,48000,32000][sampleIndex],sampleRate=version===3?base:version===2?base/2:base/4;
    const samples=layer===3?384:layer===1&&version!==3?576:1152;
    const frameLength=layer===3?Math.floor(12*bitrate/sampleRate+padding)*4:Math.floor((version!==3&&layer===1?72:144)*bitrate/sampleRate)+padding;
    if(!frameLength||offset+frameLength>bytes.length){offset++;continue;}
    totalSeconds+=samples/sampleRate;frames++;offset+=frameLength;
   }
   if(token===generation&&frames>=2&&Number.isFinite(totalSeconds)&&totalSeconds>0){decodedDuration=totalSeconds;update();return;}
  }catch(_){}
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return;
  let context;
  try{
   context=new AudioContextClass();
   const data=await blob.arrayBuffer();
   const decoded=await context.decodeAudioData(data.slice(0));
   if(token===generation&&Number.isFinite(decoded.duration)&&decoded.duration>0){decodedDuration=decoded.duration;update();}
  }catch(_){}
  finally{try{await context?.close();}catch(_){}}
 }
 let lastMediaTime=0,lastMediaStamp=0;
 function smoothCurrentTime(){
  if(audio.paused||audio.ended||!lastMediaStamp)return Number.isFinite(audio.currentTime)?audio.currentTime:0;
  const elapsed=Math.max(0,(performance.now()-lastMediaStamp)/1000);
  return Math.min(mediaDuration()||Infinity,lastMediaTime+elapsed*rateValue);
 }
 function syncMediaClock(){
  lastMediaTime=Number.isFinite(audio.currentTime)?audio.currentTime:0;
  lastMediaStamp=performance.now();
 }
 function update(){
  const duration=mediaDuration(),current=smoothCurrentTime(),seek=$('.audio-seek');
  seek.disabled=!duration;seek.value=duration?String(Math.min(100,current/duration*100)):'0';const percent=duration?Math.min(100,current/duration*100):0;seek.style.setProperty('--seek-progress',percent+'%');$('.tenmei-audio-seek-fill').style.transform='scaleX('+(percent/100)+')';seek.setAttribute('aria-valuetext',time(current)+' / '+time(duration));
  $('.audio-time-current').textContent=time(current);$('.audio-time-total').textContent=time(duration);
  const play=$('.audio-play'),playState=busy?'busy':paused?'paused':audio.src&&!audio.paused?'playing':'idle';if(play.dataset.state!==playState){play.dataset.state=playState;play.innerHTML=busy?'<svg class="loader-svg tenmei-article-audio__spinner" viewBox="0 0 50 50" aria-hidden="true"><circle class="loader-path" cx="25" cy="25" r="20" fill="none" stroke-width="1.5"></circle></svg><span>音声を準備中</span>':paused?'<i class="bi bi-play-fill"></i><span>再開</span>':playState==='playing'?'<i class="bi bi-pause-fill"></i><span>一時停止</span>':'<i class="bi bi-play-fill"></i><span>再生</span>';}
  play.disabled=busy||!parts.length;$('.audio-count').textContent=(index+1)+'/'+parts.length;
  $('.audio-prev').disabled=busy||index===0;$('.audio-next').disabled=busy||index>=parts.length-1;$('.audio-stop').disabled=busy&&!audio.src;
  }
 function prime(){const sampleRate=8000,sampleCount=800,buffer=new ArrayBuffer(44+sampleCount*2),view=new DataView(buffer);const write=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};write(0,'RIFF');view.setUint32(4,36+sampleCount*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,sampleCount*2,true);const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);audio.muted=true;audio.src='data:audio/wav;base64,'+btoa(binary);const activation=audio.play();audio.muted=false;if(activation&&typeof activation.then==='function')activation.then(()=>{audio.pause();}).catch(()=>{});}
 let progressFrame=0;
 function clean(){if(progressFrame)cancelAnimationFrame(progressFrame);progressFrame=0;lastMediaTime=0;lastMediaStamp=0;audio.pause();audio.onended=audio.onerror=audio.onloadedmetadata=audio.ontimeupdate=audio.ondurationchange=audio.onplay=audio.onpause=null;audio.removeAttribute('src');audio.load();decodedDuration=0;if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}}
 function stop(message){generation++;clean();if(activeAnchor)activeAnchor.classList.remove('tenmei-article-audio__active');activeAnchor=null;busy=false;paused=false;update();status(message||'停止しました。');}
 async function playPart(auto){
  if(index<0||index>=parts.length)return;
  const token=++generation;clean();busy=true;paused=false;update();status('日本語音声を生成しています…');
  try{
   const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:parts[index],voice:voiceValue}),credentials:'omit',cache:'no-store'});
   if(!response.ok){let body={};try{body=await response.json();}catch(_){}throw new Error(body.error||'音声を生成できませんでした。');}
   const blob=await response.blob();if(token!==generation)return;
   objectUrl=URL.createObjectURL(blob);audio.src=objectUrl;audio.playbackRate=rateValue;
   audio.onloadedmetadata=update;audio.ondurationchange=update;audio.ontimeupdate=()=>{syncMediaClock();update();};
   audio.onerror=()=>{if(token!==generation)return;busy=false;paused=false;update();status('音声データを再生できませんでした。再読み込みして再度お試しください。','error');};
   audio.load();
   if(!Number.isFinite(audio.duration)||audio.duration<=0)measureDuration(blob,token);
   const animateProgress=()=>{if(audio.paused||audio.ended)return;update();progressFrame=requestAnimationFrame(animateProgress);};
   audio.onplay=()=>{paused=false;syncMediaClock();if(progressFrame)cancelAnimationFrame(progressFrame);progressFrame=requestAnimationFrame(animateProgress);update();};audio.onpause=()=>{if(progressFrame)cancelAnimationFrame(progressFrame);progressFrame=0;if(!audio.ended&&!busy){paused=true;update();}};
   audio.onended=()=>{if(token!==generation)return;if(index<parts.length-1){index++;playPart(true);}else{if(activeAnchor)activeAnchor.classList.remove('tenmei-article-audio__active');activeAnchor=null;busy=false;paused=false;update();status('読み上げが完了しました。');}};
   busy=false;update();highlightCurrentPart();
   if(auto){try{await audio.play();status('読み上げ中');}catch(_){paused=true;update();status('音声の準備ができました。再生を押してください。');}}
   else{paused=true;update();status('音声の準備ができました。再生を押してください。');}
  }catch(error){if(token!==generation)return;busy=false;paused=false;update();status(error.message||'音声を生成できませんでした。','error');}
 }
 $('.audio-play').addEventListener('click',()=>{if(busy)return;if(audio.src&&paused){audio.play().then(()=>{paused=false;update();status('読み上げ中');}).catch(()=>status('再生を開始できませんでした。もう一度押してください。','error'));return;}if(audio.src&&!audio.paused){audio.pause();paused=true;update();status('一時停止中');return;}prime();playPart(true);});
 $('.audio-stop').addEventListener('click',()=>stop());
 $('.audio-prev').addEventListener('click',()=>{if(busy)return;index=Math.max(0,index-1);playPart(true);});
 $('.audio-next').addEventListener('click',()=>{if(busy)return;index=Math.min(parts.length-1,index+1);playPart(true);});
 $('.audio-seek').addEventListener('input',e=>{const duration=mediaDuration();if(audio.src&&duration){try{audio.currentTime=duration*(Number(e.target.value)/100);syncMediaClock();update();}catch(_){}}});
 rate.querySelector('input').addEventListener('change',e=>{rateValue=Number(e.target.value)||1;audio.playbackRate=rateValue;});
 voice.querySelector('input').addEventListener('change',e=>{voiceValue=e.target.value||VOICES[0].value;stop('読み上げ音声を変更しました。再生すると新しい声で生成します。');});
 update();
 const observer=new MutationObserver(()=>{if(!target.isConnected){stop('');observer.disconnect();}});
 observer.observe(document.documentElement,{childList:true,subtree:true});
 return player;
}
function extractFortuneText(result){
 const selector='.result-poem-part,.result-desc-part,.detail-column,.lucky-area';
 const matches=Array.from(result.querySelectorAll(selector)).filter(node=>!node.matches('.hidden,.d-none,.visually-hidden,.sr-only,[aria-hidden="true"],[hidden]'));
 const roots=matches.filter(node=>!matches.some(other=>other!==node&&other.contains(node)));
 return roots.map(node=>{
  const clone=node.cloneNode(true);
  clone.querySelectorAll('svg,script,style,button,input,textarea,select,nav,form,.tenmei-choice,.tenmei-article-audio,.tenmei-site-tts-host,.hidden,.d-none,.visually-hidden,.sr-only,[aria-hidden="true"],[hidden]').forEach(child=>child.remove());
  return (clone.innerText||clone.textContent||'').replace(/\\s+/g,' ').trim();
 }).filter(Boolean).join('\\n');
}
function scan(){
 const result=document.querySelector('#view-result:not(.hidden) #result-display-area');
 if(result){
  // おみくじTTSは結果のヒーローカード直下に置き、他ページの本文直前配置と同じ流れにする。
  const hero=result.querySelector('.omikuji-result-v4-hero');
  const hosts=Array.from(result.querySelectorAll(':scope > .tenmei-site-tts-host[data-omikuji-tts-source="true"]'));
  const holder=hosts.shift()||null;
  hosts.forEach(extra=>{
   const extraPlayer=extra.nextElementSibling;
   if(extraPlayer?.dataset.siteTts==='true'){extraPlayer.querySelector('.audio-stop')?.click();extraPlayer.remove();}
   extra.remove();
  });
  if(holder){
   const player=holder.nextElementSibling;
   if(!player?.matches('.tenmei-article-audio[data-site-tts="true"]')){
    const text=extractFortuneText(result);
    if(text.trim())create(holder,'今日のおみくじを聴く',text);
   }
  }else if(hero){
   const text=extractFortuneText(result);
   if(text.trim()){
    const nextHolder=document.createElement('div');
    nextHolder.className='tenmei-site-tts-host';
    nextHolder.hidden=true;
    nextHolder.setAttribute('aria-hidden','true');
    nextHolder.dataset.omikujiTtsSource='true';
    nextHolder.textContent=text;
    // ヒーローカードの直後。結果画面の外側やヒーローカードの上には置かない。
    hero.insertAdjacentElement('afterend',nextHolder);
    create(nextHolder,'今日のおみくじを聴く',text);
   }
  }
 }
 // 1つの回答・要約には必ず1つだけプレーヤーを付ける。入れ子（親子）になっている要素は、どちらか一方だけを対象にする。
 const targets=[
  ['#summary-result','記事のAI要約'],
  ['#dream-response-area','夢の解釈'],
  ['#worry-response-area','AI相談の回答'],
  ['.tenmei-ai-message--assistant .tenmei-ai-response:not(.is-loading)','AI案内の回答']
 ];
 targets.forEach(([selector,label])=>document.querySelectorAll(selector).forEach(el=>{
  if(el.dataset.ttsRoot==='true'||el.closest('[data-tts-root],.tenmei-article-audio,.tenmei-site-tts-host,.document-history-preview,#document-history-content,#document-history-dialog'))return;
  if(el.querySelector('[data-tts-root]'))return;
  if(el.hidden||el.closest('[hidden],.hidden,.d-none'))return;
  const clone=el.cloneNode(true);
  clone.querySelectorAll('button,input,textarea,select,script,style,svg,nav,form,.tenmei-choice,.tenmei-article-audio,.tenmei-site-tts-host,.hidden,.d-none,[aria-hidden="true"],[hidden]').forEach(node=>node.remove());
  const text=(clone.innerText||clone.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
  if(text.length<35)return;
  el.dataset.ttsRoot='true';
  const holder=document.createElement('div');holder.className='tenmei-site-tts-host';
  el.insertAdjacentElement('beforebegin',holder);create(holder,label,text);
 }));
 scanArticleReader();
}
function scanArticleReader(){
 const root=document.querySelector('#view-article-detail');
 if(!root||root.closest('.document-history-preview,#document-history-content')||root.hidden||root.classList.contains('hidden')||root.classList.contains('d-none')||root.getAttribute('aria-hidden')==='true'||!root.getClientRects().length)return;
 const content=root.querySelector('#article-detail-content');
 if(!content)return;
 content.querySelectorAll('.tenmei-article-audio:not([data-site-tts="true"])').forEach(el=>el.remove());
 const body=content.querySelector('.column-reader-body .article-content,.news-chronicle-body .article-content,.column-reader-body,.news-chronicle-body,article .article-content,.article-content');
 if(!body)return;
 const clone=body.cloneNode(true);
 clone.querySelectorAll('button,input,textarea,select,script,style,svg,nav,form,.tenmei-choice,.tenmei-article-audio,.tenmei-site-tts-host,.hidden,.d-none,[aria-hidden="true"],[hidden]').forEach(node=>node.remove());
 const text=(clone.innerText||clone.textContent||'').replace(/\\n{3,}/g,'\\n\\n').trim();
 if(text.length<20)return;
 const signature=text.length+':'+text.slice(0,96)+':'+text.slice(-96);
 const holder=content.querySelector('.tenmei-site-tts-host[data-article-tts="true"]');
 const mountedPlayer=holder?.nextElementSibling;
 if(holder&&holder.dataset.signature===signature&&mountedPlayer?.dataset.siteTts==='true')return;
 if(holder){const oldPlayer=holder.nextElementSibling;if(oldPlayer?.dataset.siteTts==='true'){oldPlayer.querySelector('.audio-stop')?.click();oldPlayer.remove();}holder.remove();}
 const host=document.createElement('div');host.className='tenmei-site-tts-host';host.dataset.articleTts='true';host.dataset.signature=signature;
 body.insertAdjacentElement('beforebegin',host);
 const title=content.querySelector('.column-reader-title,.news-chronicle-title')?.textContent?.trim()||'この記事';
 create(host,title+'を聴く',text,body);
}
window.TenmeiSiteTTS={scan,stopAll:function(){document.querySelectorAll('.tenmei-article-audio[data-site-tts="true"]').forEach(x=>x.querySelector('.audio-stop')?.click());}};
let articleMountGeneration=0;
function mountArticleAfterOpen(){
 const token=++articleMountGeneration;let attempts=0;
 const attempt=()=>{
  if(token!==articleMountGeneration)return;
  const root=document.querySelector('#view-article-detail');
  if(root&&root.getClientRects().length)scanArticleReader();
  const player=root?.querySelector('.tenmei-article-audio[data-site-tts="true"]');
  if(player)return;
  if(attempts++<12)requestAnimationFrame(attempt);
 };
 requestAnimationFrame(()=>requestAnimationFrame(attempt));
}
const originalOpen=window.openArticle;
if(typeof originalOpen==='function'&&!originalOpen.__tenmeiSiteTTSWrapped){
 const wrappedOpen=function(...args){
  const result=originalOpen.apply(this,args);
  mountArticleAfterOpen();
  return result;
 };
 wrappedOpen.__tenmeiSiteTTSWrapped=true;
 window.openArticle=wrappedOpen;
}
document.dispatchEvent(new Event('tenmei:tts-ready'));
let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan();});};
const mo=new MutationObserver(schedule);mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden','aria-hidden']});
document.addEventListener('click',e=>{if(e.target.closest('.article-reader-back'))window.TenmeiSiteTTS.stopAll();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
