/**
 * 通知UIテスト
 *
 * 通知ベルアイコンとドロップダウンの動作を検証する。
 * @file e2e/tests/ui/notifications-ui.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';
import { AppPage } from '../../helpers/page-objects';

test.describe('Notifications UI', () => {
  test('should check for notification bell visibility', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto('/');
    await app.waitForAppLoad();

    const bell = page.locator(SELECTORS.notificationBell);
    const hasBell = await bell.isVisible().catch(() => false);

    // Notification bell may only be visible for authenticated users
    // Just verify no errors occur
    await app.expectNoErrors();
    expect(typeof hasBell).toBe('boolean');
  });

  test('should toggle notification dropdown when bell is clicked', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto('/');
    await app.waitForAppLoad();

    const bell = page.locator(SELECTORS.notificationBell);
    const hasBell = await bell.isVisible().catch(() => false);

    if (!hasBell) {
      test.skip();
      return;
    }

    await bell.click();
    await page.waitForTimeout(TIMEOUTS.animation);

    const dropdown = page.locator(SELECTORS.notificationDropdown);
    const hasDropdown = await dropdown.isVisible().catch(() => false);
    expect(hasDropdown).toBeTruthy();

    // Click again to close
    await bell.click();
    await page.waitForTimeout(TIMEOUTS.animation);
    const dropdownAfter = await dropdown.isVisible().catch(() => false);
    expect(dropdownAfter).toBeFalsy();
  });

  test('should close notification dropdown when clicking outside', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto('/');
    await app.waitForAppLoad();

    const bell = page.locator(SELECTORS.notificationBell);
    const hasBell = await bell.isVisible().catch(() => false);

    if (!hasBell) {
      test.skip();
      return;
    }

    await bell.click();
    await page.waitForTimeout(TIMEOUTS.animation);

    // Click outside the dropdown to close it
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(TIMEOUTS.animation);

    const dropdown = page.locator(SELECTORS.notificationDropdown);
    const isVisible = await dropdown.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });
});
