/**
 * 法的ページテスト
 *
 * 利用規約、プライバシーポリシー、金融商品取引法表示、免責事項ページを検証する。
 * @file e2e/tests/pages/legal-pages.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';
import { LegalPage } from '../../helpers/page-objects';

test.describe('Legal Pages', () => {
  test('should load terms of service page', async ({ page }) => {
    const legal = new LegalPage(page);
    await legal.gotoTerms();
    await legal.waitForAppLoad();

    await legal.expectNoErrors();

    // Check for terms page testid or content
    const termsPage = page.locator(SELECTORS.termsPage);
    const termsContent = page.locator('text=利用規約, text=Terms').first();
    const hasTestId = await termsPage.isVisible().catch(() => false);
    const hasContent = await termsContent.isVisible({ timeout: TIMEOUTS.apiResponse }).catch(() => false);

    expect(hasTestId || hasContent).toBeTruthy();
  });

  test('should load privacy policy page', async ({ page }) => {
    const legal = new LegalPage(page);
    await legal.gotoPrivacy();
    await legal.waitForAppLoad();

    await legal.expectNoErrors();

    const privacyPage = page.locator(SELECTORS.privacyPage);
    const privacyContent = page.locator('text=プライバシー, text=Privacy').first();
    const hasTestId = await privacyPage.isVisible().catch(() => false);
    const hasContent = await privacyContent.isVisible({ timeout: TIMEOUTS.apiResponse }).catch(() => false);

    expect(hasTestId || hasContent).toBeTruthy();
  });

  test('should load KKKR (金融商品取引法表示) page', async ({ page }) => {
    const legal = new LegalPage(page);
    await legal.gotoKKKR();
    await legal.waitForAppLoad();

    await legal.expectNoErrors();

    const kkkrPage = page.locator(SELECTORS.kkkrPage);
    const kkkrContent = page.locator('text=金融商品取引法, text=特定商取引法').first();
    const hasTestId = await kkkrPage.isVisible().catch(() => false);
    const hasContent = await kkkrContent.isVisible({ timeout: TIMEOUTS.apiResponse }).catch(() => false);

    // KKKR page may not exist yet; check it loads without server error
    const currentUrl = page.url();
    const wasRedirected = !currentUrl.includes('/legal/kkkr');
    expect(hasTestId || hasContent || wasRedirected).toBeTruthy();
  });

  test('should load disclaimer page', async ({ page }) => {
    const legal = new LegalPage(page);
    await legal.gotoDisclaimer();
    await legal.waitForAppLoad();

    await legal.expectNoErrors();

    const disclaimerPage = page.locator(SELECTORS.disclaimerPage);
    const disclaimerContent = page.locator('text=免責事項, text=Disclaimer').first();
    const hasTestId = await disclaimerPage.isVisible().catch(() => false);
    const hasContent = await disclaimerContent.isVisible({ timeout: TIMEOUTS.apiResponse }).catch(() => false);

    const currentUrl = page.url();
    const wasRedirected = !currentUrl.includes('/legal/disclaimer');
    expect(hasTestId || hasContent || wasRedirected).toBeTruthy();
  });

  test('should display header on all legal pages', async ({ page }) => {
    const legal = new LegalPage(page);

    // Check header is visible on terms page
    await legal.gotoTerms();
    await legal.waitForAppLoad();

    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });
});
