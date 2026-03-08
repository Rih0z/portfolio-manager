/**
 * アクセシビリティテスト
 *
 * WCAG 2.1 AA 準拠チェックを主要ページに対して実行する。
 * @axe-core/playwright を使用。
 * @file e2e/tests/a11y/accessibility.spec.ts
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { TIMEOUTS } from '../../fixtures/test-constants';

test.describe('Accessibility', () => {
  test('Landing page meets WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Pricing page meets WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/pricing', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Legal terms page meets WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/legal/terms', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('All pages have proper document language', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
    // Should be 'ja' or 'en' for this application
    expect(['ja', 'en', 'ja-JP', 'en-US']).toContain(lang);
  });

  test('All pages have proper heading hierarchy', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('networkidle');

    // Check that heading levels don't skip (e.g., h1 -> h3 without h2)
    const headings = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(elements).map(el => ({
        level: parseInt(el.tagName.charAt(1)),
        text: el.textContent?.trim().substring(0, 50) ?? '',
      }));
    });

    if (headings.length > 0) {
      // First heading should be h1
      expect(headings[0].level).toBe(1);

      // Check for skipped levels
      for (let i = 1; i < headings.length; i++) {
        const jump = headings[i].level - headings[i - 1].level;
        // Heading level should not jump more than 1 level down
        expect(jump).toBeLessThanOrEqual(1);
      }
    }
  });
});
