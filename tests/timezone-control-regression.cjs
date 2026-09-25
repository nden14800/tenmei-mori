const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

assert(html.includes("AppConfig.toggle('timeZone', next)"));
assert(html.includes('tenmei_timezone_setting'));
assert(html.includes('getTimeZone()'));
assert(html.includes('name="tenmei-build"'));

// 「今日」のキーをUTC日付へ直接変換すると、日本時間の深夜帯で日付がずれる。
// おみくじ本体ではタイムゾーン対応の日時処理を使い、UTC ISO文字列をそのまま
// YYYY-MM-DD の日付キーへ変換する実装を再導入しないことを回帰防止する。
const forbiddenUtcDateKeyPatterns = [
  /new\s+Date\(\)\.toISOString\(\)\.slice\(\s*0\s*,\s*10\s*\)/,
  /new\s+Date\(\)\.toISOString\(\)\.split\(\s*['"]T['"]\s*\)\[0\]/,
  /new\s+Date\(\)\.toISOString\(\)\.substring\(\s*0\s*,\s*10\s*\)/,
];
for (const pattern of forbiddenUtcDateKeyPatterns) {
  assert(!pattern.test(html), `UTCのISO日付をそのまま日付キーに使う実装が再導入されています: ${pattern}`);
}

console.log('timezone regression passed');

// おみくじ結果・履歴・PDFの日時表示も、端末のローカル時刻ではなく選択中のタイムゾーンを使う。
assert((html.match(/window\.TenmeiTime\.formatDateTime\(date\)/g) || []).length >= 2);
assert(html.includes('window.TenmeiTime.getDateParts(dateObj)'));
assert(html.includes("hour: '2-digit', minute: '2-digit', hourCycle: 'h23'"));
assert(html.includes('hour: Number(parts.hour), minute: Number(parts.minute)'));
assert(html.includes('[parts.year, parts.month, parts.day, parts.hour, parts.minute].every(Number.isFinite)'));

// setTimeZone() must write the selected value before AppConfig.toggle() persists it.
// Otherwise the stale settings object overwrites the freshly selected timezone.
const setTimeZoneStart = html.indexOf('function setTimeZone(value)');
const setTimeZoneEnd = html.indexOf('\n        function renderTimeZoneOptions()', setTimeZoneStart);
const setTimeZone = html.slice(setTimeZoneStart, setTimeZoneEnd);
assert(setTimeZone.indexOf('settings.timeZone = next;') < setTimeZone.indexOf("AppConfig.toggle('timeZone', next)"));

function getPartsInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  return Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
}

const timestamp = new Date('2026-01-02T00:05:00.000Z');
assert.deepEqual(getPartsInTimeZone(timestamp, 'Asia/Tokyo'), { year: 2026, month: 1, day: 2, hour: 9, minute: 5 });
assert.deepEqual(getPartsInTimeZone(timestamp, 'America/Los_Angeles'), { year: 2026, month: 1, day: 1, hour: 16, minute: 5 });
