(function () {
"use strict";
const API_URL="https://tenmei-mori-backend.nden14800.workers.dev/api/ai-guide";
const PREF_KEY="tenmei_cookie_preferences_v2", PREF_VERSION=4;
const state={mounted:false,busy:false,messages:[],root:null,button:null,panel:null,list:null,input:null,send:null,hint:null,controller:null,generation:0,escapeHandler:null,loadingItem:null,closeTimer:null};
function consentGranted(){try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||"null");return !!p&&p.version===PREF_VERSION&&p.supportChat===true;}catch(_){return false;}}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function icon(name){const n=el("i","bi "+name);n.setAttribute("aria-hidden","true");return n;}
function siteSpinner(){const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("class","loader-svg");svg.setAttribute("viewBox","0 0 50 50");svg.setAttribute("aria-hidden","true");const circle=document.createElementNS("http://www.w3.org/2000/svg","circle");circle.setAttribute("class","loader-path");circle.setAttribute("cx","25");circle.setAttribute("cy","25");circle.setAttribute("r","20");circle.setAttribute("fill","none");circle.setAttribute("stroke-width","1.5");svg.appendChild(circle);return svg;}
function addWelcome(){const welcome=el("div","tenmei-ai-welcome");welcome.append(icon("bi-chat-square-text"),el("p","","サイト内の機能や操作方法について、気軽に聞いてください。"));state.list.appendChild(welcome);}

