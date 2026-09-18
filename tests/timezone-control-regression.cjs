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
