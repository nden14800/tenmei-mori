const { chromium } = require('playwright');
const fs = require('node:fs');

const SITE = 'https://tenmei-mori.pages.dev/';
const API = 'https://tenmei-mori-backend.nden14800.workers.dev';
const OUT = 'status/health.json';

async function main() {
  const browserErrors = [];
  const consoleErrors = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const location = message.location();
    if (!location.url || location.url.startsWith(SITE)) consoleErrors.push(message.text());
  });

  let browserOk = false;
  let browserReason = '';
  try {
    const response = await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response || !response.ok()) throw new Error(`公開サイトHTTP ${response ? response.status() : '応答なし'}`);
    await page.locator('#view-home').waitFor({ state: 'attached', timeout: 10000 });
    const contract = await page.evaluate(() => ({
      home: !!document.querySelector('#view-home'),
      omikujiButton: !!document.querySelector('[onclick="startOmikuji()"]'),
      startOmikuji: typeof window.startOmikuji === 'function',
      welcomeDate: !!document.querySelector('#welcome-date'),
      worshipperCounter: !!document.querySelector('#worshipper-counter'),
      liveCounter: !!document.querySelector('#live-counter'),
      homeNewsList: !!document.querySelector('#home-news-list'),
      homeColumnList: !!document.querySelector('#home-column-list')
    }));
    const missing = Object.entries(contract).filter(([, value]) => !value).map(([key]) => key);
    if (browserErrors.length) throw new Error(`JavaScript実行時エラー: ${browserErrors[0]}`);
    if (consoleErrors.length) throw new Error(`公開サイト内console.error: ${consoleErrors[0]}`);
    if (missing.length) throw new Error(`主要画面の必須要素不足: ${missing.join(', ')}`);

    // 重要なユーザー経路を実際に1回実行する。存在確認だけでは「ボタンはあるが死んでいる」を検出できない。
    await page.locator('[onclick="startOmikuji()"]').first().click({ timeout: 10000 });
    await page.waitForTimeout(1500);
    const interaction = await page.evaluate(() => ({
      drawView: !!document.querySelector('#view-draw'),
      resultView: !!document.querySelector('#view-result'),
      activeView: [...document.querySelectorAll('.view-section')].find(el => {
        const style = getComputedStyle(el);
        return style.display !== 'none' && !el.classList.contains('hidden');
      })?.id || ''
    }));
    if (!interaction.drawView && !interaction.resultView) {
      throw new Error(`おみくじ開始操作後の画面遷移を確認できません（active: ${interaction.activeView || 'none'}）`);
    }
    if (browserErrors.length) throw new Error(`操作後JavaScript実行時エラー: ${browserErrors[0]}`);
    if (consoleErrors.length) throw new Error(`操作後console.error: ${consoleErrors[0]}`);

    browserOk = true;
    browserReason = '実ブラウザで表示、JavaScript実行、主要ホーム画面構造、おみくじ開始操作まで確認しました。';
  } catch (error) {
    browserReason = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }

  let apiOk = false;
  let apiReason = '';
  try {
    const [maintenanceResponse, counterResponse] = await Promise.all([
      fetch(`${API}/api/system/maintenance`, { cache: 'no-store' }),
      fetch(`${API}/api/counter`, { cache: 'no-store' })
    ]);
    if (!maintenanceResponse.ok) throw new Error(`メンテナンスAPI HTTP ${maintenanceResponse.status}`);
    if (!counterResponse.ok) throw new Error(`カウンターAPI HTTP ${counterResponse.status}`);
    const maintenance = await maintenanceResponse.json();
    const counter = await counterResponse.json();
    if (!maintenance || typeof maintenance.active !== 'boolean') throw new Error('メンテナンスAPIのJSON形式が不正です');
    if (!Number.isFinite(Number(counter.count)) || !Number.isFinite(Number(counter.userCount))) {
      throw new Error('カウンターAPIのJSON形式が不正です');
    }
    apiOk = true;
    apiReason = 'メンテナンスAPIとカウンターAPIのHTTP応答・JSON形式を確認しました。';
  } catch (error) {
    apiReason = error instanceof Error ? error.message : String(error);
  }

  const payload = {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    browser: { ok: browserOk, reason: browserReason, errors: browserErrors.slice(0, 3), consoleErrors: consoleErrors.slice(0, 3) },
    api: { ok: apiOk, reason: apiReason }
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  if (!browserOk || !apiOk) process.exitCode = 1;
}
main().catch(error => {
  fs.writeFileSync(OUT, JSON.stringify({
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    browser: { ok: false, reason: `監視処理そのものが失敗しました: ${error.message}` },
    api: { ok: false, reason: '監視処理が完了しませんでした。' }
  }, null, 2) + '\n');
  process.exitCode = 1;
});
