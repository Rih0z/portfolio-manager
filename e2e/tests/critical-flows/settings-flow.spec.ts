/**
 * 設定ページフローテスト
 * @file e2e/tests/critical-flows/settings-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';

test.describe('Settings Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.evaluate(() => {
      localStorage.setItem('initialSetupCompleted', 'true');
    });
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(TIMEOUTS.animation);

    // Settings page should have form elements or settings content
    const settingsContent = page.locator('text=設定, text=Settings, text=通貨, text=Currency').first();
    await expect(settingsContent).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });

  test('should display header on settings page', async ({ page }) => {
    await page.goto('/settings', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');

    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });
});
