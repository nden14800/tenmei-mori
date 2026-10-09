const { chromium } = require('playwright');
const fs = require('node:fs');

const SITE='https://tenmei-mori.pages.dev/';
const API='https://tenmei-mori-backend.nden14800.workers.dev';
const OUT='status/public/health.json';

async function timedFetch(url){
  const started=Date.now();
  const response=await fetch(url,{cache:'no-store'});
  return {response,ms:Date.now()-started};
}

async function main(){
  fs.mkdirSync('status/public',{recursive:true});
  let previousHealth=null;
  try{previousHealth=JSON.parse(fs.readFileSync(OUT,'utf8'))}catch{}
  const browserErrors=[],consoleErrors=[];
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  page.on('pageerror',e=>browserErrors.push(e.message));
  page.on('console',m=>{
    if(m.type()==='error'&&(!m.location().url||m.location().url.startsWith(SITE)))consoleErrors.push(m.text());
  });

  const probes={
    http:{ok:false,ms:null,reason:''},
    browser:{ok:false,reason:''},
    interaction:{ok:false,reason:''},
    api:{ok:false,ms:null,reason:''},
    maintenance:{ok:false,active:false,reason:''}
  };

  try{
    const r=await timedFetch(SITE);
    probes.http.ms=r.ms;
    probes.http.ok=r.response.ok;
    if(!r.response.ok)probes.http.reason=`公開サイトHTTP ${r.response.status}`;
  }catch(e){probes.http.reason=e.message}

  try{
    const response=await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:30000});
    if(!response||!response.ok())throw Error(`公開サイトHTTP ${response?response.status():'応答なし'}`);
    await page.locator('#view-home').waitFor({state:'attached',timeout:10000});
    const contract=await page.evaluate(()=>({
      home:!!document.querySelector('#view-home'),
      button:!!document.querySelector('[onclick="startOmikuji()"]'),
      start:typeof window.startOmikuji==='function',
      welcome:!!document.querySelector('#welcome-date'),
      worshipper:!!document.querySelector('#worshipper-counter'),
      live:!!document.querySelector('#live-counter'),
      news:!!document.querySelector('#home-news-list'),
      columns:!!document.querySelector('#home-column-list')
    }));
    const missing=Object.entries(contract).filter(([,v])=>!v).map(([k])=>k);
    if(browserErrors.length)throw Error(`JavaScript実行時エラー: ${browserErrors[0]}`);
    if(consoleErrors.length)throw Error(`公開サイト内console.error: ${consoleErrors[0]}`);
    if(missing.length)throw Error(`主要画面の必須要素不足: ${missing.join(', ')}`);
    probes.browser.ok=true;
    probes.browser.reason='実ブラウザでページ描画・JavaScript実行・主要画面構造を確認しました。';

    // The first-visit walkthrough is a legitimate modal and intercepts pointer events.
    // Dismiss it through its own Skip control before testing the primary action.
    const tutorial = page.locator('#tutorial-overlay.active');
    if (await tutorial.count()) {
      const skip = page.locator('#tutorial-skip-btn');
      if (await skip.isVisible().catch(() => false)) {
        await skip.click({ timeout: 5000 });
      } else {
        await page.keyboard.press('Escape');
      }
      await tutorial.waitFor({ state: 'hidden', timeout: 5000 }).catch(async () => {
        throw Error('初回案内ダイアログを閉じられず、おみくじ操作を開始できません。');
      });
    }
    await page.locator('[onclick="startOmikuji()"]').first().click({timeout:10000});
    await page.waitForTimeout(1500);
    const active=await page.evaluate(()=>[...document.querySelectorAll('.view-section')].find(el=>{const s=getComputedStyle(el);return s.display!=='none'&&!el.classList.contains('hidden')})?.id||'');
    if(!['view-draw','view-result'].includes(active))throw Error(`おみくじ開始後の画面遷移を確認できません（active: ${active||'none'}）`);
    if(browserErrors.length)throw Error(`操作後JavaScript実行時エラー: ${browserErrors[0]}`);
    if(consoleErrors.length)throw Error(`操作後console.error: ${consoleErrors[0]}`);
    probes.interaction.ok=true;
    probes.interaction.reason='おみくじ開始操作と画面遷移を実行確認しました。';
  }catch(e){
    if(!probes.browser.ok)probes.browser.reason=e.message;
    else probes.interaction.reason=e.message;
  }finally{await browser.close()}

  try{
    const [m,c]=await Promise.all([timedFetch(`${API}/api/system/maintenance`),timedFetch(`${API}/api/counter`)]);
    probes.api.ms=Math.max(m.ms,c.ms);
    if(!m.response.ok)throw Error(`メンテナンスAPI HTTP ${m.response.status}`);
    if(!c.response.ok)throw Error(`カウンターAPI HTTP ${c.response.status}`);
    const maintenance=await m.response.json(),counter=await c.response.json();
    if(!maintenance||typeof maintenance.active!=='boolean')throw Error('メンテナンスAPIのJSON形式が不正です');
    if(!Number.isFinite(Number(counter.count))||!Number.isFinite(Number(counter.userCount)))throw Error('カウンターAPIのJSON形式が不正です');
    probes.api.ok=true;
    probes.api.reason='メンテナンスAPI・カウンターAPIのHTTP応答とJSON形式を確認しました。';
    probes.maintenance.ok=true;
    probes.maintenance.active=maintenance.active===true;
    probes.maintenance.reason=maintenance.active?'計画メンテナンスが有効です。':'計画メンテナンスは有効ではありません。';
  }catch(e){probes.api.reason=e.message;probes.maintenance.reason=e.message}

  const components={
    site:{state:!probes.http.ok||!probes.browser.ok?'outage':'operational',detail:probes.browser.ok?'HTTP応答と実ブラウザ実行を確認済み。':probes.browser.reason||probes.http.reason},
    api:{state:probes.api.ok?'operational':'outage',detail:probes.api.ok?'Worker/APIの読み取り経路を確認済み。':probes.api.reason},
    omikuji:{state:probes.interaction.ok?'operational':(probes.browser.ok?'partial':'outage'),detail:probes.interaction.ok?'おみくじ開始操作まで確認済み。':probes.interaction.reason||'重要操作を確認できません。'},
    ai:{state:'external',detail:'外部AIサービスのため、この監視システムでは可用性を判定していません。'}
  };

  let state='operational',detail='HTTP・API・実ブラウザ・重要操作の監視がすべて正常です。';
  if(probes.maintenance.active){state='maintenance';detail='計画メンテナンスが有効です。'}
  else if(!probes.http.ok&&!probes.api.ok){state='outage';detail='公開サイトと基礎APIの両方に異常があります。'}
  else if(!probes.http.ok||!probes.api.ok||!probes.browser.ok){state='partial';detail='主要サービスの一部で障害を検知しています。'}
  else if(!probes.interaction.ok){state='degraded';detail='公開サイトは動作していますが、おみくじの重要操作に問題があります。'}

  const stableProbes=Object.fromEntries(Object.entries(probes).map(([name,probe])=>{
    const {ms,...stable}=probe;
    return [name,stable];
  }));
  const previousComparable=previousHealth?JSON.stringify({overall:previousHealth.overall,components:previousHealth.components,probes:previousHealth.probes}):'';
  const currentComparable=JSON.stringify({overall:{state,detail},components,probes:stableProbes});
  const now = new Date().toISOString();
  const stateChangedAt = previousComparable === currentComparable
    ? (previousHealth?.stateChangedAt || previousHealth?.checkedAt || now)
    : now;
  const payload={schemaVersion:2,checkedAt:now,stateChangedAt,overall:{state,detail},components,probes:stableProbes};
  fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
  if(['outage','partial','degraded'].includes(state))process.exitCode=1;
}
main().catch(error=>{
  fs.mkdirSync('status/public',{recursive:true});
  let previousHealth=null;
  try{previousHealth=JSON.parse(fs.readFileSync(OUT,'utf8'))}catch{}
  const checkedAt=previousHealth?.overall?.state==='unknown'&&previousHealth?.overall?.detail==='監視処理そのものが失敗しました。'&&previousHealth?.checkedAt?previousHealth.checkedAt:new Date().toISOString();
  fs.writeFileSync(OUT,JSON.stringify({
    schemaVersion:2,checkedAt,
    overall:{state:'unknown',detail:'監視処理そのものが失敗しました。'},
    components:{site:{state:'unknown',detail:error.message},api:{state:'unknown',detail:'監視処理が完了しませんでした。'},omikuji:{state:'unknown',detail:'監視処理が完了しませんでした。'},ai:{state:'external',detail:'外部AIサービス'}}
  },null,2)+'\n');
  process.exitCode=1;
});