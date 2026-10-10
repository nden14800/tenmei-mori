const fs=require('node:fs');
const HEALTH='status/public/health.json',HISTORY='status/health-history.json',PUBLIC_HISTORY='status/public/health-history.json';
const retentionMs=90*24*60*60*1000;
const health=JSON.parse(fs.readFileSync(HEALTH,'utf8'));
let history;
try {
  history = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));
} catch (error) {
  if (error && error.code === 'ENOENT') {
    console.warn('History file is missing; initializing an empty 90-day history.');
    history = { samples: [], incidents: [] };
  } else {
    throw error;
  }
}
if(!Array.isArray(history.samples))history.samples=[];
if(!Array.isArray(history.incidents))history.incidents=[];
const checkedAtMs = Date.parse(health.checkedAt);
if (!Number.isFinite(checkedAtMs)) throw new Error('health.json has an invalid checkedAt timestamp');
const at = new Date(checkedAtMs).toISOString();
const overall=health.overall?.state||'unknown';
const components=health.components||{};
const latest=history.samples[history.samples.length-1];
const fingerprint=value=>JSON.stringify({overall:value?.overall||'unknown',components:Object.fromEntries(Object.entries(value?.components||{}).map(([key,item])=>[key,item?.state||'unknown']).sort((a,b)=>a[0].localeCompare(b[0])))});
const currentSample={at,overall,components};
// Keep every scheduled observation so the browser-monitor timeline reflects checks,
// not only state transitions. The retention window bounds storage to 90 days.
history.samples = history.samples.filter(sample => sample.at !== at);
history.samples.push(currentSample);
const open=history.incidents.find(x=>x.status==='open');
const incidentState=['degraded','partial','outage','unknown'].includes(overall)?overall:null;
if(!incidentState){
  if(open){open.status='resolved';open.end=at;open.durationMinutes=Math.max(0,Math.round((Date.parse(at)-Date.parse(open.start))/60000));}
}else if(!open){
  const titles={degraded:'Degraded Performanceを検知',partial:'一部サービスの障害を検知',outage:'主要サービスの障害を検知',unknown:'監視状態を確認できません'};
  history.incidents.unshift({
    id:`incident-${at.replace(/[:.]/g,'-')}`,start:at,end:null,status:'open',severity:incidentState,
    title:titles[incidentState],detail:health.overall?.detail||'監視結果から異常を検知しました。'
  });
}
const cutoff=Date.now()-retentionMs;
history.samples=history.samples.filter(x=>Date.parse(x.at)>=cutoff);
history.incidents=history.incidents.filter(x=>Date.parse(x.start)>=cutoff);
const serialized=JSON.stringify(history,null,2)+'\n';
fs.writeFileSync(HISTORY,serialized);
fs.writeFileSync(PUBLIC_HISTORY,serialized);