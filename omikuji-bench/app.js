(function(){
'use strict';
const CATS=OB_CATS, CHK=OB_CHECKS, SITES=OB_SITES;
const byId=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f1=v=>v==null?'—':v.toFixed(1);
const pct=v=>v==null?'—':v.toFixed(1)+'%';
const CHKS_BY_ID=Object.fromEntries(CHK.map(c=>[c.id,c]));
const CMP_MAX=6;

// v4.0.1: unknown (?) adds no points but stays in the denominator.
function evaluate(s){
  if(!s.codes) return {ok:false,cats:CATS.map(()=>({ver:0,score:null})),verified:0,coverage:0,covered:0,index:null,eligible:false,confidence:'低'};
  const parts=s.codes.split('|');
  const cats=CATS.map((c,i)=>{
    const xs=(parts[i]||'').split('');
    let num=0,den=0,ver=0;
    xs.forEach((x,j)=>{ den+=c.pw[j]; if(x!=='?') ver++; if(x==='1') num+=c.pw[j]; });
    return {ver,score:den?num/den*100:null};
  });
  const verified=cats.reduce((a,c)=>a+c.ver,0);
  const coverage=verified/22*100;
  const covered=cats.filter(c=>c.ver>0).length;
  let num=0,den=0;
  cats.forEach((c,i)=>{ num+=CATS[i].weight*c.score; den+=CATS[i].weight; });
  const index=(den&&verified>0)?num/den:null;
  const eligible=index!=null && coverage>=60 && covered>=4;
  const confidence=coverage>=75?'高':coverage>=55?'中':'低';
  return {ok:true,cats,verified,coverage,covered,index,eligible,confidence};
}
function cellsOf(s){
  const out=[];
  if(!s.codes) return out;
  const parts=s.codes.split('|');
  CATS.forEach((c,i)=>{ (parts[i]||'').split('').forEach((x,j)=>out.push({id:c.ids[j],x,cat:c.key})); });
  return out;
}
const ROWS=SITES.map(s=>({s,e:evaluate(s)}));
const median=a=>{ const v=a.slice().sort((x,y)=>x-y); if(!v.length) return 0; const m=v.length>>1; return v.length%2?v[m]:(v[m-1]+v[m])/2; };

// ---------- basis (ranking / sort criterion) ----------
let basis='index';
const BASIS_OPTS=[{key:'index',label:'Index（総合）'}].concat(CATS.map((c,i)=>({key:String(i),label:c.label})));
const basisVal=r=>{ if(!r.e.ok) return null; return basis==='index'?r.e.index:r.e.cats[+basis].score; };
const basisName=()=>basis==='index'?'Index':CATS[+basis].label;
function rankedRows(){ return ROWS.filter(r=>r.e.eligible).sort((a,b)=>basisVal(b)-basisVal(a)); }

// ---------- KPIs ----------
function renderKpis(){
  const idxRanked=ROWS.filter(r=>r.e.eligible).sort((a,b)=>b.e.index-a.e.index);
  const idx=idxRanked.map(r=>r.e.index);
  const med=idx.length?median(idx):null;
  const avgCov=idxRanked.length?idxRanked.reduce((a,r)=>a+r.e.coverage,0)/idxRanked.length:null;
  const top=idxRanked[0];
  const k=[
    [idxRanked.length,'算出対象サイト（全'+SITES.length+'件）'],
    [top?f1(top.e.index):'—','最高 Index（'+(top?esc(top.s.name):'')+'）'],
    [med==null?'—':f1(med),'Index の中央値'],
    [avgCov==null?'—':pct(avgCov),'平均カバレッジ（確認済み項目）'],
  ];
  byId('kpis').innerHTML=k.map(([v,l])=>'<div class="kpi"><b>'+v+'</b><span>'+l+'</span></div>').join('');
}

// ---------- basis chips ----------
function renderChips(){
  byId('basisChips').innerHTML=BASIS_OPTS.map(o=>'<button type="button" class="chip" data-basis="'+o.key+'" aria-pressed="'+(o.key===basis)+'">'+esc(o.label)+'</button>').join('');
  byId('basisChips').querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{
    basis=b.dataset.basis;
    sortKey=basis==='index'?'index':'cat'+basis; sortDir=-1;
    renderChips(); renderHead(); renderTable(); renderMatrix(); renderCharts();
  }));
}

