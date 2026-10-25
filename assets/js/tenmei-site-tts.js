(function(){
'use strict';
if(window.TenmeiSiteTTS)return;
const API='https://tenmei-mori-backend.nden14800.workers.dev/api/article-tts';
const VOICES=[{value:'ja-JP-NanamiNeural',label:'Nanami（女性）'},{value:'ja-JP-KeitaNeural',label:'Keita（男性）'}];
const RATES=[0.75,0.9,1,1.1,1.25,1.5,1.75,2].map(v=>({value:String(v),label:v+'倍'}));
let seq=0;
function split(text){
 const out=[];let cur='';
 const sentences=String(text||'').replace(/\s+/g,' ').split(/(?<=[。！？.!?])\s*/);
 for(const sentence of sentences){if(!sentence)continue;if((cur+sentence).length>1500&&cur){out.push(cur);cur='';}
 if(sentence.length>1500){for(let i=0;i<sentence.length;i+=1400)out.push(sentence.slice(i,i+1400));}else cur+=sentence;}
 if(cur)out.push(cur);return out;
}
function makeChoice(id,label,options,icon){
 const shell=document.createElement('div');shell.className='tenmei-choice';shell.dataset.controlKind='choice';shell.dataset.controlId=id;shell.dataset.controlLabel=label;shell.dataset.options=JSON.stringify(options);
 shell.innerHTML='<input type="hidden" id="'+id+'" value="'+(options.find(x=>x.value==='1')?.value||options[0].value)+'"><button type="button" class="tenmei-choice__trigger" id="'+id+'-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="'+id+'-options" aria-label="'+label+'を選ぶ"><span class="tenmei-choice__icon" aria-hidden="true"><i class="bi '+icon+'"></i></span><span class="tenmei-choice__value"></span><i class="bi bi-chevron-down tenmei-choice__chevron" aria-hidden="true"></i></button><div class="tenmei-choice__popover" id="'+id+'-popover" hidden><div class="tenmei-choice__options" id="'+id+'-options" role="listbox" aria-label="'+label+'"></div></div>';
 return shell;
}
function create(target,title,providedText){
 if(!target||target.querySelector(':scope > .tenmei-article-audio'))return;
 const id='site-audio-'+(++seq),parts=split(providedText||target.innerText||target.textContent||'');
 if(!parts.length)return;
 const player=document.createElement('section');player.className='tenmei-article-audio';player.setAttribute('aria-label','読み上げプレーヤー');player.dataset.siteTts='true';
 player.innerHTML='<div class="tenmei-article-audio__top"><div class="tenmei-article-audio__heading"><span class="tenmei-article-audio__eyebrow">TENMEI AUDIO</span><strong class="tenmei-article-audio__title"></strong></div><span class="tenmei-article-audio__duration">日本語音声</span></div><div class="tenmei-article-audio__transport"><button type="button" class="tenmei-article-audio__button tenmei-article-audio__button--primary audio-play"><i class="bi bi-play-fill"></i><span>再生</span></button><button type="button" class="tenmei-article-audio__button audio-back10" aria-label="10秒戻す" title="10秒戻す"><i class="bi bi-rewind"></i></button><button type="button" class="tenmei-article-audio__button audio-forward10" aria-label="10秒進める" title="10秒進める"><i class="bi bi-fast-forward"></i></button><button type="button" class="tenmei-article-audio__button audio-prev" aria-label="前のセクション"><i class="bi bi-skip-backward-fill"></i></button><button type="button" class="tenmei-article-audio__button audio-next" aria-label="次のセクション"><i class="bi bi-skip-forward-fill"></i></button><button type="button" class="tenmei-article-audio__button audio-stop"><i class="bi bi-stop-fill"></i><span>停止</span></button></div><div class="tenmei-article-audio__timeline"><input class="tenmei-article-audio__seek audio-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="現在の音声の再生位置" disabled><div class="tenmei-article-audio__meta"><span class="audio-time-current">0:00</span><span class="audio-count">1 / '+parts.length+' セクション</span><span class="audio-time-total">0:00</span></div></div><div class="tenmei-article-audio__settings"><span class="tenmei-article-audio__setting-label">速度</span></div><div class="tenmei-article-audio__settings tenmei-article-audio__settings--voice"><span class="tenmei-article-audio__setting-label">声</span></div><p class="tenmei-article-audio__status" role="status" aria-live="polite">再生ボタンを押すと連続して読み上げます。</p>';
 player.querySelector('.tenmei-article-audio__title').textContent=title||'この内容を聴く';
 const rate=makeChoice(id+'-rate','再生速度',RATES,'bi-speedometer2'),voice=makeChoice(id+'-voice','読み上げ音声',VOICES,'bi-mic');
 rate.classList.add('tenmei-article-audio__rate-control');voice.classList.add('tenmei-article-audio__voice-control');
 player.querySelector('.tenmei-article-audio__settings').append(rate);player.querySelector('.tenmei-article-audio__settings--voice').append(voice);
 target.insertAdjacentElement('afterend',player);
 window.TenmeiCustomControls?.syncAll?.();
 const audio=new Audio();audio.preload='auto';audio.playsInline=true;audio.setAttribute('playsinline','');
 let index=0,busy=false,paused=false,rateValue=1,voiceValue=VOICES[0].value,generation=0,objectUrl='';
 const $=sel=>player.querySelector(sel),status=(msg,state)=>{const el=$('.tenmei-article-audio__status');if(el){el.textContent=msg;el.dataset.state=state||'normal';}};
 const time=n=>{if(!Number.isFinite(n)||n<0)return'0:00';return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');};
 function update(){
  const duration=Number.isFinite(audio.duration)?audio.duration:0,current=audio.currentTime||0,seek=$('.audio-seek');
  seek.disabled=!duration;seek.value=duration?String(current/duration*100):'0';seek.style.setProperty('--seek-progress',(duration?current/duration*100:0)+'%');
  $('.audio-time-current').textContent=time(current);$('.audio-time-total').textContent=time(duration);
  const play=$('.audio-play');play.innerHTML=busy?'<i class="bi bi-arrow-repeat"></i><span>音声を準備中</span>':paused?'<i class="bi bi-play-fill"></i><span>再開</span>':audio.src&&!audio.paused?'<i class="bi bi-pause-fill"></i><span>一時停止</span>':'<i class="bi bi-play-fill"></i><span>再生</span>';
  play.disabled=busy||!parts.length;$('.audio-count').textContent=(index+1)+' / '+parts.length+' セクション';
  $('.audio-prev').disabled=busy||index===0;$('.audio-next').disabled=busy||index>=parts.length-1;$('.audio-stop').disabled=busy&&!audio.src;
  $('.audio-back10').disabled=$('.audio-forward10').disabled=!audio.src||!duration;
 }
 function prime(){const sampleRate=8000,sampleCount=800,buffer=new ArrayBuffer(44+sampleCount*2),view=new DataView(buffer);const write=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};write(0,'RIFF');view.setUint32(4,36+sampleCount*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,sampleCount*2,true);const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);audio.muted=true;audio.src='data:audio/wav;base64,'+btoa(binary);const activation=audio.play();audio.muted=false;if(activation&&typeof activation.then==='function')activation.then(()=>{audio.pause();}).catch(()=>{});}
 function clean(){audio.pause();audio.onended=audio.onerror=audio.onloadedmetadata=audio.ontimeupdate=audio.onplay=audio.onpause=null;audio.removeAttribute('src');audio.load();if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}}
 function stop(message){generation++;clean();busy=false;paused=false;update();status(message||'停止しました。');}
 async function playPart(auto){
  if(index<0||index>=parts.length)return;
  const token=++generation;clean();busy=true;paused=false;update();status('日本語音声を生成しています…');
  try{
   const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:parts[index],voice:voiceValue}),credentials:'omit',cache:'no-store'});
   if(!response.ok){let body={};try{body=await response.json();}catch(_){}throw new Error(body.error||'音声を生成できませんでした。');}
   const blob=await response.blob();if(token!==generation)return;
   objectUrl=URL.createObjectURL(blob);audio.src=objectUrl;audio.playbackRate=rateValue;audio.load();
   audio.onloadedmetadata=update;audio.ontimeupdate=update;audio.onerror=()=>{if(token!==generation)return;busy=false;paused=false;update();status('音声データを再生できませんでした。再読み込みして再度お試しください。','error');};
   audio.onplay=()=>{paused=false;update();};audio.onpause=()=>{if(!audio.ended&&!busy){paused=true;update();}};
   audio.onended=()=>{if(token!==generation)return;if(index<parts.length-1){index++;playPart(true);}else{busy=false;paused=false;update();status('読み上げが完了しました。');}};
   busy=false;update();
   if(auto){try{await audio.play();status('読み上げ中 · Microsoft Edge TTS');}catch(_){paused=true;update();status('音声の準備ができました。再生を押してください。');}}
   else{paused=true;update();status('音声の準備ができました。再生を押してください。');}
  }catch(error){if(token!==generation)return;busy=false;paused=false;update();status(error.message||'音声を生成できませんでした。','error');}
 }
 $('.audio-play').addEventListener('click',()=>{if(busy)return;if(audio.src&&paused){audio.play().then(()=>{paused=false;update();status('読み上げ中 · Microsoft Edge TTS');}).catch(()=>status('再生を開始できませんでした。もう一度押してください。','error'));return;}if(audio.src&&!audio.paused){audio.pause();paused=true;update();status('一時停止中');return;}prime();playPart(true);});
 $('.audio-stop').addEventListener('click',()=>stop());
 $('.audio-prev').addEventListener('click',()=>{if(busy)return;index=Math.max(0,index-1);playPart(true);});
 $('.audio-next').addEventListener('click',()=>{if(busy)return;index=Math.min(parts.length-1,index+1);playPart(true);});
 $('.audio-back10').addEventListener('click',()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,audio.currentTime-10);});
 $('.audio-forward10').addEventListener('click',()=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,audio.currentTime+10);});
 $('.audio-seek').addEventListener('input',e=>{if(audio.src&&Number.isFinite(audio.duration)){audio.currentTime=audio.duration*(Number(e.target.value)/100);update();}});
 rate.querySelector('input').addEventListener('change',e=>{rateValue=Number(e.target.value)||1;audio.playbackRate=rateValue;});
 voice.querySelector('input').addEventListener('change',e=>{voiceValue=e.target.value||VOICES[0].value;stop('読み上げ音声を変更しました。再生すると新しい声で生成します。');});
 update();
 const observer=new MutationObserver(()=>{if(!target.isConnected){stop('');observer.disconnect();}});
 observer.observe(document.documentElement,{childList:true,subtree:true});
 return player;
}
function scan(){
 const result=document.querySelector('#view-result:not(.hidden) #result-display-area');
 if(result&&!result.querySelector('.tenmei-site-tts-host')){
  const source=result.querySelector('.result-main-message-area')||result.querySelector('.result-v4-reading-guide');
  if(source){const text=Array.from(result.querySelectorAll('.result-poem-part,.result-desc-part,.detail-column,.lucky-area')).map(x=>x.innerText||x.textContent||'').join('\n');if(text.trim()){const holder=document.createElement('div');holder.className='tenmei-site-tts-host';holder.hidden=true;holder.textContent=text;source.insertAdjacentElement('afterend',holder);create(holder,'今日のおみくじを聴く',text);}}
 }
 document.querySelectorAll('[data-ai-response-text],.tenmei-ai-response-text').forEach(el=>{
  if(el.closest('.tenmei-article-audio')||el.dataset.ttsMounted==='true')return;
  const text=(el.innerText||el.textContent||'').trim();if(text.length<20||el.closest('.hidden,[hidden]'))return;
  el.dataset.ttsMounted='true';
  const holder=document.createElement('div');holder.className='tenmei-site-tts-host';
  el.insertAdjacentElement('afterend',holder);create(holder,el.closest('#dream-response-area')?'夢の解釈を聴く':el.closest('#worry-response-area')?'AI相談の回答を聴く':'AIの回答を聴く',text);
 });
 // 旧プレーヤーが担当していたページも、記事と同じ共通プレーヤーで処理する。
 const sharedTargets=[
  ['#my-rank-result','あなたの星座・血液型順位'],
  ['#ranking-list','本日の運勢ランキング'],
  ['#full-ranking-list','運勢ランキングの続き'],
  ['#summary-result','記事のAI要約'],
  ['#document-history-content','改定履歴の本文'],
  ['#about-content-area','当サイトについて'],
  ['#privacy-content-area','プライバシーポリシー'],
  ['#howto-content-area','使い方'],
  ['.tenmei-ai-message--assistant .tenmei-ai-response:not(.is-loading)','AI案内の回答']
 ];
 sharedTargets.forEach(([selector,label])=>document.querySelectorAll(selector).forEach(el=>{
  if(el.dataset.ttsMounted==='true'||el.closest('.tenmei-article-audio,.tenmei-site-tts-host'))return;
  if(el.hidden||el.closest('[hidden],.hidden,.d-none'))return;
  const text=(el.innerText||el.textContent||'').trim();
  if(text.length<35)return;
  el.dataset.ttsMounted='true';
  const holder=document.createElement('div');holder.className='tenmei-site-tts-host';
  el.insertAdjacentElement('afterend',holder);create(holder,label,text);
 }));
}
window.TenmeiSiteTTS={scan,stopAll:function(){document.querySelectorAll('.tenmei-article-audio[data-site-tts="true"]').forEach(x=>x.querySelector('.audio-stop')?.click());}};
document.dispatchEvent(new Event('tenmei:tts-ready'));
let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan();});};
const mo=new MutationObserver(schedule);mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
document.addEventListener('click',e=>{if(e.target.closest('.article-reader-back'))window.TenmeiSiteTTS.stopAll();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
