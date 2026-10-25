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
 .tm-ad-demo-notice{display:flex;align-items:flex-start;gap:10px;margin:14px 0;padding:10px 13px;border:1px solid #c8b99b;border-left:3px solid #9b7b45;border-radius:5px;background:#fbf8f1;color:#443b2e;font:12px/1.65 inherit}
 .tm-ad-demo-notice strong{display:block;font-size:11px;letter-spacing:.04em}
 .tm-ad-demo-notice span{display:block;color:#655c4e}
 .tm-ad-unit{position:relative;box-sizing:border-box;min-width:0;color:var(--text-main,#292821);font-family:inherit;isolation:isolate}
 .tm-ad-unit *{box-sizing:border-box}
 .tm-ad-kicker{display:flex;align-items:center;gap:7px;color:#6e6b63;font-size:9px;font-weight:700;letter-spacing:.06em;line-height:1.4}
 .tm-ad-kicker b{display:inline-block;padding:2px 5px;border:1px solid #c9c4b9;border-radius:2px;color:#625b4d;font-size:9px;font-weight:700;letter-spacing:.02em}
 .tm-ad-brand{color:#6e6b63;font-size:9px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
 .tm-ad-unit h3{margin:4px 0 5px;color:inherit;font-size:clamp(13px,1.4vw,17px);font-weight:750;line-height:1.45}
 .tm-ad-unit p{margin:0;color:var(--text-muted,#777);font-size:11px;line-height:1.65}
 .tm-ad-price{display:block;margin-top:6px;color:inherit;font-size:11px;font-weight:750}
 .tm-ad-cta{display:inline-flex;align-items:center;justify-content:center;min-height:32px;margin-top:9px;padding:6px 13px;border:1px solid #4d594f;border-radius:3px;background:#465247;color:#fff;font-size:10px;font-weight:700;letter-spacing:.02em;cursor:pointer}
 .tm-ad-cta:hover{background:#303b32}
 .tm-ad-info{position:absolute;top:7px;right:7px;z-index:2;width:19px;height:19px;border:1px solid #c9c6bd;border-radius:50%;background:#fff;color:#625f57;font:700 11px/1 system-ui;cursor:pointer}
 .tm-ad-info-panel{position:absolute;z-index:5;top:30px;right:7px;width:min(245px,calc(100% - 14px));padding:10px 12px;border:1px solid #d4d0c7;border-radius:5px;background:#fff;color:#3c3a35;box-shadow:0 5px 18px #0002;font-size:10px;line-height:1.65}
 .tm-ad-art{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;min-height:100px;overflow:hidden;background:#d8d0c0}.tm-ad-art svg{position:absolute;inset:0;width:100%;height:100%;display:block}
 .tm-ad-art:before{position:absolute;inset:0;content:"";background:radial-gradient(ellipse at 75% 20%,#ffffff80 0,transparent 38%),linear-gradient(130deg,#eee8dc,#b7a68c)}
 .tm-ad-art:after{position:absolute;right:12%;bottom:-38%;width:60%;height:110%;border:1px solid #ffffff8c;border-radius:50%;content:"";box-shadow:0 0 0 18px #ffffff20,0 0 0 38px #ffffff12}
 .tm-ad-art-mark{position:relative;z-index:1;display:grid;place-items:center;width:68px;height:68px;border:1px solid #ffffffb0;border-radius:50%;background:#ffffff20;color:#fff;font:700 11px/1.4 Georgia,serif;letter-spacing:.13em;text-align:center;text-shadow:0 1px 8px #0003}
 .tm-art-onsen:before{background:linear-gradient(160deg,#d9e2d9 0 30%,#839c8d 31% 54%,#536f65 55% 100%)}
 .tm-art-wood:before,.tm-art-craft:before{background:linear-gradient(135deg,#e8ddc9,#a58a62)}
 .tm-art-omamori:before{background:linear-gradient(135deg,#d8c4ad,#8e574e)}
 .tm-art-sweets:before{background:linear-gradient(135deg,#f0d8cf,#c28d7c)}
 .tm-art-mobile:before{background:linear-gradient(135deg,#d7e3e8,#66849a)}
 .tm-art-study:before,.tm-art-desk:before{background:linear-gradient(135deg,#e4dfd1,#8b8d78)}
 .tm-art-beauty:before{background:linear-gradient(135deg,#eadbd8,#ad8d8d)}
 .tm-art-vegetable:before{background:linear-gradient(135deg,#dbe3cb,#7f9166)}
 .tm-art-home:before{background:linear-gradient(135deg,#d9dfe0,#7c8585)}
 .tm-art-tea:before{background:linear-gradient(135deg,#e5dfc8,#8d9870)}
 .tm-art-car:before{background:linear-gradient(135deg,#d9e0e3,#71818a)}
 .tm-art-inn:before{background:linear-gradient(135deg,#e6d9c4,#9b8062)}
 .tm-ad-banner{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,28%);min-height:112px;margin:18px 0 22px;overflow:hidden;border:1px solid var(--card-border,rgba(0,0,0,.14));border-radius:5px;background:var(--card-bg,#fff)}
 .tm-ad-banner-copy{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:14px 18px}
 .tm-ad-banner .tm-ad-art{grid-column:2;grid-row:1;min-height:112px}
 .tm-ad-banner .tm-ad-art-mark{width:78px;height:78px}
 .tm-ad-billboard{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,36%);min-height:218px;margin:22px 0;overflow:hidden;border:1px solid var(--card-border,rgba(0,0,0,.14));border-radius:5px;background:var(--card-bg,#fff)}.tm-ad-billboard .tm-ad-banner-copy{padding:22px 25px}.tm-ad-billboard .tm-ad-art{min-height:218px}.tm-ad-infeed{display:grid;grid-template-columns:116px minmax(0,1fr);gap:13px;align-items:center;margin:13px 0;padding:11px;border:1px solid var(--card-border,rgba(0,0,0,.13));border-radius:5px;background:var(--card-bg,#fff);list-style:none}
 .tm-ad-infeed .tm-ad-art{min-height:92px;border-radius:3px}
 .tm-ad-inarticle{display:grid;grid-template-columns:minmax(110px,27%) minmax(0,1fr);gap:13px;align-items:center;margin:20px 0;padding:12px;border:1px solid var(--card-border,rgba(0,0,0,.14));border-radius:4px;background:var(--card-bg,#fff)}
 .tm-ad-rectangle{width:min(100%,336px);margin:18px auto;padding:10px;border:1px solid var(--card-border,rgba(0,0,0,.16));border-radius:4px;background:var(--card-bg,#fff)}
 .tm-ad-rectangle .tm-ad-art{min-height:148px;margin:8px 0}
 .tm-ad-halfpage{width:300px;max-width:100%;height:600px;padding:10px;border:1px solid var(--card-border,rgba(0,0,0,.16));border-radius:4px;background:var(--card-bg,#fff)}
 .tm-ad-halfpage .tm-ad-art{height:320px;margin:8px 0}
 .tm-ad-multiplex{margin:20px 0;padding:12px;border:1px solid var(--card-border,rgba(0,0,0,.14));border-radius:4px;background:var(--card-bg,#fff)}
 .tm-ad-multiplex-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding-bottom:8px;border-bottom:1px solid var(--card-border,rgba(0,0,0,.1))}
 .tm-ad-multiplex-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding-top:10px}
 .tm-ad-multiplex-item{min-width:0}
 .tm-ad-multiplex-item .tm-ad-art{min-height:74px;margin-bottom:7px}
 .tm-ad-multiplex-item h3{font-size:11px}
 .tm-ad-multiplex-item .tm-ad-price{font-size:9px}
 .tm-ad-search{margin:15px 0;padding:12px 14px;border:1px solid var(--card-border,rgba(0,0,0,.14));border-radius:4px;background:var(--card-bg,#fff)}
 .tm-ad-search-result{padding:8px 0;border-bottom:1px solid var(--card-border,rgba(0,0,0,.1))}
 .tm-ad-search-result:last-child{border-bottom:0}
 .tm-ad-search-result .tm-ad-brand{display:block;margin-bottom:3px}
 .tm-ad-search-result h3{margin:2px 0;color:#315d45;font-size:13px;text-decoration:underline;text-underline-offset:2px}
 .tm-ad-search-result p{font-size:10px}
 .tm-ad-video{margin:18px 0;padding:10px;border:1px solid var(--card-border,rgba(0,0,0,.14));border-radius:4px;background:var(--card-bg,#fff)}
 .tm-ad-video-frame{position:relative;display:grid;place-items:center;min-height:170px;overflow:hidden;background:linear-gradient(135deg,#d8e0d6,#526b5c);color:#fff}
 .tm-ad-video-frame:before{position:absolute;inset:0;content:"";background:linear-gradient(110deg,transparent 35%,#ffffff26 50%,transparent 65%)}
 .tm-ad-video-play{position:relative;z-index:1;width:48px;height:48px;border:1px solid #ffffffc9;border-radius:50%;background:#ffffff25;color:#fff;font-size:18px;cursor:pointer}
 .tm-ad-video-caption{display:flex;justify-content:space-between;gap:8px;margin-top:8px}
 .tm-ad-related{margin:16px 0;padding:12px;border:1px solid var(--card-border,rgba(0,0,0,.14));border-radius:4px;background:var(--card-bg,#fff)}
 .tm-ad-related-links{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
 .tm-ad-related button{padding:6px 9px;border:1px solid #d3cfc5;border-radius:3px;background:transparent;color:inherit;font-size:10px;cursor:pointer}
 .tm-ad-side{display:none;position:fixed;z-index:850;top:46%;right:calc((100vw - 1180px)/2 - 312px);width:300px;transform:translateY(-35%);box-shadow:0 4px 20px #0000000b}
 .tm-ad-anchor{position:fixed;z-index:990;left:50%;bottom:max(9px,env(safe-area-inset-bottom));display:grid;grid-template-columns:76px minmax(0,1fr) auto 26px;gap:10px;align-items:center;width:min(760px,calc(100% - 24px));padding:8px 9px;transform:translateX(-50%);border:1px solid #cfc9bc;border-radius:5px;background:#fff;color:#292821;box-shadow:0 5px 24px #0002}
 .tm-ad-anchor .tm-ad-art{min-height:48px;border-radius:3px}
 .tm-ad-anchor h3{font-size:11px}
 .tm-ad-anchor p{font-size:9px}
 .tm-ad-close{width:25px;height:25px;border:1px solid #ddd;border-radius:50%;background:#f7f6f2;color:#555;font-size:15px;cursor:pointer}
 .tm-ad-toast{position:fixed;z-index:1200;left:50%;bottom:22px;transform:translateX(-50%);max-width:min(420px,calc(100% - 28px));padding:11px 15px;border:1px solid #cfc9bc;border-radius:5px;background:#fff;color:#302e29;box-shadow:0 5px 22px #0002;font-size:11px;line-height:1.6}
 @media(min-width:1824px){.tm-ad-side{display:block}}
 @media(max-width:640px){.tm-ad-banner{grid-template-columns:1fr}.tm-ad-banner .tm-ad-art{grid-column:1;grid-row:1;min-height:74px}.tm-ad-banner-copy{padding:12px 13px}.tm-ad-infeed{grid-template-columns:78px minmax(0,1fr);gap:9px;padding:9px}.tm-ad-infeed .tm-ad-art{min-height:78px}.tm-ad-inarticle{grid-template-columns:82px minmax(0,1fr);gap:9px;padding:9px}.tm-ad-inarticle .tm-ad-art{min-height:78px}.tm-ad-multiplex-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.tm-ad-anchor{grid-template-columns:52px minmax(0,1fr) 25px;gap:8px;padding:7px}.tm-ad-anchor .tm-ad-cta{display:none}.tm-ad-anchor .tm-ad-art{min-height:42px}.tm-ad-video-frame{min-height:130px}}
 @media(prefers-reduced-motion:reduce){.tm-ad-unit,.tm-ad-unit *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
 `;
 document.head.appendChild(s);
}
function art(c){
 const el=document.createElement('div');el.className='tm-ad-art tm-art-'+c.theme;el.setAttribute('aria-hidden','true');
 const scenes={
 onsen:'<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice"><rect width="320" height="180" fill="#d8e3dc"/><path d="M0 92 65 28 120 86 188 18 270 95 320 56V180H0Z" fill="#81988a"/><path d="M0 118 70 74 130 117 210 67 320 120V180H0Z" fill="#536f62"/><path d="M0 140Q75 120 150 143T320 136V180H0Z" fill="#9bb5ac"/><rect x="168" y="82" width="108" height="52" rx="3" fill="#795f48"/><path d="M156 84 222 46 289 84Z" fill="#493e34"/><rect x="188" y="98" width="24" height="36" fill="#d6c29c"/><path d="M0 157Q90 140 170 158T320 151V180H0Z" fill="#c2d3ce"/><path d="M205 42q-12-12 0-23m20 23q-12-12 0-23" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
 wood:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#e7ddc9"/><path d="M35 76 160 25 285 76Z" fill="#574537"/><path d="M55 76H265V91H55Z" fill="#8a6748"/><rect x="74" y="91" width="172" height="64" fill="#b78d5b"/><rect x="91" y="105" width="138" height="39" fill="#e6d5b5"/><path d="M105 105V144M215 105V144" stroke="#916d4c" stroke-width="4"/><rect x="142" y="95" width="36" height="50" rx="3" fill="#a23d38"/><path d="M160 95V83m-13 12 13-9 13 9" stroke="#e9d8b4" stroke-width="3" fill="none"/><path d="M30 157H290" stroke="#8d795d" stroke-width="4"/></svg>',
 omamori:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#d9c5b5"/><circle cx="250" cy="35" r="72" fill="#eadfd2"/><path d="M105 48Q160 28 215 48V102Q215 143 160 163Q105 143 105 102Z" fill="#9c3437"/><path d="M120 57Q160 43 200 57V101Q200 130 160 146Q120 130 120 101Z" fill="#c45a4c"/><path d="M160 28V50" stroke="#d5b36f" stroke-width="6"/><path d="M145 48 160 62 175 48" stroke="#e9d5a7" stroke-width="4" fill="none"/><path d="M135 83H185M135 96H185" stroke="#f1dfbb" stroke-width="3"/><circle cx="160" cy="113" r="10" fill="#e9d5a7"/></svg>',
 sweets:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#f0dcd4"/><ellipse cx="160" cy="137" rx="118" ry="26" fill="#b98273"/><ellipse cx="160" cy="126" rx="108" ry="24" fill="#f8eee7"/><circle cx="105" cy="107" r="29" fill="#c98c9a"/><circle cx="160" cy="94" r="30" fill="#e8c88b"/><circle cx="215" cy="108" r="28" fill="#9baf8b"/><path d="M95 100q10-18 20 0m34-12q12-18 24 0m50 12q10-18 20 0" stroke="#fff4e8" stroke-width="4" fill="none"/><path d="M55 152H265" stroke="#96715f" stroke-width="4"/></svg>',
 mobile:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#d8e5eb"/><circle cx="250" cy="28" r="70" fill="#edf4f6"/><rect x="120" y="14" width="82" height="152" rx="13" fill="#293e50"/><rect x="126" y="23" width="70" height="133" rx="8" fill="#9ec0d0"/><rect x="133" y="37" width="56" height="70" rx="4" fill="#eaf2f4"/><path d="M139 93 151 72 163 84 179 58 189 93Z" fill="#6b91a4"/><rect x="140" y="116" width="42" height="5" rx="2" fill="#fff"/><rect x="140" y="127" width="30" height="4" rx="2" fill="#dce8ec"/><circle cx="161" cy="146" r="3" fill="#dce8ec"/></svg>',
 study:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#e5e2d5"/><rect x="38" y="116" width="244" height="13" rx="3" fill="#8d745b"/><path d="M55 116V145M264 116V145" stroke="#705c49" stroke-width="6"/><path d="M93 111V47Q93 37 105 37H218Q229 37 229 47V111Z" fill="#35434a"/><rect x="101" y="45" width="120" height="58" fill="#c5d7d5"/><path d="M101 87 135 58 160 81 186 59 221 91V103H101Z" fill="#809d90"/><path d="M82 116 108 92 143 116Z" fill="#c9b28d"/><rect x="156" y="101" width="72" height="9" rx="2" fill="#d6c7ad"/><path d="M45 115 65 83 85 115" fill="#b18b61"/></svg>',
 beauty:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#eadbd9"/><ellipse cx="160" cy="151" rx="112" ry="17" fill="#c9aaa5"/><rect x="73" y="91" width="48" height="58" rx="8" fill="#b98e87"/><rect x="83" y="78" width="28" height="15" rx="3" fill="#8d6a65"/><rect x="140" y="58" width="54" height="91" rx="7" fill="#f3ece5"/><rect x="153" y="43" width="28" height="17" rx="3" fill="#a77f78"/><rect x="208" y="83" width="39" height="66" rx="6" fill="#d3b8aa"/><rect x="217" y="70" width="21" height="14" rx="2" fill="#92746c"/><path d="M151 96H183M151 106H183" stroke="#ad8e86" stroke-width="3"/></svg>',
 vegetable:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#dce5ce"/><path d="M55 105Q160 75 265 105L245 158H75Z" fill="#a77a4d"/><path d="M72 110 248 110" stroke="#704e35" stroke-width="5"/><circle cx="108" cy="92" r="30" fill="#78965c"/><circle cx="157" cy="82" r="32" fill="#9caf6b"/><circle cx="210" cy="93" r="30" fill="#d0a45d"/><path d="M106 65q-12-22 8-34m42 22q-6-23 14-32m37 42q3-22 22-25" stroke="#52774b" stroke-width="5" fill="none"/><path d="M90 115q70 25 140 0" stroke="#d5b38a" stroke-width="4" fill="none"/></svg>',
 home:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#dce2e1"/><rect x="72" y="72" width="176" height="91" fill="#f1eee5"/><path d="M55 78 160 20 265 78Z" fill="#7d6e61"/><rect x="96" y="94" width="42" height="42" fill="#9db5b7"/><rect x="181" y="94" width="42" height="42" fill="#9db5b7"/><rect x="143" y="117" width="34" height="46" fill="#a68b6c"/><path d="M117 94V136M202 94V136" stroke="#f6f4ed" stroke-width="3"/><path d="M40 164H280" stroke="#9ca99e" stroke-width="5"/></svg>',
 tea:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#e6e1ce"/><ellipse cx="160" cy="145" rx="100" ry="18" fill="#b8a77f"/><path d="M93 82H211Q207 134 152 137Q98 133 93 82Z" fill="#f4eee0"/><path d="M211 91Q250 80 241 116Q230 132 207 119" fill="none" stroke="#f4eee0" stroke-width="10"/><ellipse cx="152" cy="82" rx="59" ry="12" fill="#b7a67e"/><ellipse cx="152" cy="80" rx="49" ry="8" fill="#6e855d"/><path d="M126 57q-14-16 0-29m22 29q-14-16 0-29" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
 craft:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#e7dfcf"/><rect x="78" y="56" width="164" height="100" rx="5" fill="#b18a5f"/><path d="M119 58V43Q119 22 160 22Q201 22 201 43V58" stroke="#795b3e" stroke-width="8" fill="none"/><path d="M98 77H222M98 91H222" stroke="#d6b98f" stroke-width="3"/><circle cx="160" cy="121" r="12" fill="#826449"/></svg>',
 desk:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#e4e0d2"/><rect x="50" y="120" width="220" height="12" rx="2" fill="#8a765c"/><path d="M72 132V160M248 132V160" stroke="#705d49" stroke-width="6"/><rect x="102" y="50" width="116" height="70" rx="5" fill="#4b5557"/><rect x="109" y="57" width="102" height="56" fill="#c5d6d0"/><path d="M89 119H231L217 129H103Z" fill="#9eaa9d"/><rect x="52" y="100" width="34" height="19" fill="#c0a16f"/><path d="M52 100 69 87 86 100" fill="#8f7757"/></svg>',
 car:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#dbe2e5"/><path d="M0 136H320" stroke="#7e8d91" stroke-width="44"/><path d="M0 136H320" stroke="#f3eee0" stroke-width="2" stroke-dasharray="20 16"/><path d="M64 111 84 82Q91 70 111 70H206Q224 70 236 91L256 111V139H64Z" fill="#f1f0e9"/><path d="M101 78H203Q214 78 223 98H87Z" fill="#8fa9b2"/><circle cx="105" cy="139" r="16" fill="#39454a"/><circle cx="216" cy="139" r="16" fill="#39454a"/><circle cx="105" cy="139" r="7" fill="#c9c7bc"/><circle cx="216" cy="139" r="7" fill="#c9c7bc"/></svg>',
 inn:'<svg viewBox="0 0 320 180"><rect width="320" height="180" fill="#e5ddcd"/><path d="M38 80 160 28 282 80Z" fill="#655244"/><rect x="57" y="80" width="206" height="82" fill="#b99b75"/><rect x="81" y="99" width="43" height="63" fill="#6d5948"/><rect x="139" y="96" width="43" height="33" fill="#d8c8a8"/><rect x="198" y="99" width="43" height="63" fill="#6d5948"/><path d="M45 162H275" stroke="#806e58" stroke-width="5"/><path d="M160 28V12" stroke="#8a765b" stroke-width="3"/></svg>'
 };
 el.innerHTML=scenes[c.theme]||scenes.craft;
 return el;
}
function toast(message){let old=document.getElementById('tenmei-ad-demo-toast');if(old)old.remove();const n=document.createElement('div');n.id='tenmei-ad-demo-toast';n.className='tm-ad-toast';n.setAttribute('role','status');n.textContent=message;document.body.appendChild(n);window.setTimeout(()=>n.remove(),3200);}
function cta(label){const b=document.createElement('button');b.type='button';b.className='tm-ad-cta';b.textContent=label;b.addEventListener('click',()=>toast('これは架空広告のデモです。実際の販売・申込・リンク先はありません。'));return b;}
function info(el){const b=document.createElement('button');b.type='button';b.className='tm-ad-info';b.textContent='i';b.setAttribute('aria-label','この広告について');b.addEventListener('click',e=>{e.stopPropagation();const old=el.querySelector('.tm-ad-info-panel');if(old){old.remove();return;}const p=document.createElement('div');p.className='tm-ad-info-panel';p.textContent='デモ用の架空広告です。広告主・商品・価格・リンク先は実在せず、広告配信、クリック計測、外部送信は行っていません。';el.appendChild(p);});el.appendChild(b);}
function base(c,format){const e=document.createElement('aside');e.className='tm-ad-unit '+format;e.setAttribute('aria-label','広告（架空・デモ）');return e;}
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
function notice(){const n=document.createElement('aside');n.className='tm-ad-demo-notice';n.innerHTML='<div><strong>広告表示デモ — 以下はすべて架空の広告です</strong><span>広告主・商品・価格は実在しません。実際の広告配信、購入・申込、外部リンク、クリック計測、個人情報の送信は一切ありません。</span></div>';return n;}
function insertAfter(id,ref,node){if(!ref||document.getElementById(id))return false;node.id=id;ref.insertAdjacentElement('afterend',node);return true;}
function insertIntoList(id,list,node){if(!list||document.getElementById(id))return false;const children=Array.from(list.children).filter(el=>!el.classList.contains('tm-ad-unit'));if(children.length<2)return false;node.id=id;list.insertBefore(node,children[Math.min(2,children.length-1)]||null);return true;}
function renderView(view){
 if(!view||!enabled)return;
 const suffix=view.id||'page';
 const header=view.querySelector(':scope > header, .home-v4-hero, .column-library-hero, .howto-guide-hero, .news-chronicle-backbar');
 const firstSection=view.querySelector(':scope > section, .home-v4-section-card, .omikuji-draw-v4-guidance, .result-v4-reading-guide, .column-library-search, .howto-guide-overview');
 if(!document.getElementById('tenmei-ad-notice-'+suffix)){const n=notice();n.id='tenmei-ad-notice-'+suffix;if(header)header.insertAdjacentElement('afterend',n);else view.insertBefore(n,view.firstChild);}
 if(header)insertAfter('tenmei-ad-banner-'+suffix,header,banner(pick()));
 const list=view.querySelector('.home-v4-article-list,.news-bulletin-list,.column-library-list,#home-news-list,#view-news-list,#view-column-list');
 if(list)insertIntoList('tenmei-ad-feed-'+suffix,list,infeed(pick(1)));
 const article=view.querySelector('#article-detail-content,.news-chronicle-frame,.column-library-layout');
 const paragraph=article&&article.querySelector('p');
 if(paragraph)insertAfter('tenmei-ad-article-'+suffix,paragraph,inarticle(pick(2)));
 else if(firstSection)insertAfter('tenmei-ad-rectangle-'+suffix,firstSection,rectangle(pick(3)));
 const sections=Array.from(view.querySelectorAll(':scope > section, .home-v4-section-card, .howto-guide-entry')).filter(el=>!el.classList.contains('tm-ad-unit'));
 if(view.id==='view-home'&&sections.length)insertAfter('tenmei-ad-billboard-'+suffix,sections[0],billboard(pick(6)));
 if(sections.length>=2)insertAfter('tenmei-ad-multiplex-'+suffix,sections[Math.min(1,sections.length-1)],multiplex());
 if(view.querySelector('.column-library-search,.news-bulletin-search,.home-v4-tabs')){const searchAnchor=view.querySelector('.column-library-search,.news-bulletin-search,.home-v4-tabs');insertAfter('tenmei-ad-search-'+suffix,searchAnchor,searchAd(pick(4)));}
 if(sections.length>=3)insertAfter('tenmei-ad-sponsored-story-'+suffix,sections[2],sponsoredStory(pick(5)));
 if(sections.length>=4)insertAfter('tenmei-ad-video-'+suffix,sections[3],videoAd(pick(7)));
 if(sections.length>=5)insertAfter('tenmei-ad-related-'+suffix,sections[4],related());
}
function renderGlobal(){
 if(!enabled||!document.body)return;
 styles();
 const view=document.querySelector('.view-section.active');
 renderView(view);
 if(!document.getElementById('tenmei-ad-side-rail')&&window.innerWidth>1100){const side=halfpage(pick(7));side.id='tenmei-ad-side-rail';side.classList.add('tm-ad-side');document.body.appendChild(side);}
}
function show(){enabled=true;renderGlobal();if(window.__tenmeiAdAnchorMaybeShow)window.__tenmeiAdAnchorMaybeShow();window.dispatchEvent(new CustomEvent('tenmei:mock-ads-shown'));}
function queue(){if(renderQueued)return;renderQueued=true;window.setTimeout(()=>{renderQueued=false;renderGlobal();},120);}
function observe(){
 if(typeof MutationObserver!=='function')return;
 const observer=new MutationObserver(records=>{if(!enabled)return;let relevant=false;for(const r of records){if(r.type==='attributes'&&r.target.classList&&r.target.classList.contains('view-section')){relevant=true;break;}if(r.type==='childList'&&r.target.closest&&r.target.closest('.view-section')){relevant=true;break;}}if(relevant)queue();});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
}
function anchorOnScroll(){
 let shown=false;
 function maybeShow(){if(!enabled||shown||window.scrollY<240)return;shown=true;const c=pick(8),e=base(c,'tm-ad-anchor');e.id='tenmei-ad-anchor';e.appendChild(art(c));const x=document.createElement('div');x.innerHTML='<div class="tm-ad-kicker"><b>広告（架空）</b><span>'+esc(c.tag)+'</span></div><span class="tm-ad-brand">'+esc(c.brand)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.price)+'</p>';e.appendChild(x);e.appendChild(cta(c.cta));const close=document.createElement('button');close.type='button';close.className='tm-ad-close';close.textContent='×';close.setAttribute('aria-label','広告を閉じる');close.addEventListener('click',()=>e.remove());e.appendChild(close);document.body.appendChild(e);}
 window.__tenmeiAdAnchorMaybeShow=maybeShow;
 window.addEventListener('scroll',maybeShow,{passive:true});
}
window.TenmeiMockAds={show,render:renderGlobal,isEnabled:()=>enabled};
observe();anchorOnScroll();
})();