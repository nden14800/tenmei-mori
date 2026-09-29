const fs = require('node:fs');

const HEALTH = 'status/health.json';
const HISTORY = 'status/health-history.json';
const retentionMs = 90 * 24 * 60 * 60 * 1000;

const health = JSON.parse(fs.readFileSync(HEALTH, 'utf8'));
let history = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));

if (!Array.isArray(history.samples)) history.samples = [];
if (!Array.isArray(history.incidents)) history.incidents = [];

const checkedAt = new Date(health.checkedAt);
const at = checkedAt.toISOString();
const browserOk = health.browser?.ok === true;
const apiOk = health.api?.ok === true;
const overall = browserOk && apiOk ? 'operational' : (!browserOk && !apiOk ? 'outage' : 'degraded');

history.samples.push({ at, browserOk, apiOk, overall });

const open = history.incidents.find(item => item.status === 'open');
if (overall === 'operational') {
  if (open) {
    open.status = 'resolved';
    open.end = at;
    open.durationMinutes = Math.max(0, Math.round((Date.parse(open.end) - Date.parse(open.start)) / 60000));
  }
} else if (!open) {
  history.incidents.unshift({
    id: `incident-${at.replace(/[:.]/g, '-')}`,
    start: at,
    end: null,
    status: 'open',
    severity: overall,
    title: overall === 'outage' ? '複数の監視対象で障害を検知' : '一部サービスの異常を検知',
    detail: [
      !browserOk ? (health.browser?.reason || '実ブラウザ監視が失敗しました。') : null,
      !apiOk ? (health.api?.reason || '基礎API監視が失敗しました。') : null
    ].filter(Boolean).join(' ')
  });
}

const cutoff = Date.now() - retentionMs;
history.samples = history.samples.filter(item => Date.parse(item.at) >= cutoff);
history.incidents = history.incidents.filter(item => Date.parse(item.start) >= cutoff);

fs.writeFileSync(HISTORY, JSON.stringify(history, null, 2) + '\\n');
