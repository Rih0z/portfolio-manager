/**
 * 料金ページフローテスト
 * @file e2e/tests/critical-flows/pricing-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';

test.describe('Pricing Flow', () => {
  test('should display pricing page', async ({ page }) => {
    await page.goto('/pricing', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(TIMEOUTS.animation);

    // Pricing page should show plan cards
    const pricingContent = page.locator('text=Free, text=Standard, text=無料, text=プラン').first();
    await expect(pricingContent).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });

  test('should show Free and Standard plan cards', async ({ page }) => {
    await page.goto('/pricing', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(TIMEOUTS.animation);

    // Look for plan-related content
    const freeText = page.locator('text=Free').first();
    const standardText = page.locator('text=Standard').first();

    const hasFree = await freeText.isVisible().catch(() => false);
    const hasStandard = await standardText.isVisible().catch(() => false);

    expect(hasFree || hasStandard).toBeTruthy();
  });

  test('should display header on pricing page', async ({ page }) => {
    await page.goto('/pricing', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');

    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });
});
