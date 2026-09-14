const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes("AppConfig.toggle('timeZone', next)"));
assert(html.includes('tenmei_timezone_setting'));
assert(html.includes('getTimeZone()'));
assert(html.includes('name="tenmei-build"'));
console.log('timezone regression passed');
