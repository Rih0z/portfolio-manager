/**
 * アプリ起動フローテスト
 * @file e2e/tests/critical-flows/app-load.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';

test.describe('App Load Flow', () => {
  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known non-critical errors
        if (
          text.includes('favicon') ||
          text.includes('manifest') ||
          text.includes('net::ERR')
        ) return;
        errors.push(text);
      }
    });

    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('networkidle');

    // Filter out expected API errors for unauthenticated users
    const criticalErrors = errors.filter(
      (e) => !e.includes('401') && !e.includes('403') && !e.includes('Failed to fetch')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should show header after load', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');

    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });

  test('should render main content area', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');

    // Either dashboard content or empty state should be present
    const mainContent = page.locator('main, [class*="min-h-screen"], [class*="container"]');
    await expect(mainContent.first()).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });
});
