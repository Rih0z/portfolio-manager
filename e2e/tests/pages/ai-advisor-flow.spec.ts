/**
 * AIアドバイザーフローテスト
 *
 * /ai-advisor ページの読み込みと基本動作を検証する。
 * @file e2e/tests/pages/ai-advisor-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-constants';
import { AppPage } from '../../helpers/page-objects';

test.describe('AI Advisor Flow', () => {
  test('should load AI advisor page or redirect', async ({ page }) => {
    const app = new AppPage(page);
    const response = await page.goto('/ai-advisor', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    const status = response?.status() ?? 0;
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);
    await app.expectNoErrors();
  });

  test('should display header on AI advisor page', async ({ page }) => {
    const app = new AppPage(page);
    await page.goto('/ai-advisor', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    const header = page.locator(SELECTORS.appHeader);
    await expect(header).toBeVisible({ timeout: TIMEOUTS.apiResponse });
  });

  test('should show AI advisor content or require authentication', async ({ page }) => {
    const app = new AppPage(page);
    await page.goto('/ai-advisor', { timeout: TIMEOUTS.pageLoad });
    await app.waitForAppLoad();

    const aiAdvisorPage = page.locator(SELECTORS.aiAdvisorPage);
    const loginPrompt = page.locator(SELECTORS.loginButton).first();

    const hasAiAdvisor = await aiAdvisorPage.isVisible().catch(() => false);
    const hasLogin = await loginPrompt.isVisible().catch(() => false);
    const currentUrl = page.url();
    const wasRedirected = !currentUrl.includes('/ai-advisor');

    expect(hasAiAdvisor || hasLogin || wasRedirected).toBeTruthy();
  });

  test('should not expose any API keys in page source', async ({ page }) => {
    await page.goto('/ai-advisor', { timeout: TIMEOUTS.pageLoad });
    await page.waitForLoadState('domcontentloaded');

    const content = await page.content();
    // Ensure no API keys are leaked in the HTML
    expect(content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
    expect(content).not.toMatch(/AIza[a-zA-Z0-9_-]{35}/);
  });
});
