/**
 * ナビゲーションテスト
 *
 * ランディングページからの各ページ遷移を検証する。
 * @file e2e/tests/pages/navigation.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';
import { AppPage } from '../../helpers/page-objects';

test.describe('Navigation', () => {
  test('should navigate to pricing page', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto('/pricing');
    await app.waitForAppLoad();

    const pricingContent = page.locator(
      'text=Free, text=Standard, text=無料, text=プラン, text=Pricing'
    ).first();
    const hasPricing = await pricingContent.isVisible({ timeout: TIMEOUTS.apiResponse }).catch(() => false);

    // Page should load without errors regardless of content
    await app.expectNoErrors();
    expect(hasPricing).toBeTruthy();
  });

  test('should navigate to legal terms page', async ({ page }) => {
    const app = new AppPage(page);
    const response = await page.goto('/legal/terms', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    // Should get a valid response (200 or redirect)
    const status = response?.status() ?? 0;
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);
    await app.expectNoErrors();
  });

  test('should navigate to legal privacy page', async ({ page }) => {
    const app = new AppPage(page);
    const response = await page.goto('/legal/privacy', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    const status = response?.status() ?? 0;
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);
    await app.expectNoErrors();
  });

  test('should handle non-existent routes gracefully', async ({ page }) => {
    const app = new AppPage(page);
    const response = await page.goto('/this-page-does-not-exist', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    // SPA should still return 200 and handle routing client-side
    const status = response?.status() ?? 0;
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);
    await app.expectNoErrors();
  });

  test('should maintain header across page navigations', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto('/');
    await app.waitForAppLoad();

    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });

    // Navigate to pricing
    await page.goto('/pricing', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });
});
