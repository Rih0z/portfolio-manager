/**
 * シミュレーションフローテスト
 *
 * /simulation ページの読み込みと基本動作を検証する。
 * @file e2e/tests/pages/simulation-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';
import { AppPage } from '../../helpers/page-objects';

test.describe('Simulation Flow', () => {
  test('should load simulation page or redirect', async ({ page }) => {
    const app = new AppPage(page);
    const response = await page.goto('/simulation', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    const status = response?.status() ?? 0;
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);
    await app.expectNoErrors();
  });

  test('should display header on simulation page', async ({ page }) => {
    const app = new AppPage(page);
    await page.goto('/simulation', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });

  test('should show simulation content or require authentication', async ({ page }) => {
    const app = new AppPage(page);
    await page.goto('/simulation', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    const simulationPage = page.locator(SELECTORS.simulationPage);
    const loginPrompt = page.locator(SELECTORS.loginButton).first();

    const hasSimulation = await simulationPage.isVisible().catch(() => false);
    const hasLogin = await loginPrompt.isVisible().catch(() => false);
    const currentUrl = page.url();
    const wasRedirected = !currentUrl.includes('/simulation');

    expect(hasSimulation || hasLogin || wasRedirected).toBeTruthy();
  });
});
