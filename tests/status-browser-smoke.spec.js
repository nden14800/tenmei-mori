const { test, expect } = require('@playwright/test');

const SITE = 'https://tenmei-mori.pages.dev/';
const STATUS = 'https://tenmei-mori-status.pages.dev/';

async function dismissTutorial(page) {
  const overlay = page.locator('#tutorial-overlay.active');
  if (!(await overlay.count())) return;

  const close = overlay.getByRole('button', { name: /スキップ|閉じる|次へ/ }).first();
  if (await close.count()) {
    await close.click({ force: true });
  } else {
    await page.keyboard.press('Escape');
  }

  await expect(overlay).toBeHidden({ timeout: 5000 }).catch(() => {});
}

test.describe.configure({ mode: 'serial' });

test('main site loads without browser JavaScript errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  const response = await page.goto(SITE, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  expect(response && response.ok()).toBeTruthy();
  await expect(page.locator('#nav-developer'))
    .toBeVisible({ timeout: 10000 });

  expect(errors, 'メインサイトのブラウザ実行中にJavaScriptエラーが発生しています').toEqual([]);
});

test('main site internal navigation works, including developer view', async ({ page }) => {
  const response = await page.goto(SITE, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  expect(response && response.ok()).toBeTruthy();

  await page.waitForLoadState('domcontentloaded');
  await dismissTutorial(page);

  const checks = [
    ['開発者について', '#nav-developer', '#view-developer', 'nden148'],
    ['当サイトについて', '#nav-about', '#view-about', null],
    ['プライバシー', '#nav-privacy', '#view-privacy', null],
    ['使い方', '#nav-howto', '#view-howto', null]
  ];

  for (const [label, navSelector, selector, text] of checks) {
    const checkPage = await page.context().newPage();
    try {
      const checkResponse = await checkPage.goto(SITE, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      expect(checkResponse && checkResponse.ok()).toBeTruthy();

      await dismissTutorial(checkPage);

      const nav = checkPage.locator(navSelector);
      await expect(nav, label + 'のナビゲーションが見つかりません')
        .toBeVisible({ timeout: 10000 });

      await nav.click({ force: true });

      const target = checkPage.locator(selector);
      await expect(target, label + 'を押しても対象画面が表示されません')
        .toBeVisible({ timeout: 10000 });

      const box = await target.boundingBox();
      expect(box, label + 'の表示領域がありません').not.toBeNull();

      if (text) {
        await expect(target).toContainText(text, { timeout: 10000 });
      }
    } finally {
      await checkPage.close();
    }
  }
});

test('main site representative navigation controls are wired', async ({ page }) => {
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissTutorial(page);

  const controls = page.locator('[onclick*="showView("]');
  const count = await controls.count();
  expect(count, 'showView() を使う内部ナビゲーションが見つかりません').toBeGreaterThan(0);

  const samples = Math.min(count, 12);
  for (let i = 0; i < samples; i += 1) {
    const control = controls.nth(i);
    if (!(await control.isVisible())) continue;

    const onclick = await control.getAttribute('onclick');
    const match = onclick && onclick.match(/showView\(['"]([^'"]+)['"]\)/);
    if (!match) continue;

    await dismissTutorial(page);
    const target = page.locator('#view-' + match[1]);
    await control.click({ force: true });
    await expect(target, "内部ナビゲーション showView('" + match[1] + "') が対象画面を表示しません")
      .toBeVisible({ timeout: 10000 });
  }
});

test('status page uses local stylesheets and no external stylesheet URLs', async ({ page }) => {
  const response = await page.goto(STATUS, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  expect(response && response.ok()).toBeTruthy();

  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
    links.map((link) => link.href)
  );
  const externalStyles = styles.filter(
    (href) => href && !href.startsWith(new URL(STATUS).origin)
  );

  expect(externalStyles, 'Status Pageが外部CSSへ依存しています').toEqual([]);
  await expect(page.getByText('運勢・天命乃杜のサービス状況')).toBeVisible({ timeout: 10000 });
});
