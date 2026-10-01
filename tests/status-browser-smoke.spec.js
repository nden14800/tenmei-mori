const { test, expect } = require('@playwright/test');

const SITE = 'https://tenmei-mori.pages.dev/';
const STATUS = 'https://tenmei-mori-status.pages.dev/';

test.describe.configure({ mode: 'serial' });

test('main site loads without browser JavaScript errors and internal navigation works', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  const response = await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response && response.ok()).toBeTruthy();

  await expect(page.getByText('開発者について', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await page.getByText('開発者について', { exact: true }).first().click();
  await expect(page.locator('#view-developer')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#view-developer')).toContainText('nden148', { timeout: 10000 });

  await page.getByText('当サイトについて', { exact: true }).first().click();
  await expect(page.locator('#view-about')).toBeVisible({ timeout: 10000 });

  await page.getByText('プライバシー', { exact: true }).first().click();
  await expect(page.locator('#view-privacy')).toBeVisible({ timeout: 10000 });

  await page.getByText('使い方', { exact: true }).first().click();
  await expect(page.locator('#view-howto')).toBeVisible({ timeout: 10000 });

  expect(errors, 'ブラウザ実行中にJavaScriptエラーが発生しています').toEqual([]);
});

test('status page loads with same-origin stylesheets', async ({ page }) => {
  const externalStyles = [];
  const response = await page.goto(STATUS, { waitUntil: 'domcontentloaded', timeout: 30000 });
  expect(response && response.ok()).toBeTruthy();

  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
    links.map((link) => link.href)
  );
  for (const href of styles) {
    if (href && !href.startsWith(new URL(STATUS).origin)) externalStyles.push(href);
  }

  expect(externalStyles, 'Status Pageが外部CSSへ依存しています').toEqual([]);
  await expect(page.getByText('運勢・天命乃杜のサービス状況')).toBeVisible({ timeout: 10000 });
});
