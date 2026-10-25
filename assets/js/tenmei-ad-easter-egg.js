(function(){
'use strict';
if(window.__tenmeiMockAdsInstalled)return;
window.__tenmeiMockAdsInstalled=true;
let enabled=false,renderQueued=false;
const campaigns=[
{brand:'杜の湯庵',tag:'温泉旅館',title:'森にほどける、何もしない休日。',copy:'渓流沿いの露天風呂と、旬の会席料理。静かな山あいで過ごす一泊二日。',cta:'宿泊プランを見る',price:'1泊2食 18,600円〜',theme:'onsen',kind:'travel'},
{brand:'神彩堂',tag:'神社仏閣用品',title:'日々の祈りに、手仕事の道具を。',copy:'国産檜を用いた神棚と、職人仕立ての神具。暮らしに馴染む簡素な意匠。',cta:'商品一覧を見る',price:'神棚 8,800円〜',theme:'wood',kind:'shrine'},
{brand:'結び守り工房',tag:'和雑貨・お守り',title:'大切な願いに、ひとつのお守りを。',copy:'願いごとに合わせて選べる、京都の工房で仕立てたちいさなお守り。',cta:'お守りを選ぶ',price:'各 1,320円',theme:'omamori',kind:'shrine'},
{brand:'京菓子 こよみ',tag:'食品・和菓子',title:'季節を包む、ひとくちの甘み。',copy:'国産素材を中心に、季節ごとに仕立てる上生菓子とお茶の詰め合わせ。',cta:'季節の詰め合わせ',price:'詰合せ 2,700円',theme:'sweets',kind:'food'},
{brand:'SORA MOBILE',tag:'通信サービス',title:'使った分だけ、わかりやすい料金へ。',copy:'毎月のデータ使用量に合わせて選べるシンプルなモバイルプラン。',cta:'料金を確認する',price:'月額 990円〜',theme:'mobile',kind:'service'},
{brand:'青葉オンライン学舎',tag:'オンライン講座',title:'学びたい気持ちに、ちょうどいい授業を。',copy:'資格・語学・デザイン。短い講義と演習で、自分のペースで学べます。',cta:'講座を探す',price:'無料体験あり',theme:'study',kind:'education'},
{brand:'NATURE LAB',tag:'スキンケア',title:'肌と向き合う、シンプルな3ステップ。',copy:'毎日続けやすい処方と使い心地を追求したスキンケアシリーズ。',cta:'シリーズを見る',price:'トライアル 1,480円',theme:'beauty',kind:'beauty'},
{brand:'日々の台所',tag:'産地直送・食品',title:'今週届く、畑からの旬便。',copy:'生産者から届く旬の野菜を、食べきりやすい量でお届けします。',cta:'おためし便を見る',price:'初回 1,980円',theme:'vegetable',kind:'food'},
{brand:'KURASHI LIFE',tag:'暮らし・保険',title:'暮らしの変化に合わせて、備えを見直す。',copy:'必要な保障をシンプルに整理。オンラインで内容を確認できます。',cta:'プランを比較する',price:'相談・見積り無料',theme:'home',kind:'service'},
{brand:'旅する日本茶',tag:'日本茶・茶器',title:'湯気の向こうに、ひと息の時間。',copy:'茶園ごとの個性を楽しむ煎茶と、日常使いの小さな茶器。',cta:'茶葉を選ぶ',price:'茶葉 1,100円〜',theme:'tea',kind:'food'},
{brand:'MORI SELECT',tag:'暮らしの道具',title:'長く使うものを、ひとつずつ。',copy:'木と布の質感を生かした、毎日の暮らしのための道具を集めました。',cta:'オンラインストア',price:'2,400円〜',theme:'craft',kind:'retail'},
{brand:'まなびの窓口',tag:'資格・スクール',title:'次の一歩を、今日から始めよう。',copy:'自宅から受講できる個別カリキュラム。学習相談も受け付けています。',cta:'無料相談を予約',price:'相談無料',theme:'desk',kind:'education'},
{brand:'白狐タクシー',tag:'地域交通',title:'参拝のあとの移動も、快適に。',copy:'神社・駅・宿泊施設をつなぐ予約制送迎サービス。',cta:'送迎エリアを見る',price:'初乗り 600円',theme:'car',kind:'local'},
{brand:'暦の宿',tag:'旅行・宿泊',title:'季節の節目を、旅先で迎える。',copy:'神社めぐりに便利な立地。早朝参拝にも合わせやすい宿泊プラン。',cta:'空室を確認',price:'1泊 9,800円〜',theme:'inn',kind:'travel'}
];
const pick=(offset=0)=>campaigns[(Math.floor(Math.random()*campaigns.length)+offset)%campaigns.length];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function styles(){
 if(document.getElementById('tenmei-ad-demo-style'))return;
 const s=document.createElement('style');s.id='tenmei-ad-demo-style';
 s.textContent=`
 .tm-ad-unit{position:relative;box-sizing:border-box;min-width:0;margin:24px auto;color:var(--text-main,#262923);font-family:inherit;isolation:isolate;background:var(--card-bg,#fff);border:1px solid var(--card-border,#e5e5df);border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(26,32,26,.045)}.tm-ad-unit *{box-sizing:border-box}
 .tm-ad-kicker{display:flex;align-items:center;gap:8px;color:var(--text-sub,#777b73);font-size:10px;font-weight:600;letter-spacing:.025em;line-height:1.5}.tm-ad-kicker b{display:inline-flex;align-items:center;min-height:19px;padding:1px 6px;border:1px solid #c9c9c2;border-radius:3px;background:transparent;color:#5c6259;font-size:9px;font-weight:700;letter-spacing:.035em}
 .tm-ad-brand{display:block;margin-top:8px;color:var(--text-sub,#73786f);font-size:10px;font-weight:650;letter-spacing:.035em}.tm-ad-unit h3{margin:5px 0 7px;color:var(--text-main,#262923);font-size:clamp(15px,1.45vw,19px);font-weight:680;letter-spacing:-.025em;line-height:1.48}.tm-ad-unit p{margin:0;color:var(--text-sub,#6f746c);font-size:12px;line-height:1.75}.tm-ad-price{display:block;margin-top:9px;color:var(--text-main,#292d28);font-size:12px;font-weight:650}
 .tm-ad-cta{display:inline-flex;align-items:center;justify-content:center;min-height:36px;margin-top:13px;padding:8px 16px;border:1px solid #4c5b4e;border-radius:5px;background:#465548;color:#fff;font-size:11px;font-weight:650;cursor:pointer;transition:background .16s ease,border-color .16s ease}.tm-ad-cta:hover{background:#344438;border-color:#344438}
 .tm-ad-info,.tm-ad-dismiss{position:absolute;top:9px;z-index:4;display:grid;place-items:center;width:25px;height:25px;padding:0;border:1px solid rgba(70,76,67,.22);border-radius:50%;background:rgba(255,255,255,.94);color:#555d53;font:600 12px/1 system-ui;cursor:pointer}.tm-ad-info{right:39px}.tm-ad-dismiss{right:8px;font-size:17px}.tm-ad-info-panel{position:absolute;z-index:6;top:39px;right:8px;width:min(280px,calc(100% - 16px));padding:12px 14px;border:1px solid #d7d8d1;border-radius:7px;background:#fff;color:#343a33;box-shadow:0 8px 28px #0002;font-size:11px;line-height:1.7}
 .tm-ad-art{position:relative;display:block;min-width:0;min-height:100px;overflow:hidden;background:#e8e7e1}.tm-ad-art img{display:block;width:100%;height:100%;min-height:inherit;object-fit:cover;object-position:center}.tm-ad-art.tm-ad-image-fallback{background:linear-gradient(135deg,#e9e6dc,#aeb9a9)}.tm-ad-art.tm-ad-image-fallback:after{content:"TENMEI SELECT";position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:600 12px Georgia,serif;letter-spacing:.18em;text-shadow:0 1px 8px #0005}
 .tm-ad-banner{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,32%);min-height:154px;max-width:1120px}.tm-ad-banner-copy{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:0;padding:22px 26px}.tm-ad-banner .tm-ad-art{grid-column:2;grid-row:1;min-height:154px}
 .tm-ad-billboard{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);min-height:250px;max-width:1120px}.tm-ad-billboard .tm-ad-banner-copy{padding:28px 34px}.tm-ad-billboard .tm-ad-art{min-height:250px}
 .tm-ad-infeed{display:grid;grid-template-columns:180px minmax(0,1fr);gap:20px;align-items:center;margin:16px 0;padding:14px;border:1px solid var(--card-border,#e5e5df);border-radius:8px;background:var(--card-bg,#fff);list-style:none}.tm-ad-infeed .tm-ad-art{min-height:116px;border-radius:5px}
 .tm-ad-inarticle{display:grid;grid-template-columns:minmax(180px,34%) minmax(0,1fr);gap:20px;align-items:center;margin:28px 0;padding:15px;border:1px solid var(--card-border,#e5e5df);border-radius:8px;background:var(--card-bg,#fff)}.tm-ad-inarticle .tm-ad-art{min-height:160px;border-radius:5px}
 .tm-ad-rectangle{width:min(100%,336px);margin:24px auto;padding:12px;border:1px solid var(--card-border,#e5e5df);border-radius:8px;background:var(--card-bg,#fff)}.tm-ad-rectangle .tm-ad-art{height:150px;margin:10px 0;border-radius:5px}
 .tm-ad-leaderboard{display:grid;grid-template-columns:100px minmax(0,1fr) auto;gap:16px;align-items:center;width:min(728px,100%);min-height:90px;padding:9px 14px}.tm-ad-leaderboard .tm-ad-art{height:70px;min-height:70px;border-radius:4px}.tm-ad-leaderboard h3{font-size:13px;margin:2px 0}.tm-ad-leaderboard p{font-size:10px}.tm-ad-leaderboard .tm-ad-cta{margin:0;white-space:nowrap}.tm-ad-mobile-banner{display:none}
 .tm-ad-skyscraper{width:160px;min-height:600px;padding:9px}.tm-ad-skyscraper .tm-ad-art{height:220px;margin:8px 0;border-radius:4px}
 .tm-ad-halfpage{width:300px;max-width:100%;min-height:600px;padding:12px;border:1px solid var(--card-border,#e5e5df);border-radius:8px;background:var(--card-bg,#fff)}.tm-ad-halfpage .tm-ad-art{height:310px;margin:10px 0;border-radius:5px}
 .tm-ad-multiplex{margin:26px 0;padding:16px;border:1px solid var(--card-border,#e5e5df);border-radius:9px;background:var(--card-bg,#fff)}.tm-ad-multiplex-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:0 0 11px;border-bottom:1px solid var(--card-border,#e5e5df)}.tm-ad-multiplex-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding-top:14px}.tm-ad-multiplex-item{position:relative;min-width:0;padding:0 0 4px}.tm-ad-multiplex-item .tm-ad-art{height:112px;margin-bottom:9px;border-radius:5px}.tm-ad-multiplex-item h3{font-size:13px;line-height:1.5}.tm-ad-multiplex-item .tm-ad-price{font-size:11px}
 .tm-ad-search{margin:20px 0;padding:15px 18px;border:1px solid var(--card-border,#e5e5df);border-radius:8px;background:var(--card-bg,#fff)}.tm-ad-search-result{padding:12px 0;border-bottom:1px solid var(--card-border,#ecece7)}.tm-ad-search-result:last-child{border-bottom:0}.tm-ad-search-result .tm-ad-brand{margin:0 0 4px}.tm-ad-search-result h3{margin:3px 0;color:#315f45;font-size:14px;text-decoration:underline;text-underline-offset:3px}.tm-ad-search-result p{font-size:11px}
 .tm-ad-sponsored-story{display:grid;grid-template-columns:minmax(200px,36%) minmax(0,1fr);gap:20px;align-items:center;padding:15px}.tm-ad-sponsored-story>.tm-ad-art{min-height:190px;border-radius:5px}
 .tm-ad-video{margin:24px 0;padding:14px;border:1px solid var(--card-border,#e5e5df);border-radius:8px;background:var(--card-bg,#fff)}.tm-ad-video-frame{position:relative;aspect-ratio:16/9;max-height:360px;overflow:hidden;border-radius:5px;background:#29342d}.tm-ad-video-frame .tm-ad-art{width:100%;height:100%;min-height:0}.tm-ad-video-play{position:absolute;top:50%;left:50%;z-index:2;display:grid;place-items:center;width:54px;height:54px;transform:translate(-50%,-50%);border:1px solid #ffffffc9;border-radius:50%;background:#17241bbd;color:#fff;font-size:19px;cursor:pointer}.tm-ad-video-caption{display:flex;justify-content:space-between;gap:8px;margin-top:11px}
 .tm-ad-related{margin:22px 0;padding:15px;border:1px solid var(--card-border,#e5e5df);border-radius:8px;background:var(--card-bg,#fff)}.tm-ad-related-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.tm-ad-related button{padding:7px 11px;border:1px solid #d8d9d1;border-radius:5px;background:transparent;color:inherit;font-size:11px;cursor:pointer}
 .tm-ad-side{display:none;position:fixed;z-index:850;top:50%;right:max(12px,calc((100vw - 1180px)/2 - 316px));width:300px;transform:translateY(-50%);box-shadow:0 8px 28px #00000012}.tm-ad-anchor{position:fixed;z-index:990;left:50%;bottom:max(12px,env(safe-area-inset-bottom));display:grid;grid-template-columns:112px minmax(0,1fr) auto 28px;gap:14px;align-items:center;width:min(860px,calc(100% - 28px));padding:10px 12px;transform:translateX(-50%);border:1px solid #d7d9d1;border-radius:8px;background:var(--card-bg,#fff);color:var(--text-main,#292923);box-shadow:0 8px 30px #0002}.tm-ad-anchor .tm-ad-art{height:66px;min-height:0;border-radius:5px}.tm-ad-anchor h3{font-size:13px}.tm-ad-anchor p{font-size:10px}
 @media(min-width:1824px){.tm-ad-side{display:block}}.tm-ad-side.tm-ad-skyscraper{width:160px}@media(max-width:640px){.tm-ad-mobile-banner{display:grid;grid-template-columns:78px minmax(0,1fr);gap:10px;align-items:center;width:min(320px,100%);min-height:100px;padding:8px}.tm-ad-mobile-banner .tm-ad-art{height:82px;min-height:82px;border-radius:4px}.tm-ad-mobile-banner .tm-ad-cta{grid-column:2;margin-top:6px;justify-self:start}.tm-ad-leaderboard{grid-template-columns:76px minmax(0,1fr);gap:10px}.tm-ad-leaderboard .tm-ad-art{height:68px;min-height:68px}.tm-ad-leaderboard .tm-ad-cta{grid-column:2;justify-self:start;margin-top:4px}}@media(max-width:760px){.tm-ad-banner,.tm-ad-billboard{grid-template-columns:minmax(0,1fr)}.tm-ad-banner .tm-ad-art,.tm-ad-billboard .tm-ad-art{grid-column:1;grid-row:1;height:150px;min-height:150px}.tm-ad-banner-copy,.tm-ad-billboard .tm-ad-banner-copy{padding:17px 18px}.tm-ad-infeed{grid-template-columns:112px minmax(0,1fr);gap:12px;padding:10px}.tm-ad-infeed .tm-ad-art{min-height:90px}.tm-ad-inarticle,.tm-ad-sponsored-story{grid-template-columns:112px minmax(0,1fr);gap:12px;padding:10px}.tm-ad-inarticle .tm-ad-art,.tm-ad-sponsored-story>.tm-ad-art{min-height:110px}.tm-ad-multiplex-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tm-ad-multiplex-item .tm-ad-art{height:92px}.tm-ad-anchor{grid-template-columns:66px minmax(0,1fr) 28px;gap:9px;padding:8px}.tm-ad-anchor .tm-ad-cta{display:none}.tm-ad-anchor .tm-ad-art{height:52px}.tm-ad-side{display:none!important}}@media(max-width:420px){.tm-ad-infeed,.tm-ad-inarticle,.tm-ad-sponsored-story{grid-template-columns:92px minmax(0,1fr);gap:9px}.tm-ad-infeed .tm-ad-art{min-height:84px}.tm-ad-inarticle .tm-ad-art,.tm-ad-sponsored-story>.tm-ad-art{min-height:96px}.tm-ad-unit h3{font-size:14px}.tm-ad-multiplex{padding:11px}.tm-ad-multiplex-grid{gap:9px}}@media(prefers-reduced-motion:reduce){.tm-ad-unit,.tm-ad-unit *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
 `;
 document.head.appendChild(s);
}
const IMAGE_ASSETS={
 onsen:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Urijima-onsen_Hot_spring.jpg/1280px-Urijima-onsen_Hot_spring.jpg',alt:'瓜島温泉の建物と山あいの風景',source:'Urijima-onsen Hot spring.jpg'},
 shrine:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Shrine_with_torii_-_Hokai-ji_-_Kamakura%2C_Kanagawa%2C_Japan_-_DSC08433.JPG/960px-Shrine_with_torii_-_Hokai-ji_-_Kamakura%2C_Kanagawa%2C_Japan_-_DSC08433.JPG',alt:'鎌倉・宝戒寺の鳥居と境内',source:'Shrine with torii - Hokai-ji.jpg'},
 sweets:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Anekaeshi_%28wagashi%29.jpg/1280px-Anekaeshi_%28wagashi%29.jpg',alt:'和菓子「あねかえし」の写真',source:'Anekaeshi (wagashi).jpg'},
 tea:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/A_cup_of_warm_tea.jpg/960px-A_cup_of_warm_tea.jpg',alt:'テーブルに置かれた温かいお茶',source:'A cup of warm tea.jpg'},
 mobile:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Celullar_or_mobile_phone.jpg/960px-Celullar_or_mobile_phone.jpg',alt:'画面を消したスマートフォンの写真',source:'Celullar or mobile phone.jpg'},
 beauty:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/Skin_care_cosmetics.jpg/1280px-Skin_care_cosmetics.jpg',alt:'スキンケア用品が並ぶ売り場',source:'Skin care cosmetics.jpg'},
 vegetable:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/VEGETABLES.jpg/1280px-VEGETABLES.jpg',alt:'市場に並ぶ新鮮な野菜',source:'VEGETABLES.jpg'},
 garden:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Japanese_Garden_01.jpg/1280px-Japanese_Garden_01.jpg',alt:'木々のある日本庭園',source:'Japanese Garden 01.jpg'},
 taxi:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Taxi.jpeg/960px-Taxi.jpeg',alt:'タクシーが並ぶ車庫の風景',source:'Taxi.jpeg'},
 bottle:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/Bottle_image.jpg/960px-Bottle_image.jpg',alt:'シンプルなスプレーボトル',source:'Bottle image.jpg'},
 craft:{src:'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Surface_wooden_furniture_interior.jpg/1280px-Surface_wooden_furniture_interior.jpg',alt:'木目のある木製家具の表面',source:'Surface wooden furniture interior.jpg',license:'Public domain'},
 food:{src:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Food%2C_Japan_-_DSC07989.jpg/1280px-Food%2C_Japan_-_DSC07989.jpg',alt:'日本の和菓子の写真',source:'Food, Japan - DSC07989.jpg'}
};
function art(c){
 const key=({inn:'onsen',omamori:'shrine',wood:'craft',craft:'craft',study:'garden',desk:'garden',home:'garden',car:'taxi',beauty:'bottle'}[c.theme]||c.theme);
 const asset=IMAGE_ASSETS[key]||IMAGE_ASSETS.garden;
 const el=document.createElement('div');el.className='tm-ad-art tm-art-'+c.theme;
 const img=document.createElement('img');img.src=asset.src;img.alt=asset.alt;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
 img.addEventListener('error',()=>el.classList.add('tm-ad-image-fallback'),{once:true});
 el.appendChild(img);el.dataset.imageSource=asset.source;el.dataset.imageLicense=asset.license||'CC0 1.0';return el;
}
function toast(message){if(typeof window.showToast==='function'){window.showToast(message,'info','広告デモ');}else{console.info('[広告デモ]',message);}}
function cta(label){const b=document.createElement('button');b.type='button';b.className='tm-ad-cta';b.textContent=label;b.addEventListener('click',()=>toast('これは架空広告のデモです。実際の販売・申込・リンク先はありません。'));return b;}
function info(el){const b=document.createElement('button');b.type='button';b.className='tm-ad-info';b.textContent='i';b.setAttribute('aria-label','この広告について');b.addEventListener('click',e=>{e.stopPropagation();const old=el.querySelector('.tm-ad-info-panel');if(old){old.remove();return;}const p=document.createElement('div');p.className='tm-ad-info-panel';const media=el.querySelector('.tm-ad-art');const source=media?.dataset.imageSource||'Wikimedia Commons';const license=media?.dataset.imageLicense||'CC0 1.0';p.textContent='これは架空広告のデモです。広告主・商品・価格・リンク先は実在しません。広告配信・クリック計測・外部送信は行いません。画像素材：Wikimedia Commons「'+source+'」（'+license+'）。';el.appendChild(p);});el.appendChild(b);}
function base(c,format){
 const e=document.createElement(format==='tm-ad-infeed'?'li':'aside');e.className='tm-ad-unit '+format;e.setAttribute('aria-label','広告（架空・デモ）');
 const close=document.createElement('button');close.type='button';close.className='tm-ad-dismiss';close.textContent='×';close.setAttribute('aria-label','この広告を閉じる');close.addEventListener('click',()=>{e.remove();toast('この広告を閉じました。');});e.appendChild(close);
 return e;
}
function leaderboard(c){
 const e=base(c,'tm-ad-leaderboard');e.appendChild(art(c));
 const x=document.createElement('div');x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>'+esc(c.tag)+'</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.copy)+'</p>';
 e.appendChild(x);e.appendChild(cta(c.cta));info(e);return e;
}
function mobileBanner(c){
 const e=base(c,'tm-ad-mobile-banner');e.appendChild(art(c));
 const x=document.createElement('div');x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.price)+'</p>';
 e.appendChild(x);e.appendChild(cta(c.cta));info(e);return e;
}
function responsiveTopAd(view,id,c){
 const mobile=window.matchMedia&&window.matchMedia('(max-width:640px)').matches;
 return insertAfter(id,view,mobile?mobileBanner(c):leaderboard(c));
}
function skyscraper(c){
 const e=base(c,'tm-ad-skyscraper');e.appendChild(art(c));
 const x=document.createElement('div');x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.copy)+'</p><strong class="tm-ad-price">'+esc(c.price)+'</strong>';
 e.appendChild(x);e.appendChild(cta(c.cta));info(e);return e;
}
function banner(c){const e=base(c,'tm-ad-banner');const x=document.createElement('div');x.className='tm-ad-banner-copy';x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>'+esc(c.tag)+'</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.copy)+'</p><strong class="tm-ad-price">'+esc(c.price)+'</strong>';x.appendChild(cta(c.cta));e.append(x,art(c));info(e);return e;}
function billboard(c){const e=base(c,'tm-ad-billboard');const x=document.createElement('div');x.className='tm-ad-banner-copy';x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>FEATURED</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.copy)+'</p><strong class="tm-ad-price">'+esc(c.price)+'</strong>';x.appendChild(cta(c.cta));e.append(x,art(c));info(e);return e;}
function infeed(c){const e=base(c,'tm-ad-infeed');e.appendChild(art(c));const x=document.createElement('div');x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>'+esc(c.tag)+'</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.copy)+'</p><strong class="tm-ad-price">'+esc(c.price)+'</strong>';x.appendChild(cta(c.cta));e.appendChild(x);info(e);return e;}
function inarticle(c){const e=base(c,'tm-ad-inarticle');e.appendChild(art(c));const x=document.createElement('div');x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>SPONSORED</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.copy)+'</p>';x.appendChild(cta(c.cta));e.appendChild(x);info(e);return e;}
function rectangle(c){const e=base(c,'tm-ad-rectangle');e.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>'+esc(c.tag)+'</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span>';e.appendChild(art(c));const h=document.createElement('h3');h.textContent=c.title;const p=document.createElement('p');p.textContent=c.copy;e.append(h,p);const price=document.createElement('strong');price.className='tm-ad-price';price.textContent=c.price;e.append(price,cta(c.cta));info(e);return e;}
function halfpage(c){const e=base(c,'tm-ad-halfpage');e.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>'+esc(c.tag)+'</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span>';e.appendChild(art(c));const h=document.createElement('h3');h.textContent=c.title;const p=document.createElement('p');p.textContent=c.copy;e.append(h,p,cta(c.cta));info(e);return e;}
function multiplex(){const e=base(null,'tm-ad-multiplex');const head=document.createElement('div');head.className='tm-ad-multiplex-head';head.innerHTML='<span class="tm-ad-kicker"><b>広告（架空）</b><span>おすすめの商品</span></span><span class="tm-ad-brand">SPONSORED</span>';e.appendChild(head);const grid=document.createElement('div');grid.className='tm-ad-multiplex-grid';const used=[];for(let i=0;i<6;i++){let c;do{c=pick(i);}while(used.includes(c.brand));used.push(c.brand);const item=document.createElement('div');item.className='tm-ad-multiplex-item';item.appendChild(art(c));const h=document.createElement('h3');h.textContent=c.title;const p=document.createElement('span');p.className='tm-ad-price';p.textContent=c.price;item.append(h,p,cta('詳細を見る'));grid.appendChild(item);}e.appendChild(grid);info(e);return e;}
function sponsoredStory(c){const e=base(c,'tm-ad-inarticle');e.classList.add('tm-ad-sponsored-story');e.appendChild(art(c));const x=document.createElement('div');x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>PR · SPONSORED STORY</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.copy)+'</p><span class="tm-ad-price">'+esc(c.price)+'</span>';x.appendChild(cta('詳しく読む'));e.appendChild(x);info(e);return e;}
function searchAd(c){const e=base(c,'tm-ad-search');e.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>スポンサー検索結果</span></div>';const choices=[c,pick(2)];choices.forEach(ad=>{const item=document.createElement('div');item.className='tm-ad-search-result';const brand=document.createElement('span');brand.className='tm-ad-brand';brand.textContent=ad.brand;const h=document.createElement('h3');h.textContent=ad.title;const p=document.createElement('p');p.textContent=ad.copy;item.append(brand,h,p);item.appendChild(cta('詳細を見る'));e.appendChild(item);});info(e);return e;}
function videoAd(c){const e=base(c,'tm-ad-video');e.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>動画広告デモ · 15秒</span></div>';const frame=document.createElement('div');frame.className='tm-ad-video-frame';frame.appendChild(art(c));const play=document.createElement('button');play.type='button';play.className='tm-ad-video-play';play.textContent='▶';play.setAttribute('aria-label','動画広告デモを再生');play.addEventListener('click',()=>{play.textContent='デモ';toast('動画の実再生はありません。架空の動画広告枠です。');});frame.appendChild(play);const cap=document.createElement('div');cap.className='tm-ad-video-caption';cap.innerHTML='<span class="tm-ad-brand">'+esc(c.brand)+'</span><span class="tm-ad-brand">SPONSORED VIDEO</span>';e.append(frame,cap);info(e);return e;}
function related(){const e=base(null,'tm-ad-related');e.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>関連するサービス</span></div>';const row=document.createElement('div');row.className='tm-ad-related-links';['神社めぐりの宿','お守り・和雑貨','御朱印帳','日本茶のお取り寄せ','週末の日帰り旅'].forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.addEventListener('click',()=>toast('検索リンクのデモです。実際の検索・外部遷移はありません。'));row.appendChild(b);});e.appendChild(row);return e;}
function insertAfter(id,ref,node){if(!ref||document.getElementById(id))return false;node.id=id;ref.insertAdjacentElement('afterend',node);return true;}
function insertIntoList(id,list,node){if(!list||document.getElementById(id))return false;const children=Array.from(list.children).filter(el=>!el.classList.contains('tm-ad-unit'));if(children.length<2)return false;node.id=id;list.insertBefore(node,children[Math.min(2,children.length-1)]||null);return true;}
function renderView(view){
 if(!view||!enabled)return;
 const allowed=new Set(['view-home','view-news','view-news-list','view-column','view-column-list','view-article-detail','view-howto','view-about','view-developer']);
 if(!allowed.has(view.id))return;
 const suffix=view.id||'page';
 const header=view.querySelector(':scope > header, .home-v4-hero, .column-library-hero, .howto-guide-hero, .news-chronicle-backbar');
 const list=view.querySelector('.home-v4-article-list,.news-bulletin-list,.column-library-list,#home-news-list,#view-news-list,#view-column-list');
 const article=view.querySelector('#article-detail-content,.news-chronicle-frame,.column-library-layout');
 const paragraphs=article?Array.from(article.querySelectorAll('p')).filter(p=>(p.textContent||'').trim().length>80):[];
 if(view.id==='view-home'){
   if(header)insertAfter('tenmei-ad-billboard-'+suffix,header,billboard(pick(1)));
   if(list)insertIntoList('tenmei-ad-feed-'+suffix,list,infeed(pick(4)));
   return;
 }
 if(view.id==='view-article-detail'||(article&&paragraphs.length>=3)){
   if(header)responsiveTopAd(header,'tenmei-ad-banner-'+suffix,pick(2));
   if(paragraphs.length>=3){
     const sponsored=view.id==='view-news'?sponsoredStory(pick(3)):inarticle(pick(3));
     insertAfter('tenmei-ad-article-'+suffix,paragraphs[Math.min(2,paragraphs.length-1)],sponsored);
   }else if(article){
     insertAfter('tenmei-ad-rectangle-'+suffix,article,rectangle(pick(3)));
   }
   if(article)insertAfter('tenmei-ad-related-'+suffix,article,related());
   return;
 }
 if(list){
   const searchAnchor=view.querySelector('.column-library-search,.news-bulletin-search');
   if(searchAnchor)insertAfter('tenmei-ad-search-'+suffix,searchAnchor,searchAd(pick(5)));
   else if(header)responsiveTopAd(header,'tenmei-ad-banner-'+suffix,pick(5));
   insertIntoList('tenmei-ad-feed-'+suffix,list,infeed(pick(6)));
   const editorialItems=Array.from(list.children).filter(el=>!el.classList.contains('tm-ad-unit'));
   if(editorialItems.length>=8){const anchor=editorialItems[Math.min(6,editorialItems.length-1)];insertAfter('tenmei-ad-multiplex-'+suffix,anchor,multiplex());}
   return;
 }
 if(view.id==='view-howto'){
   if(header)responsiveTopAd(header,'tenmei-ad-banner-'+suffix,pick(7));
   const sections=Array.from(view.querySelectorAll(':scope > section,.howto-guide-entry')).filter(el=>!el.classList.contains('tm-ad-unit'));
   if(sections.length>=4)insertAfter('tenmei-ad-video-'+suffix,sections[2],videoAd(pick(8)));
   else if(sections.length>=2)insertAfter('tenmei-ad-rectangle-'+suffix,sections[1],rectangle(pick(8)));
   return;
 }
 if(header)insertAfter('tenmei-ad-banner-'+suffix,header,banner(pick(9)));
}
function renderGlobal(){
 if(!enabled||!document.body)return;
 styles();
 const view=document.querySelector('.view-section.active');
 const contentView=!!view&&['view-home','view-news','view-news-list','view-column','view-column-list','view-article-detail','view-howto','view-about','view-developer'].includes(view.id);
 if(!contentView){document.querySelectorAll('.tm-ad-unit').forEach(el=>el.remove());return;}
 renderView(view);
 if(!document.getElementById('tenmei-ad-side-rail')&&window.innerWidth>1100){const side=window.innerWidth>=1900?skyscraper(pick(7)):halfpage(pick(7));side.id='tenmei-ad-side-rail';side.classList.add('tm-ad-side');document.body.appendChild(side);}
}
function closeAll(){
 enabled=false;
 document.querySelectorAll('.tm-ad-unit').forEach(el=>el.remove());
 window.removeEventListener('keydown',onEscape);
 if(typeof window.showToast==='function')window.showToast('広告デモを閉じました。','success','広告デモ');
}
function onEscape(event){if(event.key==='Escape'&&enabled){closeAll();}}
function show(){
 enabled=true;renderGlobal();
 if(window.__tenmeiAdAnchorMaybeShow)window.__tenmeiAdAnchorMaybeShow();
 window.addEventListener('keydown',onEscape);
 window.dispatchEvent(new CustomEvent('tenmei:mock-ads-shown'));
 if(typeof window.showToast==='function')window.showToast('以下はすべて架空の広告です。実在の広告配信・販売・申込はありません。','info','広告デモ');
}
function queue(){if(renderQueued)return;renderQueued=true;window.setTimeout(()=>{renderQueued=false;renderGlobal();},120);}
function observe(){
 if(typeof MutationObserver!=='function')return;
 const observer=new MutationObserver(records=>{if(!enabled)return;let relevant=false;for(const r of records){if(r.type==='attributes'&&r.target.classList&&r.target.classList.contains('view-section')){relevant=true;break;}if(r.type==='childList'&&r.target.closest&&r.target.closest('.view-section')){relevant=true;break;}}if(relevant)queue();});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
}
function anchorOnScroll(){
 let shown=false;
 function maybeShow(){
   if(!enabled||shown||window.scrollY<700)return;
   const active=document.querySelector('.view-section.active');if(!active||!['view-home','view-news','view-news-list','view-column','view-column-list','view-article-detail','view-howto','view-about','view-developer'].includes(active.id))return;
   shown=true;
   const c=pick(8),e=base(c,'tm-ad-anchor');e.id='tenmei-ad-anchor';e.appendChild(art(c));
   const x=document.createElement('div');x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>'+esc(c.tag)+'</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.price)+'</p>';
   e.appendChild(x);e.appendChild(cta(c.cta));document.body.appendChild(e);
 }
 window.__tenmeiAdAnchorMaybeShow=maybeShow;
 window.addEventListener('scroll',maybeShow,{passive:true});
}
window.TenmeiMockAds={show,close:closeAll,render:renderGlobal,isEnabled:()=>enabled};
observe();anchorOnScroll();
})();