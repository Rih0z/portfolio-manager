/**
 * Settings Management E2E Tests
 */

import { test, expect } from '@playwright/test';
import { SettingsPage } from '../pages/SettingsPage.js';
import { testSettings } from '../fixtures/test-data.js';
import { waitForAppReady } from '../utils/helpers.js';

test.describe('Settings Management', () => {
  let settingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await waitForAppReady(page);
  });

  test.describe('General Settings', () => {
    test('should display and update language settings', async ({ page }) => {
      await settingsPage.switchToTab('general');
      
      // Get current settings
      const currentSettings = await settingsPage.getGeneralSettings();
      expect(currentSettings.language).toBeDefined();
      
      // Update language
      await settingsPage.updateGeneralSettings({ language: 'en' });
      await settingsPage.saveSettings();
      
      // Verify save success
      const isSaved = await settingsPage.isSettingsSaved();
      expect(isSaved).toBe(true);
      
      // Check UI language changed
      const englishText = page.locator('text=/Settings|Portfolio|Dashboard/i');
      await expect(englishText.first()).toBeVisible();
    });

    test('should update theme settings', async ({ page }) => {
      await settingsPage.switchToTab('general');
      
      // Update to dark theme
      await settingsPage.updateGeneralSettings({ theme: 'dark' });
      await settingsPage.saveSettings();
      
      // Verify theme applied
      const body = page.locator('body');
      const classList = await body.getAttribute('class');
      expect(classList).toContain('dark');
      
      await settingsPage.screenshot('settings-dark-theme');
    });

    test('should update default currency', async ({ page }) => {
      await settingsPage.switchToTab('general');
      
      // Change to USD
      await settingsPage.updateGeneralSettings({ currency: 'USD' });
      await settingsPage.saveSettings();
      
      const isSaved = await settingsPage.isSettingsSaved();
      expect(isSaved).toBe(true);
      
      // Verify currency changed
      const newSettings = await settingsPage.getGeneralSettings();
      expect(newSettings.currency).toBe('USD');
    });

    test('should persist settings after page reload', async ({ page }) => {
      await settingsPage.switchToTab('general');
      
      // Update multiple settings
      await settingsPage.updateGeneralSettings({
        language: 'en',
        theme: 'dark',
        currency: 'USD'
      });
      await settingsPage.saveSettings();
      
      // Reload page
      await page.reload();
      await waitForAppReady(page);
      await settingsPage.switchToTab('general');
      
      // Check settings persisted
      const settings = await settingsPage.getGeneralSettings();
      expect(settings.language).toBe('en');
      expect(settings.theme).toBe('dark');
      expect(settings.currency).toBe('USD');
    });
  });

  test.describe('Portfolio Settings', () => {
    test('should add new holding', async ({ page }) => {
      await settingsPage.switchToTab('portfolio');
      
      // Add new holding
      await settingsPage.addHolding({
        ticker: 'MSFT',
        name: 'Microsoft Corporation',
        quantity: 100,
        price: 300
      });
      
      await settingsPage.saveSettings();
      
      // Verify added
      const holdings = await settingsPage.getHoldings();
      const msft = holdings.find(h => h.ticker === 'MSFT');
      expect(msft).toBeDefined();
      expect(msft.name).toBe('Microsoft Corporation');
    });

    test('should edit existing holding', async ({ page }) => {
      await settingsPage.switchToTab('portfolio');
      
      // Get existing holdings
      const holdings = await settingsPage.getHoldings();
      if (holdings.length > 0) {
        // Click on first holding to edit
        const firstHolding = page.locator('[data-testid="holding-item"]').first();
        await firstHolding.click();
        
        // Update quantity
        await page.fill('input[name="quantity"]', '200');
        await settingsPage.saveSettings();
        
        const isSaved = await settingsPage.isSettingsSaved();
        expect(isSaved).toBe(true);
      }
    });

    test('should delete holding', async ({ page }) => {
      await settingsPage.switchToTab('portfolio');
      
      // Get initial count
      const initialHoldings = await settingsPage.getHoldings();
      const initialCount = initialHoldings.length;
      
      if (initialCount > 0) {
        // Delete first holding
        await settingsPage.deleteHolding(initialHoldings[0].ticker);
        
        // Verify count decreased
        const newHoldings = await settingsPage.getHoldings();
        expect(newHoldings.length).toBe(initialCount - 1);
      }
    });

    test('should validate holding input', async ({ page }) => {
      await settingsPage.switchToTab('portfolio');
      
      // Try to add holding with invalid data
      await settingsPage.addHolding({
        ticker: '',
        name: 'Invalid Holding',
        quantity: -100,
        price: 0
      });
      
      // Should show validation errors
      const errorMessages = page.locator('.error-message, [data-error]');
      const errorCount = await errorMessages.count();
      expect(errorCount).toBeGreaterThan(0);
    });
  });

  test.describe('Market Data Settings', () => {
    test('should update data source', async ({ page }) => {
      await settingsPage.switchToTab('marketData');
      
      // Update data source
      await settingsPage.updateMarketDataSettings({
        dataSource: 'alpha-vantage'
      });
      
      await settingsPage.saveSettings();
      
      const isSaved = await settingsPage.isSettingsSaved();
      expect(isSaved).toBe(true);
      
      // Verify updated
      const settings = await settingsPage.getMarketDataSettings();
      expect(settings.dataSource).toBe('alpha-vantage');
    });

    test('should update refresh interval', async ({ page }) => {
      await settingsPage.switchToTab('marketData');
      
      // Set refresh interval to 10 minutes (600 seconds)
      await settingsPage.updateMarketDataSettings({
        refreshInterval: 600
      });
      
      await settingsPage.saveSettings();
      
      // Verify updated
      const settings = await settingsPage.getMarketDataSettings();
      expect(parseInt(settings.refreshInterval)).toBe(600);
    });

    test('should update exchange rate', async ({ page }) => {
      await settingsPage.switchToTab('marketData');
      
      // Update USD/JPY rate
      await settingsPage.updateMarketDataSettings({
        exchangeRate: 145.50
      });
      
      await settingsPage.saveSettings();
      
      // Verify updated
      const settings = await settingsPage.getMarketDataSettings();
      expect(parseFloat(settings.exchangeRate)).toBe(145.50);
    });

    test('should validate market data inputs', async ({ page }) => {
      await settingsPage.switchToTab('marketData');
      
      // Try invalid inputs
      await page.fill('input[name="refreshInterval"]', '-100');
      await page.fill('input[name="exchangeRate"]', 'abc');
      
      await settingsPage.saveSettings();
      
      // Should show validation errors
      const errorMessages = page.locator('.error-message, [data-error]');
      const errorCount = await errorMessages.count();
      expect(errorCount).toBeGreaterThan(0);
    });
  });

  test.describe('AI Settings', () => {
    test('should update AI model selection', async ({ page }) => {
      await settingsPage.switchToTab('ai');
      
      // Select different AI model
      await settingsPage.updateAISettings({
        model: 'gpt-4'
      });
      
      await settingsPage.saveSettings();
      
      const isSaved = await settingsPage.isSettingsSaved();
      expect(isSaved).toBe(true);
      
      // Verify updated
      const settings = await settingsPage.getAISettings();
      expect(settings.model).toBe('gpt-4');
    });

    test('should update prompt template', async ({ page }) => {
      await settingsPage.switchToTab('ai');
      
      const customPrompt = 'カスタムプロンプト: {{portfolio}} を分析してください。';
      
      await settingsPage.updateAISettings({
        promptTemplate: customPrompt
      });
      
      await settingsPage.saveSettings();
      
      // Verify updated
      const settings = await settingsPage.getAISettings();
      expect(settings.promptTemplate).toContain('カスタムプロンプト');
    });

    test('should update max tokens', async ({ page }) => {
      await settingsPage.switchToTab('ai');
      
      await settingsPage.updateAISettings({
        maxTokens: 2000
      });
      
      await settingsPage.saveSettings();
      
      // Verify updated
      const settings = await settingsPage.getAISettings();
      expect(parseInt(settings.maxTokens)).toBe(2000);
    });

    test('should show AI usage statistics', async ({ page }) => {
      await settingsPage.switchToTab('ai');
      
      // Look for usage stats
      const usageStats = page.locator('[data-testid="ai-usage-stats"], .usage-stats');
      if (await usageStats.count() > 0) {
        const statsText = await usageStats.textContent();
        expect(statsText).toBeTruthy();
      }
    });
  });

  test.describe('Settings Actions', () => {
    test('should reset all settings to defaults', async ({ page }) => {
      await settingsPage.switchToTab('general');
      
      // Change some settings
      await settingsPage.updateGeneralSettings({
        theme: 'dark',
        currency: 'USD'
      });
      await settingsPage.saveSettings();
      
      // Reset settings
      await settingsPage.resetSettings();
      
      // Check settings are back to defaults
      const settings = await settingsPage.getGeneralSettings();
      expect(settings.theme).toBe('light');
      expect(settings.currency).toBe('JPY');
    });

    test('should handle settings save errors', async ({ page }) => {
      await settingsPage.switchToTab('general');
      
      // Mock API error
      await page.route('**/api/settings', async (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Save failed' })
          });
        } else {
          await route.continue();
        }
      });
      
      // Try to save
      await settingsPage.updateGeneralSettings({ theme: 'dark' });
      await settingsPage.saveSettings();
      
      // Should show error
      const errorMessage = await settingsPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
    });

    test('should show unsaved changes warning', async ({ page }) => {
      await settingsPage.switchToTab('general');
      
      // Make changes
      await settingsPage.updateGeneralSettings({ theme: 'dark' });
      
      // Try to navigate away
      await page.locator('a:has-text("Dashboard")').click();
      
      // Should show confirmation dialog
      const dialog = page.locator('[role="dialog"], .modal');
      const isDialogVisible = await dialog.isVisible();
      expect(isDialogVisible).toBe(true);
      
      // Cancel navigation
      await page.locator('button:has-text("キャンセル"), button:has-text("Cancel")').click();
      
      // Should still be on settings page
      await expect(page).toHaveURL(/\/settings/);
    });
  });

  test.describe('Mobile Settings', () => {
    test('should be usable on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.reload();
      await waitForAppReady(page);
      
      // Tabs should be scrollable or in dropdown
      const generalTab = page.locator('button:has-text("一般設定"), button:has-text("General")');
      await expect(generalTab).toBeVisible();
      
      // Form fields should be accessible
      await settingsPage.switchToTab('general');
      const currencySelect = page.locator('select[name="currency"]');
      await expect(currencySelect).toBeVisible();
      
      await settingsPage.screenshot('settings-mobile');
    });
  });
});