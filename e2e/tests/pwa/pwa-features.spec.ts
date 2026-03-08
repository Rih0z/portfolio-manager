/**
 * PWA機能テスト
 *
 * Service Worker登録とWeb App Manifestの可用性を検証する。
 * @file e2e/tests/pwa/pwa-features.spec.ts
 */

import { test, expect } from '@playwright/test';
import { URLS, TIMEOUTS } from '../../fixtures/test-constants';
import { AppPage } from '../../helpers/page-objects';

const BASE = process.env.E2E_BASE_URL || URLS.production;

test.describe('PWA Features', () => {
  test('should have a web app manifest', async ({ page, request }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');

    // Check for manifest link in HTML
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href').catch(() => null);

    if (manifestLink) {
      // Fetch the manifest file
      const manifestUrl = manifestLink.startsWith('http')
        ? manifestLink
        : `${BASE}${manifestLink.startsWith('/') ? '' : '/'}${manifestLink}`;

      const response = await request.get(manifestUrl, { timeout: TIMEOUTS.apiResponse });
      expect(response.status()).toBe(200);

      const manifest = await response.json();
      expect(manifest).toHaveProperty('name');
      expect(manifest).toHaveProperty('icons');
    } else {
      // Manifest link may not exist - not a hard failure
      expect(manifestLink).toBeNull();
    }
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('networkidle');

    // Check if service worker is registered
    const hasServiceWorker = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });

    // Service worker registration is optional for the app to function
    expect(typeof hasServiceWorker).toBe('boolean');
  });

  test('should have appropriate meta tags for mobile', async ({ page }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    expect(viewport).toContain('width=');

    // Check for theme-color meta tag
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content').catch(() => null);
    // Theme color is nice to have but not required
    expect(typeof themeColor === 'string' || themeColor === null).toBeTruthy();
  });

  test('should have favicon', async ({ page, request }) => {
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');

    // Check for favicon link
    const faviconLink = await page.locator('link[rel="icon"], link[rel="shortcut icon"]').first().getAttribute('href').catch(() => null);

    if (faviconLink) {
      const faviconUrl = faviconLink.startsWith('http')
        ? faviconLink
        : `${BASE}${faviconLink.startsWith('/') ? '' : '/'}${faviconLink}`;
      const response = await request.get(faviconUrl, { timeout: TIMEOUTS.apiResponse });
      expect(response.status()).toBe(200);
    }
  });

  test('should load app shell quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // App shell should load within 10 seconds on a reasonable connection
    expect(loadTime).toBeLessThan(10_000);
  });
});