function getVisibleUiContext(){
const isVisible=function(node){const r=node.getBoundingClientRect(),style=window.getComputedStyle(node);return r.width>0&&r.height>0&&r.bottom>0&&r.top<window.innerHeight&&style.display!=="none"&&style.visibility!=="hidden"&&style.opacity!=="0";};
const clean=function(value){const text=String(value||"").replace(/\s+/g," ").trim();if(!text||text.length>90||/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)||/(?:\+?81[-\s]?)?0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/.test(text))return "";return text;};
const headings=Array.from(document.querySelectorAll("h1,h2,h3")).filter(isVisible).map(function(node){return clean(node.innerText||node.textContent);}).filter(Boolean).slice(0,8);
const controls=Array.from(document.querySelectorAll("button,[role=button],a[href]")).filter(isVisible).map(function(node){const r=node.getBoundingClientRect();const label=clean(node.getAttribute("aria-label")||node.getAttribute("title")||node.innerText||node.textContent);if(!label)return null;const zone=r.top<window.innerHeight/3?"上部":r.top<window.innerHeight*2/3?"中央":"下部";return {label:label,zone:zone};}).filter(Boolean).slice(0,12);
return {pageTitle:clean(document.title)||"",headings:headings,controls:controls};
}
function renderInlineMarkdown(parent,source){
const tokenPattern=/(\*\*[^*\n]+?\*\*|__[^_\n]+?__|\`[^\`]+?\`|\*[^*\n]+?\*|_[^_\n]+?_|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g;
let cursor=0,match;
while((match=tokenPattern.exec(source))){
if(match.index>cursor)parent.appendChild(document.createTextNode(source.slice(cursor,match.index)));
const token=match[0];let node=null;
if(token.startsWith("**")||token.startsWith("__")){node=document.createElement("strong");node.textContent=token.slice(2,-2);}
else if(token.startsWith("*")||token.startsWith("_")){node=document.createElement("em");node.textContent=token.slice(1,-1);}
else if(token.startsWith("\`")){node=document.createElement("code");node.className="tenmei-ai-inline-code";node.textContent=token.slice(1,-1);}
else{
const imageMatch=token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
const linkMatch=token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
if(imageMatch){node=document.createTextNode(imageMatch[1]||"画像");}
else if(linkMatch){
try{const url=new URL(linkMatch[2],window.location.origin);if(url.protocol==="https:"||url.protocol==="http:"){node=document.createElement("a");node.href=url.href;node.textContent=linkMatch[1];node.rel="noopener noreferrer";node.target="_blank";}}
catch(_){}
if(!node)node=document.createTextNode(linkMatch[1]);
}
}
parent.appendChild(node||document.createTextNode(token));cursor=tokenPattern.lastIndex;
}
if(cursor<source.length)parent.appendChild(document.createTextNode(source.slice(cursor)));
}
function markdownCells(line){return line.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(function(cell){return cell.trim().replace(/\\\|/g,"|");});}
function renderMarkdown(container,source){
container.replaceChildren();
const lines=String(source??"").replace(/\r\n?/g,"\n").split("\n");let i=0;
function isTableAt(index){return index+1<lines.length&&lines[index].includes("|")&&/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index+1]);}
function isBlockStart(index){const line=lines[index]||"";return !line.trim()||/^ {0,3}(\`{3,}|~{3,}|#{1,6}\s|>\s?|[-*+]\s|\d+[.)]\s)/.test(line)||isTableAt(index);}
while(i<lines.length){
const line=lines[i];
if(!line.trim()){i++;continue;}
const fence=line.match(/^ {0,3}(\`{3,}|~{3,})\s*([A-Za-z0-9_+.-]*)\s*$/);
if(fence){
const marker=fence[1],language=fence[2]||"";i++;const codeLines=[];
while(i<lines.length&&!new RegExp("^ {0,3}"+marker[0]+"{"+marker.length+",}\\s*$").test(lines[i]))codeLines.push(lines[i++]);
if(i<lines.length)i++;
const wrap=document.createElement("div");wrap.className="tenmei-ai-code-block";
const toolbar=document.createElement("div");toolbar.className="tenmei-ai-code-toolbar";
const lang=document.createElement("span");lang.className="tenmei-ai-code-language";lang.textContent=language||"コード";
const copy=document.createElement("button");copy.type="button";copy.className="tenmei-ai-code-copy";copy.textContent="コードをコピー";
const pre=document.createElement("pre"),code=document.createElement("code");if(language)code.className="language-"+language;code.textContent=codeLines.join("\n");pre.appendChild(code);
copy.addEventListener("click",async function(){try{await navigator.clipboard.writeText(code.textContent);copy.textContent="コピーしました";}catch(_){copy.textContent="コピーできません";}window.setTimeout(function(){copy.textContent="コードをコピー";},1600);});
toolbar.append(lang,copy);wrap.append(toolbar,pre);container.appendChild(wrap);continue;
}
const heading=line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
if(heading){const h=document.createElement("h"+heading[1].length);h.className="tenmei-ai-md-heading";renderInlineMarkdown(h,heading[2]);container.appendChild(h);i++;continue;}
if(/^ {0,3}>\s?/.test(line)){
const quote=document.createElement("blockquote");quote.className="tenmei-ai-md-quote";
while(i<lines.length&&/^ {0,3}>\s?/.test(lines[i])){const p=document.createElement("p");renderInlineMarkdown(p,lines[i++].replace(/^ {0,3}>\s?/,""));quote.appendChild(p);}
container.appendChild(quote);continue;
}
if(isTableAt(i)){
const headers=markdownCells(lines[i]),rows=[];i+=2;
while(i<lines.length&&lines[i].trim()&&lines[i].includes("|")){rows.push(markdownCells(lines[i]));i++;}
const tableWrap=document.createElement("div");tableWrap.className="tenmei-ai-table-wrap";
const table=document.createElement("table");table.className="tenmei-ai-md-table";
const thead=document.createElement("thead"),tr=document.createElement("tr");
headers.forEach(function(value){const th=document.createElement("th");renderInlineMarkdown(th,value);tr.appendChild(th);});thead.appendChild(tr);table.appendChild(thead);
const tbody=document.createElement("tbody");rows.forEach(function(row){const rowEl=document.createElement("tr");headers.forEach(function(_,index){const td=document.createElement("td");renderInlineMarkdown(td,row[index]||"");rowEl.appendChild(td);});tbody.appendChild(rowEl);});table.appendChild(tbody);tableWrap.appendChild(table);container.appendChild(tableWrap);continue;
}
const listMatch=line.match(/^ {0,3}([-*+]|\d+[.)])\s+(.+)$/);
if(listMatch){
const ordered=/^\d/.test(listMatch[1]),list=document.createElement(ordered?"ol":"ul");list.className="tenmei-ai-md-list";
while(i<lines.length){const m=lines[i].match(/^ {0,3}([-*+]|\d+[.)])\s+(.+)$/);if(!m||/^\d/.test(m[1])!==ordered)break;const li=document.createElement("li");renderInlineMarkdown(li,m[2]);list.appendChild(li);i++;}
container.appendChild(list);continue;
}
const paragraph=document.createElement("p");paragraph.className="tenmei-ai-md-paragraph";const parts=[];
while(i<lines.length&&lines[i].trim()&&!isBlockStart(i)){parts.push(lines[i].trim());i++;}
if(!parts.length){parts.push(lines[i++]);}
renderInlineMarkdown(paragraph,parts.join(" "));container.appendChild(paragraph);
}
}

function addMessage(role,content){
const item=el("article","tenmei-ai-message tenmei-ai-message--"+role);
item.appendChild(el("div","tenmei-ai-message__label",role==="user"?"あなた":""));
if(role==="user"){item.appendChild(el("div","tenmei-ai-message__text",content));}
else{
const card=el("section","tenmei-ai-response"),head=el("div","tenmei-ai-response-head"),kicker=el("span","tenmei-ai-response-kicker");
kicker.append(icon("bi-stars"),document.createTextNode(" AI案内"));head.appendChild(kicker);
const info=el("button","tenmei-ai-info-btn");info.type="button";info.setAttribute("aria-expanded","false");info.setAttribute("aria-label","このAI回答について");
info.append(icon("bi-info-circle"),el("span","","情報"));
const details=el("div","tenmei-ai-info-panel");details.hidden=true;
const infoTitle=el("p","","AI案内について"),strong=el("strong","","AI案内について");infoTitle.replaceChildren(strong);
const infoList=el("dl","tenmei-ai-info-list");
[
["使用モデル","Cloudflare Workers AI（GLM-4.7-Flash）"],
["入力","今回の質問・直近の会話（最大10件）・送信時に画面内で見えている見出しと操作ラベル（入力欄の値は含みません）"],
["用途","天命乃杜の公開機能・使い方の案内"],
["保存","会話履歴はデータベース、アカウント、ブラウザー内ストレージへ保存されません。"],
["注意","個人情報・パスワード・認証コードは入力しないでください。回答には誤りが含まれる場合があり、医療・法律・金融などの専門的判断や断定的な予言を行うものではありません。"],
["対応範囲","アカウント操作、データ変更、有人対応、運営者への転送は行いません。"]
].forEach(function(entry){const row=el("div",""),term=el("dt","",entry[0]),description=el("dd","",entry[1]);row.append(term,description);infoList.appendChild(row);});
details.append(infoTitle,infoList);
info.addEventListener("click",function(){const opening=details.hidden;details.hidden=!opening;info.setAttribute("aria-expanded",String(opening));const label=info.querySelector("span");if(label)label.textContent=opening?"閉じる":"情報";});
head.appendChild(info);const responseBody=el("div","tenmei-ai-response-text");renderMarkdown(responseBody,content);card.append(head,responseBody,details);item.appendChild(card);
}
state.list.appendChild(item);state.list.scrollTop=state.list.scrollHeight;return item;
}
function addLoading(){const item=el("article","tenmei-ai-message tenmei-ai-message--assistant"),card=el("section","tenmei-ai-response is-loading"),head=el("div","tenmei-ai-response-head"),kicker=el("span","tenmei-ai-response-kicker");kicker.append(icon("bi-stars"),document.createTextNode(" AI案内"));const status=el("span","tenmei-ai-generating-label");status.append(el("span","tenmei-ai-dot"),document.createTextNode("生成中"));head.append(kicker,status);const skeleton=el("div","tenmei-ai-skeleton");skeleton.append(el("span"),el("span"),el("span"));card.append(head,skeleton);item.appendChild(card);state.list.appendChild(item);state.list.setAttribute("aria-busy","true");state.list.scrollTop=state.list.scrollHeight;return item;}
function updateComposer(){const length=state.input.value.length;state.hint.textContent=length+" / 800文字";state.send.disabled=state.busy||!state.input.value.trim();state.send.replaceChildren(state.busy?siteSpinner():icon("bi-arrow-up"));state.send.setAttribute("aria-label",state.busy?"回答を生成しています":"質問を送信");state.input.disabled=state.busy;}
function setBusy(value){state.busy=value;updateComposer();}
async function submit(value){
const rawQuestion=String(value??"");const question=rawQuestion.trim();
if(!question||state.busy)return;
if(!consentGranted()){state.hint.textContent="AI案内を使うには、Cookie設定でサポートチャットを許可してください。";return;}
if(rawQuestion.length>800||question.length>800){state.hint.textContent="質問は800文字以内で入力してください";state.input.focus();return;}
state.input.value="";state.input.style.height="auto";state.messages.push({role:"user",content:question});addMessage("user",question);
const generation=state.generation,history=state.messages.slice(0,-1).slice(-10);setBusy(true);state.loadingItem=addLoading();state.controller=new AbortController();
let streamingItem=null;
try{
const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:question,history:history,uiContext:getVisibleUiContext()}),signal:state.controller.signal,credentials:"omit",cache:"no-store"});
if(generation!==state.generation||!state.mounted)return;
const contentType=response.headers.get("Content-Type")||"";
if(!response.ok){const body=await response.json().catch(function(){return {};});throw new Error(body&&body.error?body.error:"回答を取得できませんでした。");}
if(!contentType.toLowerCase().includes("text/event-stream")){
const body=await response.json();const answer=typeof body.answer==="string"&&body.answer.trim()?body.answer.trim():"回答を生成できませんでした。";
if(state.loadingItem)state.loadingItem.remove();state.loadingItem=null;state.list.setAttribute("aria-busy","false");state.messages.push({role:"assistant",content:answer});addMessage("assistant",answer);return;
}
if(!response.body||typeof response.body.getReader!=="function")throw new Error("回答のストリームを読み取れませんでした。");
if(state.loadingItem)state.loadingItem.remove();state.loadingItem=null;
streamingItem=addMessage("assistant","");const responseText=streamingItem.querySelector(".tenmei-ai-response-text");
let streamedText="",finalText="",buffer="";
function consumeEvent(block){
const data=block.split("\n").filter(function(line){return line.startsWith("data:");}).map(function(line){return line.slice(5).trim();}).join("\n");
if(!data)return;
let payload;try{payload=JSON.parse(data);}catch(_){return;}
if(payload.error)throw new Error(payload.error);
if(typeof payload.delta==="string"){streamedText+=payload.delta;renderMarkdown(responseText,streamedText);state.list.scrollTop=state.list.scrollHeight;}
if(payload.done===true&&typeof payload.text==="string")finalText=payload.text;
}
const reader=response.body.getReader(),decoder=new TextDecoder();
while(true){
const chunk=await reader.read();if(chunk.done)break;
buffer+=decoder.decode(chunk.value,{stream:true}).replace(/\r\n/g,"\n");
let boundary;while((boundary=buffer.indexOf("\n\n"))>=0){const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);consumeEvent(block);}
}
buffer+=decoder.decode().replace(/\r\n/g,"\n");if(buffer.trim())consumeEvent(buffer);
if(generation!==state.generation||!state.mounted)return;
const answer=String(finalText||streamedText).trim();if(!answer)throw new Error("回答を最後まで受信できませんでした。もう一度お試しください。");
renderMarkdown(responseText,answer);state.messages.push({role:"assistant",content:answer});state.list.setAttribute("aria-busy","false");state.list.scrollTop=state.list.scrollHeight;
}catch(error){
if(error&&error.name==="AbortError")return;
if(generation===state.generation&&state.mounted){
if(state.loadingItem)state.loadingItem.remove();state.loadingItem=null;
if(streamingItem)streamingItem.remove();
state.list.setAttribute("aria-busy","false");addMessage("assistant",error&&error.message?error.message:"通信に失敗しました。時間をおいてお試しください。");
}
}finally{
if(generation===state.generation&&state.mounted){state.controller=null;setBusy(false);state.input.focus();}
}
}
function mount(){if(state.mounted)return;state.mounted=true;state.generation++;const root=el("div","tenmei-ai-agent"),button=el("button","tenmei-ai-launcher"),panel=el("section","tenmei-ai-panel");button.type="button";button.title="AI案内";button.setAttribute("aria-label","天命乃杜 AI案内を開く");button.setAttribute("aria-expanded","false");button.append(icon("bi-stars"));panel.hidden=true;panel.setAttribute("role","dialog");panel.setAttribute("aria-label","天命乃杜 AI案内");panel.setAttribute("aria-modal","false");
const header=el("header","tenmei-ai-panel__header"),brand=el("div","tenmei-ai-panel__brand"),brandIcon=el("span","tenmei-ai-panel__brand-icon"),copy=el("div","tenmei-ai-panel__brand-copy"),actions=el("div","tenmei-ai-panel__header-actions"),reset=el("button","tenmei-ai-panel__icon-button"),close=el("button","tenmei-ai-panel__icon-button");brandIcon.append(icon("bi-stars"));copy.append(el("strong","","天命乃杜 AI案内"),el("span","","サイトの使い方をお手伝いします"));brand.append(brandIcon,copy);reset.type=close.type="button";reset.setAttribute("aria-label","会話をリセット");reset.title="新しい会話";reset.append(icon("bi-arrow-counterclockwise"));close.setAttribute("aria-label","AI案内を閉じる");close.title="閉じる";close.append(icon("bi-x-lg"));actions.append(reset,close);header.append(brand,actions);
const intro=el("div","tenmei-ai-panel__intro");intro.append(el("p","tenmei-ai-panel__eyebrow","TENMEI GUIDE"),el("h2","","何をお探しですか？"),el("p","","天命乃杜の機能や操作方法について質問できます。"));
const suggestions=el("div","tenmei-ai-panel__suggestions");["おみくじの引き方","参拝証・ログイン","便利な機能"].forEach(function(t){const c=el("button","tenmei-ai-suggestion",t);c.type="button";c.addEventListener("click",function(){const prompt={"おみくじの引き方":"おみくじの引き方を教えて","参拝証・ログイン":"参拝証とログインについて教えて","便利な機能":"サイトの便利な機能を知りたい"}[t];submit(prompt);});suggestions.appendChild(c);});
const list=el("div","tenmei-ai-panel__messages");list.setAttribute("aria-live","polite");list.setAttribute("aria-relevant","additions text");state.list=list;addWelcome();
const form=el("form","tenmei-ai-composer"),input=el("textarea","tenmei-ai-composer__input themed-input"),actionsRow=el("div","tenmei-ai-composer__actions"),hint=el("p","tenmei-ai-composer__hint","0 / 800文字"),send=el("button","tenmei-ai-composer__send");input.rows=1;input.maxLength=800;input.placeholder="質問を入力…";input.setAttribute("aria-label","AI案内への質問");send.type="submit";send.setAttribute("aria-label","質問を送信");send.append(icon("bi-arrow-up"));actionsRow.append(hint,send);form.append(input,actionsRow);const privacy=el("p","tenmei-ai-panel__privacy","個人情報・パスワード・認証コードなどは入力しないでください。AIの回答には誤りが含まれる場合があります。会話履歴は保存されません。");panel.append(header,intro,suggestions,list,form,privacy);root.append(button,panel);document.body.appendChild(root);Object.assign(state,{root:root,button:button,panel:panel,list:list,input:input,send:send,hint:hint});
function finishClose(){if(!panel.classList.contains("is-closing"))return;panel.hidden=true;panel.classList.remove("is-closing");state.closeTimer=null;button.focus();}
function closePanel(){if(panel.hidden||panel.classList.contains("is-closing"))return;panel.classList.remove("is-opening");panel.classList.add("is-closing");button.setAttribute("aria-expanded","false");if(state.closeTimer)window.clearTimeout(state.closeTimer);if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches){finishClose();}else{state.closeTimer=window.setTimeout(finishClose,160);}}
function openPanel(){if(state.closeTimer)window.clearTimeout(state.closeTimer);state.closeTimer=null;panel.hidden=false;panel.classList.remove("is-closing","is-opening");void panel.offsetWidth;panel.classList.add("is-opening");button.setAttribute("aria-expanded","true");input.focus();}
panel.addEventListener("animationend",function(event){if(event.target===panel&&event.animationName==="tenmei-ai-panel-enter")panel.classList.remove("is-opening");});
button.addEventListener("click",function(){if(panel.hidden||panel.classList.contains("is-closing"))openPanel();else closePanel();});close.addEventListener("click",closePanel);reset.addEventListener("click",function(){if(state.controller)state.controller.abort();state.generation++;state.controller=null;state.messages=[];state.loadingItem=null;state.busy=false;list.setAttribute("aria-busy","false");list.replaceChildren();addWelcome();updateComposer();input.focus();});form.addEventListener("submit",function(e){e.preventDefault();submit(input.value);});input.addEventListener("input",function(){const exceeded=input.value.length>800;if(exceeded)input.value=input.value.slice(0,800);input.style.height="auto";input.style.height=Math.min(input.scrollHeight,112)+"px";updateComposer();if(exceeded)state.hint.textContent="800文字が上限です";});input.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit(input.value);}});document.addEventListener("keydown",state.escapeHandler=function(e){if(e.key==="Escape"&&state.mounted&&!panel.hidden)closePanel();});const back=document.getElementById("back-to-top-btn");if(back)back.classList.add("tenmei-ai-has-launcher");updateComposer();}
function unmount(){state.generation++;if(state.closeTimer)window.clearTimeout(state.closeTimer);state.closeTimer=null;if(state.controller)state.controller.abort();state.controller=null;state.messages=[];state.busy=false;state.mounted=false;if(state.escapeHandler)document.removeEventListener("keydown",state.escapeHandler);if(state.root)state.root.remove();const back=document.getElementById("back-to-top-btn");if(back)back.classList.remove("tenmei-ai-has-launcher");state.root=state.button=state.panel=state.list=state.input=state.send=state.hint=state.loadingItem=null;}
window.TenmeiAIAgent={mount:mount,unmount:unmount};
})();