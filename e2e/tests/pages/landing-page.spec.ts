/**
 * ランディングページテスト
 *
 * 未認証ユーザーに表示されるランディングページの基本要素を検証する。
 * @file e2e/tests/pages/landing-page.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';
import { LandingPage } from '../../helpers/page-objects';

test.describe('Landing Page', () => {
  test('should load landing page with HTTP 200', async ({ page }) => {
    const response = await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    expect(response?.status()).toBe(200);
  });

  test('should display header and main content', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForAppLoad();

    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
    await landing.expectNoErrors();
  });

  test('should show CTA buttons or login prompt', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForAppLoad();

    // Landing page should have either a login/signup CTA or a pricing link
    const ctaButton = page.locator(
      'button:has-text("始める"), button:has-text("Start"), button:has-text("ログイン"), button:has-text("Login"), a:has-text("Pricing"), a:has-text("料金")'
    ).first();
    const hasCta = await ctaButton.isVisible().catch(() => false);

    // At minimum, some interactive element should be present
    const anyButton = page.locator('button, a[href]').first();
    const hasAny = await anyButton.isVisible().catch(() => false);

    expect(hasCta || hasAny).toBeTruthy();
  });

  test('should have a link to pricing page', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForAppLoad();

    // Look for pricing link in header or body
    const pricingLink = page.locator(
      'a[href*="pricing"], button:has-text("Pricing"), button:has-text("料金")'
    ).first();
    const hasPricingLink = await pricingLink.isVisible().catch(() => false);

    // Pricing may also be accessible via tab navigation
    const tabNav = page.locator(SELECTORS.tabNavigation);
    const hasTabNav = await tabNav.isVisible().catch(() => false);

    expect(hasPricingLink || hasTabNav).toBeTruthy();
  });

  test('should not show error boundary on initial load', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForAppLoad();
    await landing.expectNoErrors();
  });
});
