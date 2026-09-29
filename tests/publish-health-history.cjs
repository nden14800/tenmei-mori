const fs=require('node:fs');
const HEALTH='status/health.json',HISTORY='status/health-history.json';
const retentionMs=90*24*60*60*1000;
const health=JSON.parse(fs.readFileSync(HEALTH,'utf8'));
let history=JSON.parse(fs.readFileSync(HISTORY,'utf8'));
if(!Array.isArray(history.samples))history.samples=[];
if(!Array.isArray(history.incidents))history.incidents=[];
const at=new Date(health.checkedAt).toISOString();
const overall=health.overall?.state||'unknown';
history.samples.push({at,overall,components:health.components||{}});
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
fs.writeFileSync(HISTORY,JSON.stringify(history,null,2)+'\n');