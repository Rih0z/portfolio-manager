const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Comprehensive UI Screenshot Analysis - All Screens', () => {
  
  test.beforeEach(async ({ page }) => {
    // ローカル開発サーバーに接続
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 初期化完了を待機
  });

  // Dashboard Screen Analysis
  test('Dashboard - Complete Screen Analysis', async ({ page }) => {
    await page.screenshot({
      path: 'e2e-screenshots/01-dashboard-full.png',
      fullPage: true
    });

    // Empty state detailed screenshot
    const emptyStateContainer = page.locator('.bg-dark-200.border.border-dark-400.rounded-2xl');
    if (await emptyStateContainer.isVisible()) {
      await emptyStateContainer.screenshot({
        path: 'e2e-screenshots/01-dashboard-empty-state-detail.png'
      });
    }

    // Header component screenshot
    const header = page.locator('header');
    if (await header.isVisible()) {
      await header.screenshot({
        path: 'e2e-screenshots/01-dashboard-header.png'
      });
    }

    console.log('✅ Dashboard screenshots captured');
  });

  // AI Strategy Screen Analysis  
  test('AI Strategy - Complete Screen Analysis', async ({ page }) => {
    // Navigate to AI Strategy tab
    const aiTab = page.locator('text=AI戦略');
    if (await aiTab.isVisible()) {
      await aiTab.click();
      await page.waitForTimeout(1500);
    } else {
      console.log('AI Strategy tab not found, trying alternative selectors');
      await page.goto('http://localhost:3000/ai-advisor');
      await page.waitForLoadState('networkidle');
    }
    
    // Full page screenshot
    await page.screenshot({
      path: 'e2e-screenshots/02-ai-strategy-full.png',
      fullPage: true
    });

    // Wizard container detailed screenshot
    const wizardContainer = page.locator('.space-y-4').first();
    if (await wizardContainer.isVisible()) {
      await wizardContainer.screenshot({
        path: 'e2e-screenshots/02-ai-strategy-wizard-detail.png'
      });
    }

    // Step indicator screenshot
    const stepIndicator = page.locator('.flex.items-center.justify-between').first();
    if (await stepIndicator.isVisible()) {
      await stepIndicator.screenshot({
        path: 'e2e-screenshots/02-ai-strategy-steps.png'
      });
    }

    // Form elements screenshot
    const formContainer = page.locator('form, .bg-dark-200').first();
    if (await formContainer.isVisible()) {
      await formContainer.screenshot({
        path: 'e2e-screenshots/02-ai-strategy-form.png'
      });
    }

    console.log('✅ AI Strategy screenshots captured');
  });

  // Settings Screen Analysis
  test('Settings - Complete Screen Analysis', async ({ page }) => {
    // Navigate to Settings
    const settingsTab = page.locator('text=設定');
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await page.waitForTimeout(1500);
    } else {
      await page.goto('http://localhost:3000/settings');
      await page.waitForLoadState('networkidle');
    }
    
    // Full page screenshot
    await page.screenshot({
      path: 'e2e-screenshots/03-settings-full.png',
      fullPage: true
    });

    // Settings components detailed screenshots
    const settingsContainer = page.locator('main').first();
    if (await settingsContainer.isVisible()) {
      await settingsContainer.screenshot({
        path: 'e2e-screenshots/03-settings-content-detail.png'
      });
    }

    console.log('✅ Settings screenshots captured');
  });

  // Data Import Screen Analysis
  test('Data Import - Complete Screen Analysis', async ({ page }) => {
    // Navigate to Data Import  
    const dataImportTab = page.locator('text=データ取込');
    if (await dataImportTab.isVisible()) {
      await dataImportTab.click();
      await page.waitForTimeout(1500);
    } else {
      await page.goto('http://localhost:3000/data');
      await page.waitForLoadState('networkidle');
    }
    
    // Full page screenshot
    await page.screenshot({
      path: 'e2e-screenshots/04-data-import-full.png',
      fullPage: true
    });

    // Tab navigation screenshot
    const tabsContainer = page.locator('.flex.space-x-1, .flex.border-b').first();
    if (await tabsContainer.isVisible()) {
      await tabsContainer.screenshot({
        path: 'e2e-screenshots/04-data-import-tabs-detail.png'
      });
    }

    // Content area screenshot
    const contentArea = page.locator('.tab-content, .mt-4').first();
    if (await contentArea.isVisible()) {
      await contentArea.screenshot({
        path: 'e2e-screenshots/04-data-import-content.png'
      });
    }

    console.log('✅ Data Import screenshots captured');
  });

  // Tab Navigation Analysis
  test('Tab Navigation - Complete Analysis', async ({ page }) => {
    // Bottom tab navigation screenshot
    const bottomNav = page.locator('nav[role="tablist"], .fixed.bottom-0').first();
    if (await bottomNav.isVisible()) {
      await bottomNav.screenshot({
        path: 'e2e-screenshots/05-tab-navigation-bottom.png'
      });
    }

    // Individual tab states
    const tabs = await page.locator('[role="tab"], .tab-item').all();
    for (let i = 0; i < Math.min(tabs.length, 4); i++) {
      const tab = tabs[i];
      if (await tab.isVisible()) {
        await tab.screenshot({
          path: `e2e-screenshots/05-tab-${i + 1}-individual.png`
        });
      }
    }

    console.log('✅ Tab Navigation screenshots captured');
  });

  // Mobile Responsiveness Analysis
  test('Mobile Responsiveness - All Screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X size
    
    // Dashboard mobile
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'e2e-screenshots/mobile-01-dashboard.png',
      fullPage: true
    });

    // AI Strategy mobile
    await page.goto('http://localhost:3000/ai-advisor');
    await page.waitForLoadState('networkidle');  
    await page.screenshot({
      path: 'e2e-screenshots/mobile-02-ai-strategy.png',
      fullPage: true
    });

    // Settings mobile
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'e2e-screenshots/mobile-03-settings.png',
      fullPage: true
    });

    // Data Import mobile
    await page.goto('http://localhost:3000/data');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'e2e-screenshots/mobile-04-data-import.png',
      fullPage: true
    });

    console.log('✅ Mobile screenshots captured');
  });

  // Component-Level Analysis
  test('Component Deep Dive Analysis', async ({ page }) => {
    // Return to desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Button components analysis
    const buttons = await page.locator('button').all();
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const button = buttons[i];
      if (await button.isVisible()) {
        await button.screenshot({
          path: `e2e-screenshots/component-button-${i + 1}.png`
        });
      }
    }

    // Card components analysis
    const cards = await page.locator('.bg-dark-200, .rounded-2xl, [class*="card"]').all();
    for (let i = 0; i < Math.min(cards.length, 3); i++) {
      const card = cards[i];
      if (await card.isVisible()) {
        await card.screenshot({
          path: `e2e-screenshots/component-card-${i + 1}.png`
        });
      }
    }

    console.log('✅ Component screenshots captured');
  });

  // Dark Theme Analysis
  test('Dark Theme Consistency Analysis', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Check if dark theme is applied
    const body = await page.locator('body');
    const bodyClass = await body.getAttribute('class');
    
    // Capture color scheme analysis
    await page.screenshot({
      path: 'e2e-screenshots/theme-analysis-full.png',
      fullPage: true
    });

    // Specific dark theme elements
    const darkElements = await page.locator('.bg-dark-100, .bg-dark-200, .bg-dark-300').all();
    for (let i = 0; i < Math.min(darkElements.length, 3); i++) {
      const element = darkElements[i];
      if (await element.isVisible()) {
        await element.screenshot({
          path: `e2e-screenshots/theme-dark-element-${i + 1}.png`
        });
      }
    }

    console.log('✅ Dark theme analysis completed');
  });
});