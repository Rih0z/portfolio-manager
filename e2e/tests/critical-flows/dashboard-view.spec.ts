/**
 * ダッシュボード表示テスト
 * @file e2e/tests/critical-flows/dashboard-view.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';

test.describe('Dashboard View', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('should display dashboard or empty state', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(TIMEOUTS.animation);

    // Either portfolio content OR empty state should be visible
    const hasPortfolio = await page.locator(SELECTORS.portfolioScoreCard).isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=設定, text=Settings, text=ポートフォリオ').first().isVisible().catch(() => false);

    expect(hasPortfolio || hasEmptyState).toBeTruthy();
  });

  test('should show tab navigation for returning users', async ({ page }) => {
    // Set initialSetupCompleted to simulate returning user
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.evaluate(() => {
      localStorage.setItem('initialSetupCompleted', 'true');
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(TIMEOUTS.animation);

    const nav = page.locator(SELECTORS.tabNavigation);
    await expect(nav).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });
});
