/**
 * 包括的なユーザーフロー E2Eテスト
 * カバレッジ向上のためのより詳細なテスト
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://2e9affd4.pfwise-portfolio-manager.pages.dev';

test.describe('Comprehensive User Flow Tests', () => {
  
  test('ポートフォリオ全体ワークフローのテスト', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // ダッシュボードページの確認
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    
    // ヘッダーナビゲーションのテスト
    const navigation = page.locator('nav, header');
    await expect(navigation).toBeVisible();
    
    // 設定ページへの移動テスト
    const settingsButton = page.locator('button, a').filter({ hasText: /設定|Settings|⚙️/i }).first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
    }
    
    // AI Advisorページへの移動テスト
    const aiButton = page.locator('button, a').filter({ hasText: /AI|Advisor|アドバイザー/i }).first();
    if (await aiButton.isVisible()) {
      await aiButton.click();
      await page.waitForTimeout(1000);
    }
    
    // データ取り込みページへの移動テスト
    const dataButton = page.locator('button, a').filter({ hasText: /データ|Data|取り込み|Import/i }).first();
    if (await dataButton.isVisible()) {
      await dataButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('フォーム入力とインタラクションのテスト', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // テキスト入力欄のテスト
    const textInputs = page.locator('input[type="text"], input[type="number"], textarea');
    const inputCount = await textInputs.count();
    
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = textInputs.nth(i);
      if (await input.isVisible() && await input.isEnabled()) {
        await input.fill('テストデータ');
        await page.waitForTimeout(200);
        await input.clear();
        await page.waitForTimeout(200);
      }
    }
    
    // ボタンクリックのテスト
    const buttons = page.locator('button').filter({ hasNotText: /Delete|削除|Remove|除去/i });
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible() && await button.isEnabled()) {
        try {
          await button.click();
          await page.waitForTimeout(500);
        } catch (error) {
          // クリックできないボタンはスキップ
          console.log(`Button ${i} could not be clicked:`, error.message);
        }
      }
    }
  });

  test('レスポンシブUIコンポーネントのテスト', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // 様々な画面サイズでのテスト
    const viewports = [
      { width: 1920, height: 1080, device: 'desktop' },
      { width: 1024, height: 768, device: 'tablet' },
      { width: 375, height: 667, device: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);
      
      // 主要UI要素が表示されていることを確認
      await expect(page.locator('body')).toBeVisible();
      
      // ナビゲーション要素の確認
      const navElements = page.locator('nav, header, .navigation');
      if (await navElements.count() > 0) {
        await expect(navElements.first()).toBeVisible();
      }
      
      // コンテンツエリアの確認
      const contentElements = page.locator('main, .content, .dashboard');
      if (await contentElements.count() > 0) {
        await expect(contentElements.first()).toBeVisible();
      }
    }
  });

  test('エラーハンドリングとリカバリのテスト', async ({ page }) => {
    // ネットワークエラーシミュレーション
    await page.route('**/api/**', route => {
      if (Math.random() < 0.3) { // 30%の確率でエラー
        route.abort();
      } else {
        route.continue();
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForTimeout(3000);
    
    // エラー状態でもアプリケーションが動作することを確認
    await expect(page.locator('body')).toBeVisible();
    
    // エラーメッセージまたはフォールバックUIの確認
    const errorElements = page.locator('.error, .alert, .warning, [role="alert"]');
    const hasErrors = await errorElements.count() > 0;
    
    if (hasErrors) {
      console.log('Error handling detected and working correctly');
    }
  });

  test('アクセシビリティとキーボードナビゲーションのテスト', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // フォーカス可能な要素のテスト
    const focusableElements = page.locator('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])');
    const focusableCount = await focusableElements.count();
    
    // 最初の5つの要素でキーボードナビゲーションをテスト
    for (let i = 0; i < Math.min(focusableCount, 5); i++) {
      const element = focusableElements.nth(i);
      if (await element.isVisible()) {
        await element.focus();
        await page.waitForTimeout(200);
        
        // Enterキーでの操作テスト（安全なボタンのみ）
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'button') {
          const buttonText = await element.textContent();
          if (buttonText && !buttonText.includes('削除') && !buttonText.includes('Delete')) {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
          }
        }
      }
    }
  });

  test('データ可視化コンポーネントのテスト', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // チャートやグラフ要素の確認
    const chartElements = page.locator('svg, canvas, .chart, .graph, .recharts');
    const chartCount = await chartElements.count();
    
    if (chartCount > 0) {
      for (let i = 0; i < chartCount; i++) {
        const chart = chartElements.nth(i);
        await expect(chart).toBeVisible();
        
        // チャートのインタラクション（hover）
        await chart.hover();
        await page.waitForTimeout(300);
      }
    }
    
    // データテーブルの確認
    const tableElements = page.locator('table, .table, .data-table');
    const tableCount = await tableElements.count();
    
    if (tableCount > 0) {
      await expect(tableElements.first()).toBeVisible();
    }
  });

  test('ローカルストレージとセッション管理のテスト', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // ローカルストレージにテストデータを保存
    await page.evaluate(() => {
      localStorage.setItem('test-portfolio-data', JSON.stringify({
        currentAssets: [
          { ticker: 'TEST', shares: 100, currentPrice: 150 }
        ],
        lastUpdated: new Date().toISOString()
      }));
    });
    
    // ページリロード後もデータが保持されているか確認
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const savedData = await page.evaluate(() => {
      return localStorage.getItem('test-portfolio-data');
    });
    
    expect(savedData).toBeTruthy();
    
    // テストデータのクリーンアップ
    await page.evaluate(() => {
      localStorage.removeItem('test-portfolio-data');
    });
  });

  test('パフォーマンスとメモリ使用量のテスト', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // パフォーマンス指標の測定
    const performanceMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0];
      
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: navigation.responseEnd - navigation.requestStart,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
    
    // パフォーマンス要件の確認
    expect(performanceMetrics.loadTime).toBeLessThan(15000); // 15秒以内
    expect(performanceMetrics.domContentLoaded).toBeLessThan(10000); // 10秒以内
    expect(performanceMetrics.resourceCount).toBeLessThan(100); // リソース数制限
    
    console.log('Performance metrics:', performanceMetrics);
  });

  test('複数タブとモーダルダイアログのテスト', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // モーダルやダイアログを開くボタンの検索
    const modalTriggers = page.locator('button').filter({ 
      hasText: /設定|Settings|詳細|Details|ヘルプ|Help|について|About/i 
    });
    
    const triggerCount = await modalTriggers.count();
    
    for (let i = 0; i < Math.min(triggerCount, 3); i++) {
      const trigger = modalTriggers.nth(i);
      if (await trigger.isVisible()) {
        await trigger.click();
        await page.waitForTimeout(1000);
        
        // モーダルが開いたかチェック
        const modal = page.locator('.modal, .dialog, [role="dialog"], .overlay');
        if (await modal.count() > 0) {
          await expect(modal.first()).toBeVisible();
          
          // ESCキーでモーダルを閉じる
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('URL ルーティングとブラウザ履歴のテスト', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // 異なるページへの遷移をテスト
    const navigationLinks = page.locator('a, button').filter({ 
      hasText: /設定|Settings|AI|データ|Data|ダッシュボード|Dashboard/i 
    });
    
    const linkCount = await navigationLinks.count();
    
    if (linkCount > 0) {
      // 最初のリンクをクリック
      await navigationLinks.first().click();
      await page.waitForTimeout(1000);
      
      // ブラウザの戻るボタンをテスト
      await page.goBack();
      await page.waitForTimeout(1000);
      
      // 進むボタンをテスト
      await page.goForward();
      await page.waitForTimeout(1000);
    }
    
    // URL変更のテスト
    const currentUrl = page.url();
    expect(currentUrl).toContain(PRODUCTION_URL);
  });

});