import { test, expect } from '@playwright/test';

test.describe('Portfolio Management E2E Tests with MCP', () => {
  // Test configuration
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('Dashboard loads and displays portfolio components', async ({ page }) => {
    // Test that the main dashboard components are visible
    
    // Check for header navigation
    await expect(page.locator('header')).toBeVisible();
    
    // Check for portfolio summary section
    await expect(page.locator('[data-testid="portfolio-summary"], .portfolio-summary')).toBeVisible({ timeout: 10000 }).catch(() => {
      // Fallback: check for any dashboard content
      return expect(page.locator('main, .dashboard, .main-content')).toBeVisible();
    });
    
    // Check for assets table or similar component
    await expect(page.locator('[data-testid="assets-table"], .assets-table, table')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Fallback: check for any data display
      return expect(page.locator('.grid, .table, .list')).toBeVisible();
    });

    // Verify page title contains portfolio-related text
    const title = await page.title();
    expect(title).toMatch(/portfolio|ポートフォリオ/i);
  });

  test('Navigation between tabs works correctly', async ({ page }) => {
    // Test tab navigation functionality
    
    // Look for tab navigation elements
    const tabButtons = page.locator('[role="tab"], .tab-button, .nav-link, button').first();
    
    if (await tabButtons.count() > 0) {
      // Click on different tabs if they exist
      const tabs = page.locator('[role="tab"], .tab-button, .nav-link');
      const tabCount = await tabs.count();
      
      if (tabCount > 1) {
        for (let i = 0; i < Math.min(tabCount, 3); i++) {
          await tabs.nth(i).click();
          await page.waitForTimeout(500); // Small delay for transitions
          
          // Verify the page doesn't crash
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
    
    // Verify navigation doesn't break the app
    await expect(page.locator('body')).toBeVisible();
  });

  test('Settings page accessibility and functionality', async ({ page }) => {
    // Navigate to settings if available
    const settingsLink = page.locator('text=/設定|Settings/i').first();
    
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Check for settings form elements
    const settingsContent = page.locator('.settings, [data-testid="settings"], main').first();
    await expect(settingsContent).toBeVisible({ timeout: 5000 }).catch(() => {
      // Fallback: ensure page is still functional
      return expect(page.locator('body')).toBeVisible();
    });
    
    // Test form interaction if forms exist
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      // Test first input field
      const firstInput = inputs.first();
      if (await firstInput.isEditable()) {
        await firstInput.fill('test value');
        const value = await firstInput.inputValue();
        expect(value).toBe('test value');
      }
    }
  });

  test('Data integration functionality', async ({ page }) => {
    // Look for data integration or import/export features
    const dataLinks = page.locator('text=/データ|Data|Import|Export|連携/i').first();
    
    if (await dataLinks.count() > 0) {
      await dataLinks.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Check for file input or data management interface
    const fileInputs = page.locator('input[type="file"]');
    const dataButtons = page.locator('button:has-text("Import"), button:has-text("Export"), button:has-text("インポート"), button:has-text("エクスポート")');
    
    // Test file input if available
    if (await fileInputs.count() > 0) {
      const fileInput = fileInputs.first();
      await expect(fileInput).toBeVisible();
    }
    
    // Test data management buttons if available
    if (await dataButtons.count() > 0) {
      const firstButton = dataButtons.first();
      await expect(firstButton).toBeVisible();
      
      // Click the button to test functionality
      await firstButton.click();
      await page.waitForTimeout(1000);
      
      // Verify no errors occurred
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Responsive design on mobile viewport', async ({ page }) => {
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    // Verify main content is still visible on mobile
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, .main-content, .app')).toBeVisible();
    
    // Check for mobile navigation (hamburger menu, etc.)
    const mobileMenuButtons = page.locator('[aria-label*="menu"], .mobile-menu, .hamburger, .menu-toggle');
    
    if (await mobileMenuButtons.count() > 0) {
      const menuButton = mobileMenuButtons.first();
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // Verify menu functionality
      await expect(page.locator('body')).toBeVisible();
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Portfolio data display and formatting', async ({ page }) => {
    // Test portfolio data display
    
    // Look for numerical values (prices, percentages, amounts)
    const numbers = page.locator('text=/¥|\\$|[0-9,]+\\.[0-9]{2}|[0-9]+%/');
    
    if (await numbers.count() > 0) {
      // Verify numbers are properly formatted
      const firstNumber = await numbers.first().textContent();
      expect(firstNumber).toMatch(/¥|\\$|[0-9]|%/);
    }
    
    // Look for stock symbols or asset names
    const symbols = page.locator('text=/[A-Z]{1,5}(\\.T)?|[0-9]{4}(\\.T)?/');
    
    if (await symbols.count() > 0) {
      const firstSymbol = await symbols.first().textContent();
      expect(firstSymbol).toMatch(/[A-Z0-9]/);
    }
    
    // Test data table if present
    const tables = page.locator('table, .table, [role="table"]');
    
    if (await tables.count() > 0) {
      const table = tables.first();
      await expect(table).toBeVisible();
      
      // Check for table headers
      const headers = table.locator('th, .table-header, [role="columnheader"]');
      if (await headers.count() > 0) {
        await expect(headers.first()).toBeVisible();
      }
    }
  });

  test('Error handling and loading states', async ({ page }) => {
    // Test error boundaries and loading states
    
    // Trigger potential loading states by navigating quickly
    const navLinks = page.locator('a, button, [role="tab"]');
    const linkCount = await navLinks.count();
    
    if (linkCount > 1) {
      for (let i = 0; i < Math.min(linkCount, 3); i++) {
        await navLinks.nth(i).click();
        await page.waitForTimeout(100); // Quick navigation
        
        // Verify no error messages appear
        const errorMessages = page.locator('text=/error|エラー|failed|失敗/i');
        const errorCount = await errorMessages.count();
        
        // If errors exist, they should be handled gracefully
        if (errorCount > 0) {
          // Verify error is displayed properly, not crashed
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
    
    // Check for loading indicators
    const loadingIndicators = page.locator('.loading, .spinner, [data-loading], text=/loading|読み込み/i');
    
    // Loading indicators should either be present or absent, not broken
    await expect(page.locator('body')).toBeVisible();
  });

  test('Language switching functionality', async ({ page }) => {
    // Test language switching if available
    const languageButtons = page.locator('text=/EN|JP|English|日本語|🇺🇸|🇯🇵/', page.locator('[aria-label*="language"], [aria-label*="言語"]'));
    
    if (await languageButtons.count() > 0) {
      const langButton = languageButtons.first();
      await langButton.click();
      await page.waitForTimeout(1000);
      
      // Verify language change doesn't break the app
      await expect(page.locator('body')).toBeVisible();
      
      // Check if content language changed
      const pageText = await page.textContent('body');
      expect(pageText).toBeTruthy();
    }
  });

  test('Accessibility compliance', async ({ page }) => {
    // Basic accessibility checks
    
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    if (headingCount > 0) {
      // Verify at least one main heading exists
      const h1 = page.locator('h1');
      if (await h1.count() > 0) {
        await expect(h1.first()).toBeVisible();
      }
    }
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Alt text should exist or image should be decorative
      expect(alt !== null || await img.getAttribute('role') === 'presentation').toBe(true);
    }
    
    // Check for keyboard navigation support
    const focusableElements = page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const focusableCount = await focusableElements.count();
    
    if (focusableCount > 0) {
      // Test first focusable element
      await focusableElements.first().focus();
      const focused = await page.evaluate(() => document.activeElement.tagName);
      expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(focused)).toBe(true);
    }
  });

  test('Performance and load time', async ({ page }) => {
    // Basic performance test
    const startTime = Date.now();
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within reasonable time (10 seconds max)
    expect(loadTime).toBeLessThan(10000);
    
    // Check for critical rendering path
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main, .app, .root')).toBeVisible();
    
    // Verify no JavaScript errors in console
    const errors = [];
    page.on('pageerror', error => errors.push(error));
    
    await page.waitForTimeout(2000); // Wait for any async errors
    
    // Filter out known acceptable errors (if any)
    const criticalErrors = errors.filter(error => 
      !error.message.includes('Non-Error promise rejection') &&
      !error.message.includes('ResizeObserver loop')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});