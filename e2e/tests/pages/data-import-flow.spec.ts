/**
 * データインポートフローテスト
 *
 * /data-import ページの読み込みと未認証時の動作を検証する。
 * @file e2e/tests/pages/data-import-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';
import { AppPage } from '../../helpers/page-objects';

test.describe('Data Import Flow', () => {
  test('should load data-import page or redirect', async ({ page }) => {
    const app = new AppPage(page);
    const response = await page.goto('/data-import', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    // Page may redirect unauthenticated users to landing or dashboard
    const status = response?.status() ?? 0;
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);
    await app.expectNoErrors();
  });

  test('should show header after navigating to data-import', async ({ page }) => {
    const app = new AppPage(page);
    await page.goto('/data-import', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });

  test('should display login prompt or data-import content', async ({ page }) => {
    const app = new AppPage(page);
    await page.goto('/data-import', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    // Unauthenticated user may see login prompt or be redirected
    const loginPrompt = page.locator(SELECTORS.loginButton).first();
    const dataImportPage = page.locator(SELECTORS.dataImportPage);

    const hasLogin = await loginPrompt.isVisible().catch(() => false);
    const hasDataImport = await dataImportPage.isVisible().catch(() => false);
    const currentUrl = page.url();
    const wasRedirected = !currentUrl.includes('/data-import');

    // One of these conditions should be true
    expect(hasLogin || hasDataImport || wasRedirected).toBeTruthy();
  });
});
