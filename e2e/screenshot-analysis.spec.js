const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Current UI Analysis for Atlassian Design System Compliance', () => {
  
  // Dashboard画面のスクリーンショット分析
  test('Dashboard page screenshot analysis', async ({ page }) => {
    // ローカル開発サーバーに接続
    await page.goto('http://localhost:3000/');
    
    // ページの読み込み完了を待機
    await page.waitForLoadState('networkidle');
    
    // Dashboard画面のフルスクリーンショット
    await page.screenshot({
      path: 'e2e-screenshots/dashboard-current.png',
      fullPage: true
    });
    
    // Empty state要素のスクリーンショット（データがない場合）
    const emptyState = page.locator('.bg-dark-200.border.border-dark-400');
    if (await emptyState.isVisible()) {
      await emptyState.screenshot({
        path: 'e2e-screenshots/dashboard-empty-state.png'
      });
    }
    
    console.log('Dashboard screenshot captured');
  });

  // AI戦略タブのスクリーンショット分析
  test('AI Strategy tab screenshot analysis', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // AI戦略タブをクリック
    await page.click('text=AI戦略');
    await page.waitForTimeout(1000);
    
    // AI戦略ページのフルスクリーンショット
    await page.screenshot({
      path: 'e2e-screenshots/ai-strategy-current.png',
      fullPage: true
    });
    
    // ウィザードUIの詳細スクリーンショット
    const wizardContainer = page.locator('.space-y-4.sm\\:space-y-6');
    if (await wizardContainer.isVisible()) {
      await wizardContainer.screenshot({
        path: 'e2e-screenshots/ai-wizard-ui.png'
      });
    }
    
    console.log('AI Strategy screenshot captured');
  });

  // Settings タブのスクリーンショット分析
  test('Settings tab screenshot analysis', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Settingsタブをクリック
    await page.click('text=設定');
    await page.waitForTimeout(1000);
    
    // Settings画面のフルスクリーンショット
    await page.screenshot({
      path: 'e2e-screenshots/settings-current.png',
      fullPage: true
    });
    
    console.log('Settings screenshot captured');
  });

  // Data Import タブのスクリーンショット分析
  test('Data Import tab screenshot analysis', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // Data Importタブをクリック
    await page.click('text=データ取込');
    await page.waitForTimeout(1000);
    
    // Data Import画面のフルスクリーンショット
    await page.screenshot({
      path: 'e2e-screenshots/data-import-current.png',
      fullPage: true
    });
    
    // タブUIの詳細スクリーンショット
    const tabsContainer = page.locator('.flex.space-x-1');
    if (await tabsContainer.isVisible()) {
      await tabsContainer.screenshot({
        path: 'e2e-screenshots/data-import-tabs.png'
      });
    }
    
    console.log('Data Import screenshot captured');
  });

  // TabNavigationの詳細スクリーンショット
  test('Tab Navigation analysis', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    
    // タブナビゲーションのスクリーンショット
    const tabNav = page.locator('nav[role="tablist"]');
    if (await tabNav.isVisible()) {
      await tabNav.screenshot({
        path: 'e2e-screenshots/tab-navigation.png'
      });
    }
    
    console.log('Tab Navigation screenshot captured');
  });
});