// ---------- tabs ----------
const TABS=['rank','scatter','cat'];
function showTab(name,focus){
  TABS.forEach(n=>{
    const sel=n===name;
    byId('tab-'+n).setAttribute('aria-selected',sel?'true':'false');
    byId('tab-'+n).tabIndex=sel?0:-1;
    byId('pane-'+n).hidden=!sel;
  });
  if(focus) byId('tab-'+name).focus();
  renderCharts();
}
function setupTabs(){
  TABS.forEach((n,i)=>{
    byId('tab-'+n).addEventListener('click',()=>showTab(n));
    byId('tab-'+n).addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
        e.preventDefault();
        const j=(i+(e.key==='ArrowRight'?1:TABS.length-1))%TABS.length;
        showTab(TABS[j],true);
      }
    });
  });
}

// ---------- table ----------
const COLS=[
 {k:'cmp',label:'比較',sort:false},
 {k:'rank',label:'順位',num:true},
 {k:'name',label:'サイト'},
 {k:'type',label:'種別'},
 {k:'index',label:'Index',num:true},
 {k:'conf',label:'信頼度'},
 {k:'coverage',label:'カバレッジ',num:true},
 {k:'verified',label:'確認項目',num:true},
 ...CATS.map((c,i)=>({k:'cat'+i,label:c.label,num:true})),
];
let sortKey='index', sortDir=-1;
const cmpSet=new Set();
function valueOf(r,k){
  if(k==='name') return r.s.name;
  if(k==='type') return r.s.type;
  if(k==='index') return r.e.index;
  if(k==='conf') return ({高:3,中:2,低:1})[r.e.confidence]||0;
  if(k==='coverage') return r.e.coverage;
  if(k==='verified') return r.e.verified;
  if(k.startsWith('cat')){ const i=+k.slice(3); return r.e.ok&&r.e.cats[i].ver>0?r.e.cats[i].score:null; }
  return null;
}
function renderHead(){
  byId('thr').innerHTML=COLS.map(c=>{
    if(c.sort===false) return '<th>'+esc(c.label)+'</th>';
    const active=sortKey===c.k;
    const aria=active?(sortDir>0?'ascending':'descending'):'none';
    return '<th class="'+(c.num?'num':'')+'" aria-sort="'+aria+'"><button type="button" data-k="'+c.k+'">'+esc(c.label)+(active?(sortDir>0?' ▲':' ▼'):'')+'</button></th>';
  }).join('');
  byId('thr').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    const k=b.dataset.k; if(sortKey===k) sortDir*=-1; else { sortKey=k; sortDir=(k==='name'||k==='type'||k==='conf')?1:-1; }
    renderHead(); renderTable();
  }));
}
function confPill(c){ const cls=c==='高'?'hi':c==='中'?'mid':'lo'; return '<span class="pill '+cls+'">'+c+'</span>'; }
function renderTable(){
  const q=byId('fSearch').value.trim().toLowerCase();
  const onlyElig=byId('fEligible').checked;
  const typeVal=byId('fType').value;
  const rows=ROWS.filter(r=>(!onlyElig||r.e.eligible)&&(typeVal==='all'||r.s.type===typeVal)&&(!q||(r.s.name+' '+r.s.desc).toLowerCase().includes(q)));
  const rankOf=new Map(rankedRows().map((r,i)=>[r.s.id,i+1]));
  rows.sort((a,b)=>{
    const va=valueOf(a,sortKey), vb=valueOf(b,sortKey);
    if(va==null&&vb==null) return 0; if(va==null) return 1; if(vb==null) return -1;
    if(typeof va==='string') return va.localeCompare(vb,'ja')*sortDir;
    return (va-vb)*sortDir;
  });
  byId('count').textContent=rows.length+' / '+ROWS.length+' 件表示';
  byId('tbody').innerHTML=rows.length?rows.map(r=>{
    const rk=rankOf.get(r.s.id);
    const idx=r.e.index;
    const catCells=CATS.map((c,i)=>{
      if(!r.e.ok||r.e.cats[i].ver===0) return '<span class="pill un">未確認</span>';
      return f1(r.e.cats[i].score);
    });
    const cells=[
      '<input type="checkbox" aria-label="'+esc(r.s.name)+'を比較に追加" data-cmp="'+esc(r.s.id)+'"'+(cmpSet.has(r.s.id)?' checked':'')+(!cmpSet.has(r.s.id)&&cmpSet.size>=CMP_MAX?' disabled':'')+'>',
      rk?rk:'—',
      '<span class="name">'+esc(r.s.name)+'</span><div class="muted">'+esc(r.s.url.replace(/^https?:\/\//,'').replace(/\/$/,''))+'</div>',
      esc(r.s.type),
      idx==null?'<span class="pill un">算出対象外</span>':'<b>'+f1(idx)+'</b> <span class="bar" aria-hidden="true"><i style="width:'+Math.max(0,Math.min(100,idx)).toFixed(1)+'%"></i></span>',
      r.e.ok?confPill(r.e.confidence):'<span class="muted">—</span>',
      r.e.ok?pct(r.e.coverage):'—',
      (r.e.ok?r.e.verified:0)+' / 22',
      ...catCells,
    ];
    return '<tr tabindex="0" data-id="'+esc(r.s.id)+'">'+cells.map((v,i)=>{
      const cls=COLS[i].num?'num':'';
      return '<td class="'+cls+'"'+(i===0?' onclick="event.stopPropagation()"':'')+'>'+v+'</td>';
    }).join('')+'</tr>';
  }).join(''):'<tr><td colspan="'+COLS.length+'" class="empty">該当するサイトがありません</td></tr>';
  byId('tbody').querySelectorAll('tr[data-id]').forEach(tr=>{
    const open=()=>openDetail(tr.dataset.id);
    tr.addEventListener('click',open);
    tr.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
  });
  byId('tbody').querySelectorAll('input[data-cmp]').forEach(cb=>cb.addEventListener('change',()=>{
    const id=cb.dataset.cmp;
    if(cb.checked){ if(cmpSet.size>=CMP_MAX){ cb.checked=false; return; } cmpSet.add(id); }
    else cmpSet.delete(id);
    updateCmpButton(); renderTable();
  }));
  updateCmpButton();
}
function updateCmpButton(){
  const b=byId('btnCmp'); b.textContent='比較（'+cmpSet.size+' / '+CMP_MAX+'）'; b.disabled=cmpSet.size<2;
}
byId('fSearch').addEventListener('input',renderTable);
byId('fEligible').addEventListener('change',renderTable);
byId('btnCsv').addEventListener('click',()=>{
  const head=['rank','name','type','index','confidence','coverage_pct','verified','codes'].concat(CATS.map(c=>c.key+'_score'));
  const rankOf=new Map(rankedRows().map((r,i)=>[r.s.id,i+1]));
  const lines=[head.join(',')].concat(ROWS.map(r=>[
    rankOf.get(r.s.id)||'',r.s.name,r.s.type,r.e.index==null?'':r.e.index.toFixed(1),r.e.ok?r.e.confidence:'',r.e.ok?r.e.coverage.toFixed(1):'',r.e.ok?r.e.verified:0,r.s.codes||'',...(r.e.ok?r.e.cats.map(c=>c.score.toFixed(1)):CATS.map(()=>''))
  ].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')));
  const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='omikuji-bench-v4.0.1.csv'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
byId('btnCmp').addEventListener('click',()=>openCompare());

// ---------- matrix ----------
function renderMatrix(){
  const order=rankedRows().concat(ROWS.filter(r=>!r.e.eligible));
  const head='<tr><th class="sitecol">サイト</th>'+CHK.map(c=>'<th title="'+esc(c.label)+'">'+c.id+'</th>').join('')+'<th>Index</th></tr>';
  const body=order.map(r=>{
    const map=Object.fromEntries(cellsOf(r.s).map(c=>[c.id,c.x]));
    const tds=CHK.map(c=>{
      if(!r.s.codes) return '<td><i class="cell cx">—</i></td>';
      const x=map[c.id];
      const cls=x==='1'?'c1':x==='0'?'c0':'cq';
      return '<td><i class="cell '+cls+'" title="'+esc(c.label)+'">'+x+'</i></td>';
    }).join('');
    return '<tr><td class="sitecol"><span class="name">'+esc(r.s.name)+'</span></td>'+tds+'<td>'+(r.e.index==null?'<span class="pill un">未確認</span>':'<b>'+f1(r.e.index)+'</b>')+'</td></tr>';
  }).join('');
  byId('mtx').innerHTML='<thead>'+head+'</thead><tbody>'+body+'</tbody>';
}

// ---------- detail dialog ----------
function openDetail(id){
  const r=ROWS.find(x=>x.s.id===id); if(!r) return;
  const s=r.s,e=r.e;
  byId('dlgTitle').textContent=s.name;
  byId('dlgSub').innerHTML=esc(s.type)+' ・ <a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.url)+'</a>';
  const catRows=CATS.map((c,i)=>{
    const ver=e.ok?e.cats[i].ver:0;
    return '<tr><td>'+esc(c.label)+'</td><td class="num">'+c.weight+'</td><td class="num">'+ver+' / '+c.ids.length+'</td><td class="num">'+(ver?f1(e.cats[i].score):'<span class="pill un">未確認</span>')+'</td></tr>';
  }).join('');
  const chks=cellsOf(s).map(x=>{
    const c=CHKS_BY_ID[x.id];
    const cls=x.x==='1'?'c1':x.x==='0'?'c0':'cq';
    return '<div class="chk"><i class="cell '+cls+'">'+x.x+'</i><div><b>'+x.id+'</b> '+esc(c.label)+'<div class="muted">'+esc(c.note)+'</div></div></div>';
  }).join('');
  byId('dlgBody').innerHTML=
    '<p><b>Index：</b>'+(e.index==null?'算出対象外':f1(e.index))+' 　<b>信頼度：</b>'+(e.ok?e.confidence:'—')+' 　<b>カバレッジ：</b>'+(e.ok?pct(e.coverage):'—')+'（'+(e.ok?e.verified:0)+' / 22）</p>'+
    '<p>'+esc(s.desc)+'</p>'+
    '<h4>カテゴリ別</h4><div class="tbl-wrap"><table><thead><tr><th>カテゴリ</th><th class="num">重み</th><th class="num">確認項目</th><th class="num">スコア</th></tr></thead><tbody>'+catRows+'</tbody></table></div>'+
    '<h4>チェックポイント</h4>'+(s.codes?'<div class="chk-list">'+chks+'</div>':'<p class="muted">本文を取得できなかったため、判定は行っていません。</p>')+
    '<h4>確認した根拠</h4><p>'+esc(s.facts)+'</p>'+
    '<h4>出典・再確認</h4><p><a href="'+esc(s.source)+'" target="_blank" rel="noopener">'+esc(s.source)+'</a><br><span class="muted">'+esc(s.recheck)+'</span></p>';
  byId('dlg').showModal();
}
byId('dlgClose').addEventListener('click',()=>byId('dlg').close());
byId('dlg').addEventListener('click',e=>{ if(e.target===byId('dlg')) byId('dlg').close(); });

// ---------- compare dialog ----------
function openCompare(){
  const sel=ROWS.filter(r=>cmpSet.has(r.s.id));
  if(sel.length<2) return;
  byId('cmpSub').textContent=sel.length+' サイトを比較';
  const head='<tr><th>項目</th>'+sel.map(r=>'<th class="num">'+esc(r.s.name)+'</th>').join('')+'</tr>';
  const sumRows=[
    ['種別',r=>esc(r.s.type)],
    ['Index',r=>r.e.index==null?'<span class="pill un">算出対象外</span>':'<b>'+f1(r.e.index)+'</b>'],
    ['信頼度',r=>r.e.ok?confPill(r.e.confidence):'—'],
    ['カバレッジ',r=>r.e.ok?pct(r.e.coverage):'—'],
    ...CATS.map((c,i)=>[c.label,r=>(!r.e.ok||r.e.cats[i].ver===0)?'<span class="pill un">未確認</span>':f1(r.e.cats[i].score)]),
  ].map(([l,fn])=>'<tr><td>'+esc(l)+'</td>'+sel.map(r=>'<td class="num">'+fn(r)+'</td>').join('')+'</tr>').join('');
  const chkRows=CHK.map(c=>'<tr><td title="'+esc(c.label)+'">'+c.id+' '+esc(c.label)+'</td>'+sel.map(r=>{
    const x=Object.fromEntries(cellsOf(r.s).map(q=>[q.id,q.x]))[c.id];
    if(!r.s.codes) return '<td class="num"><i class="cell cx">—</i></td>';
    const cls=x==='1'?'c1':x==='0'?'c0':'cq';
    return '<td class="num"><i class="cell '+cls+'">'+x+'</i></td>';
  }).join('')+'</tr>').join('');
  byId('cmpBody').innerHTML='<div class="tbl-wrap"><table><thead>'+head+'</thead><tbody>'+sumRows+'</tbody></table></div>'+
    '<h4>チェックポイント</h4><div class="tbl-wrap"><table><thead>'+head+'</thead><tbody>'+chkRows+'</tbody></table></div>';
  byId('cmp').showModal();
}
byId('cmpClose').addEventListener('click',()=>byId('cmp').close());
byId('cmp').addEventListener('click',e=>{ if(e.target===byId('cmp')) byId('cmp').close(); });

// ---------- charts ----------
const RED=()=>getComputedStyle(document.body).getPropertyValue('--accent-red').trim()||'#b91c1c';
const TXT=()=>getComputedStyle(document.body).color;
const SUB=()=>getComputedStyle(document.body).getPropertyValue('--text-sub').trim()||'#555';
const GRID=()=>getComputedStyle(document.body).getPropertyValue('--card-border').trim()||'#e2e2e2';
const FONT='Zen Kaku Gothic New, sans-serif';
function inst(id){ const el=byId(id); return echarts.getInstanceByDom(el)||echarts.init(el); }

// Pareto frontier (maximize x and y): points not dominated by any other point.
function paretoFront(pts,xOf){
  const cand=pts.slice().sort((a,b)=>b.e.index-a.e.index||xOf(b)-xOf(a));
  const front=[]; let best=-Infinity;
  cand.forEach(r=>{ if(xOf(r)>best){ front.push(r); best=xOf(r); } });
  return front.sort((a,b)=>xOf(a)-xOf(b));
}
// Step line through the frontier, extended to the plot edges (AA-style staircase).
function stepPath(front,xOf,xMin,xMax){
  if(!front.length) return [];
  const p=[[xMin,front[0].e.index],[xOf(front[0]),front[0].e.index]];
  for(let i=1;i<front.length;i++){
    p.push([xOf(front[i]),front[i-1].e.index]);
    p.push([xOf(front[i]),front[i].e.index]);
  }
  p.push([xMax,front[front.length-1].e.index]);
  return p;
}

function renderCharts(){
  if(!window.echarts){
    byId('rankFallback').hidden=false;
    ['chartRank','chartScatter','chartCat'].forEach(id=>{ byId(id).innerHTML='<div class="fallback">グラフを表示できません（ライブラリ未読込）。</div>'; });
    return;
  }
  const text=TXT(), sub=SUB(), grid=GRID(), red=RED();
  const ranked=rankedRows();

  // ranking bar (by current basis)
  const rr=ranked.slice().reverse();
  const rankEl=byId('chartRank');
  rankEl.style.height=Math.max(360,ranked.length*26+80)+'px';
  inst('chartRank').setOption({
    notMerge:true,
    textStyle:{color:text,fontFamily:FONT},
    grid:{left:8,right:64,top:8,bottom:8,containLabel:true},
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:p=>{const d=rr[p[0].dataIndex];return '<b>'+esc(d.s.name)+'</b><br>'+esc(basisName())+' '+f1(basisVal(d))+'<br>Index '+f1(d.e.index)+' / 信頼度 '+d.e.confidence+' / カバレッジ '+pct(d.e.coverage);}},
    xAxis:{type:'value',min:0,max:100,axisLabel:{color:sub},splitLine:{lineStyle:{color:grid}}},
    yAxis:{type:'category',data:rr.map(d=>d.s.name),axisLabel:{color:text,fontSize:11},axisTick:{show:false},axisLine:{show:false}},
    series:[{type:'bar',data:rr.map(d=>({value:+basisVal(d).toFixed(1)})),itemStyle:{color:red,borderRadius:[0,4,4,0]},barMaxWidth:16,label:{show:true,position:'right',color:text,fontSize:11,formatter:p=>p.value.toFixed(1)}}]
  });
  if(!ranked.length) byId('chartRank').innerHTML='<div class="fallback">算出対象のサイトがありません。</div>';

  // scatter: selected x axis vs Index, Pareto frontier, most-attractive quadrant
  const axis=byId('fAxis').value;
  const xOf=r=>axis==='cov'?r.e.coverage:r.e.cats[+axis].score;
  const xLabel=axis==='cov'?'カバレッジ（%）':CATS[+axis].label+'（スコア）';
  const xMin=axis==='cov'?50:0;
  const pts=ROWS.filter(r=>r.e.ok&&r.e.index!=null&&(axis==='cov'||r.e.cats[+axis].ver>0));
  const front=paretoFront(pts,xOf);
  const medIdx=median(ROWS.filter(r=>r.e.eligible).map(r=>r.e.index));
  const xThr=axis==='cov'?60:median(pts.map(xOf));
  const paretoOn=byId('fPareto').checked;
  byId('paretoNote').textContent=paretoOn
    ? 'Pareto 線: '+esc(xLabel)+' と Index の両方を大きいほど良いとみなした非劣解 '+front.length+' サイトを、階段状に結びました。'
    : 'Pareto 線は非表示です。';
  const seriesScatter={type:'scatter',symbolSize:12,z:3,
    data:pts.map(r=>{
      const onFront=front.includes(r), top5=ranked.indexOf(r)>=0&&ranked.indexOf(r)<5;
      return {name:r.s.name,value:[xOf(r),r.e.index],itemStyle:{color:r.e.eligible?red:sub,opacity:r.e.eligible?.9:.5},
        label:{show:onFront||top5}};
    }),
    label:{show:true,position:'right',formatter:p=>p.data.name,fontSize:10,color:text},
    markArea:{silent:true,itemStyle:{color:'rgba(47,125,85,0.06)'},label:{show:true,position:'insideTopRight',formatter:'最も魅力的な象限',color:'#2f7d55',fontSize:11},
      data:[[{xAxis:xThr,yAxis:medIdx},{xAxis:100,yAxis:100}]]},
    markLine:{silent:true,symbol:'none',lineStyle:{color:sub,type:'dashed'},label:{color:sub,fontSize:10},
      data:[...(axis==='cov'?[{xAxis:60,label:{formatter:'算出下限 60%'}}]:[{xAxis:xThr,label:{formatter:'中央値 '+xThr.toFixed(1)}}]),{yAxis:medIdx,label:{position:'insideEndTop',formatter:'Index 中央値 '+medIdx.toFixed(1)}}]}};
  const seriesPareto={type:'line',name:'Pareto 線',z:2,symbol:'circle',symbolSize:7,showSymbol:true,
    lineStyle:{color:red,width:2},itemStyle:{color:red},
    data:stepPath(front,xOf,xMin,100),tooltip:{show:false}};
  inst('chartScatter').setOption({
    notMerge:true,
    textStyle:{color:text,fontFamily:FONT},
    grid:{left:48,right:24,top:24,bottom:44},
    tooltip:{formatter:p=>p.seriesType==='scatter'?'<b>'+esc(p.data.name)+'</b><br>'+esc(xLabel)+' '+p.data.value[0].toFixed(1)+'<br>Index '+f1(p.data.value[1]):''},
    xAxis:{name:xLabel,nameLocation:'middle',nameGap:28,min:xMin,max:100,axisLabel:{color:sub},splitLine:{lineStyle:{color:grid}}},
    yAxis:{name:'Index',min:0,max:100,axisLabel:{color:sub},splitLine:{lineStyle:{color:grid}}},
    series:paretoOn?[seriesScatter,seriesPareto]:[seriesScatter]
  });

  // category grouped bars for the top 10 by current basis
  const top=ranked.slice(0,10);
  const palette=['#b91c1c','#d97706','#2f7d55','#2563eb','#7c3aed'];
  inst('chartCat').setOption({
    notMerge:true,
    textStyle:{color:text,fontFamily:FONT},
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
    legend:{top:0,textStyle:{color:text,fontSize:11}},
    grid:{left:8,right:16,top:34,bottom:8,containLabel:true},
    xAxis:{type:'value',min:0,max:100,axisLabel:{color:sub},splitLine:{lineStyle:{color:grid}}},
    yAxis:{type:'category',data:top.map(r=>r.s.name).reverse(),axisLabel:{color:text,fontSize:11}},
    series:CATS.map((c,i)=>({name:c.label,type:'bar',barGap:'10%',itemStyle:{color:palette[i]},
      data:top.map(r=>r.e.cats[i].ver>0?+r.e.cats[i].score.toFixed(1):null).reverse()}))
  });
  ['chartRank','chartScatter','chartCat'].forEach(id=>{ const c=echarts.getInstanceByDom(byId(id)); if(c) c.resize(); });
}
function renderCatWeights(){
  byId('catWeights').innerHTML='<div class="tbl-wrap"><table><thead><tr><th>カテゴリ</th><th class="num">重み</th><th class="num">項目数</th></tr></thead><tbody>'+
    CATS.map(c=>'<tr><td>'+esc(c.label)+'</td><td class="num">'+c.weight+'</td><td class="num">'+c.ids.length+'</td></tr>').join('')+
    '<tr><th>合計</th><th class="num">'+CATS.reduce((a,c)=>a+c.weight,0)+'</th><th class="num">'+CHK.length+'</th></tr></tbody></table></div>';
}
function renderCritTable(){
  byId('critTable').innerHTML='<thead><tr><th>ID</th><th>項目</th><th>カテゴリ</th><th class="num">重み（素数）</th><th>判定の注記</th></tr></thead><tbody>'+
    CHK.map(c=>'<tr><td>'+c.id+'</td><td>'+esc(c.label)+'</td><td>'+esc(CATS.find(k=>k.key===c.cat).label)+'</td><td class="num">'+c.weight+'</td><td class="muted" style="white-space:normal">'+esc(c.note)+'</td></tr>').join('')+'</tbody>';
}

// ---------- init ----------
const typeOpts=[{value:'all',label:'すべての種別'}].concat([...new Set(SITES.map(s=>s.type))].sort().map(t=>({value:t,label:t})));
TenmeiCustomControls.updateChoiceOptions('fType',typeOpts);
byId('fType').addEventListener('change',renderTable);
byId('fAxis').addEventListener('change',renderCharts);
byId('fPareto').addEventListener('change',renderCharts);
renderKpis();
renderChips();
setupTabs();
renderHead();
renderTable();
renderMatrix();
renderCatWeights();
renderCritTable();
renderCharts();
let rt; window.addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(renderCharts,120); });
if(window.renderMathInElement){
  renderMathInElement(document.getElementById('method'),{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}],throwOnError:false});
}
})();
