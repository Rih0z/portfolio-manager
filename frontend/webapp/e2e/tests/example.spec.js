/**
 * Example E2E Test - Quick Start Guide
 * 
 * This is a simple example showing how to write E2E tests
 * for the Portfolio Manager application.
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../utils/helpers.js';

test.describe('Example Tests - Getting Started', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the app to be ready
    await waitForAppReady(page);
  });

  test('should load the application', async ({ page }) => {
    // Check that the app container is visible
    const appContainer = page.locator('[data-testid="app-container"], .App');
    await expect(appContainer).toBeVisible();
    
    // Check for the header
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should display the application title', async ({ page }) => {
    // Look for the app title
    const title = page.locator('h1, [data-testid="app-title"]').first();
    await expect(title).toBeVisible();
    
    // Check the page title
    await expect(page).toHaveTitle(/Portfolio/i);
  });

  test('should navigate between tabs', async ({ page }) => {
    // Find navigation tabs
    const dashboardTab = page.locator('text=/ダッシュボード|Dashboard/i').first();
    const settingsTab = page.locator('text=/設定|Settings/i').first();
    
    // Click settings tab
    if (await settingsTab.count() > 0) {
      await settingsTab.click();
      await expect(page).toHaveURL(/settings/);
    }
    
    // Go back to dashboard
    if (await dashboardTab.count() > 0) {
      await dashboardTab.click();
      await expect(page).toHaveURL(/\//);
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    const desktopNav = page.locator('nav');
    await expect(desktopNav).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile menu might be hidden behind hamburger
    const mobileMenuButton = page.locator('[aria-label="Menu"], .menu-button');
    if (await mobileMenuButton.count() > 0) {
      await expect(mobileMenuButton).toBeVisible();
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/non-existent-page');
    
    // Should show 404 or redirect to home
    const errorMessage = page.locator('text=/404|見つかりません|Not Found/i');
    const isError = await errorMessage.count() > 0;
    const isHome = page.url().endsWith('/');
    
    expect(isError || isHome).toBe(true);
  });

  test.describe('Visual Tests', () => {
    test('should match visual snapshot', async ({ page }) => {
      // Wait for all content to load
      await page.waitForLoadState('networkidle');
      
      // Take a screenshot for visual comparison
      await expect(page).toHaveScreenshot('homepage.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Check for main navigation
      const nav = page.locator('nav[aria-label], [role="navigation"]');
      await expect(nav).toHaveCount(1);
      
      // Check for main content area
      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();
      
      // Check for proper heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      
      // Check if an element is focused
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate with Enter
      await page.keyboard.press('Enter');
    });
  });
});

/**
 * Tips for writing E2E tests:
 * 
 * 1. Use data-testid attributes for reliable selectors
 * 2. Always wait for elements before interacting
 * 3. Use Page Object Models for complex pages
 * 4. Mock external APIs for consistent tests
 * 5. Take screenshots for debugging
 * 6. Test both happy and error paths
 * 7. Consider accessibility in your tests
 */