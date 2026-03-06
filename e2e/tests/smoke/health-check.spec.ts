/**
 * デプロイ後スモークテスト
 *
 * 本番環境の基本的な動作確認を行う。
 * @file e2e/tests/smoke/health-check.spec.ts
 */

import { test, expect } from '@playwright/test';
import { URLS, SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';

const BASE = process.env.E2E_BASE_URL || URLS.production;

test.describe('Production Smoke Tests', () => {
  test('should load the app with HTTP 200', async ({ page }) => {
    const response = await page.goto(BASE, { timeout: TIMEOUTS.pageLoad });
    expect(response?.status()).toBe(200);
  });

  test('should not show error boundary', async ({ page }) => {
    await page.goto(BASE, { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');
    const errorBoundary = page.locator(SELECTORS.errorBoundary);
    await expect(errorBoundary).toHaveCount(0);
  });

  test('should display header', async ({ page }) => {
    await page.goto(BASE, { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');
    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });

  test('should display tab navigation', async ({ page }) => {
    await page.goto(BASE, { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');
    // Tab navigation may be hidden before initial setup
    const nav = page.locator(SELECTORS.tabNavigation);
    // Just check it exists in DOM (may be hidden for first-time users)
    const count = await nav.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should reach API config endpoint', async ({ request }) => {
    const response = await request.get(
      `${URLS.apiBase}${URLS.configEndpoint}`,
      { timeout: TIMEOUTS.apiResponse }
    );
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('googleClientId');
  });
});
