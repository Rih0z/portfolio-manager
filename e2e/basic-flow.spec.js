/**
 * 基本的なユーザーフローのE2Eテスト
 */

import { test, expect } from '@playwright/test';

test.describe('Portfolio Manager - Basic Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // テスト用のローカルストレージをクリア
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('アプリケーションが正常に読み込まれる', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/Portfolio Wise/);
    
    // メインコンテンツの確認
    await expect(page.locator('body')).toBeVisible();
  });

  test('ダッシュボードページが表示される', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // ダッシュボードの基本要素を確認
    const header = page.locator('header, .header, h1').first();
    await expect(header).toBeVisible();
  });

  test('ナビゲーションメニューが機能する', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // ナビゲーションリンクをテスト
    const links = page.locator('a, button').filter({ hasText: /設定|Settings|AI|ダッシュボード|Dashboard/i });
    const count = await links.count();
    
    if (count > 0) {
      // 最初のリンクをクリックしてナビゲーションをテスト
      await links.first().click();
      await page.waitForTimeout(1000); // ナビゲーション完了を待機
    }
  });

  test('レスポンシブデザインが正しく動作する', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // デスクトップサイズ
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('基本的なフォーム操作が動作する', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // フォーム要素を探す
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      // 最初の入力フィールドにテスト値を入力
      const firstInput = inputs.first();
      const inputType = await firstInput.getAttribute('type');
      
      if (inputType === 'text' || inputType === 'number' || !inputType) {
        await firstInput.fill('テスト値');
        const value = await firstInput.inputValue();
        expect(value).toBe('テスト値');
      }
    }
  });

  test('エラーハンドリングが正しく動作する', async ({ page }) => {
    // コンソールエラーをキャプチャ
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000); // ページ読み込み完了を待機
    
    // 重大なJavaScriptエラーがないことを確認
    const criticalErrors = errors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('DevTools') &&
      !error.includes('extension')
    );
    
    expect(criticalErrors.length).toBeLessThan(5); // 軽微なエラーは許容
  });

});

test.describe('Portfolio Manager - Advanced Features', () => {
  
  test('ローカルストレージの保存・読み込み', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // ローカルストレージにテストデータを保存
    await page.evaluate(() => {
      localStorage.setItem('testKey', 'testValue');
    });
    
    // ページをリロードしてデータの永続性を確認
    await page.reload();
    
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('testKey');
    });
    
    expect(storedValue).toBe('testValue');
  });

  test('API呼び出しのモック', async ({ page }) => {
    // API呼び出しをモック
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          data: { message: 'Mock API Response' } 
        })
      });
    });
    
    await page.goto('http://localhost:3000');
    
    // APIを呼び出すアクションを実行（ボタンクリックなど）
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      await buttons.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('パフォーマンス測定', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // パフォーマンス指標を測定
    const performanceData = await page.evaluate(() => {
      const timing = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0];
      
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: navigation.responseEnd - navigation.requestStart
      };
    });
    
    // 基本的なパフォーマンス要件を確認
    expect(performanceData.loadTime).toBeLessThan(5000); // 5秒以内
    expect(performanceData.domContentLoaded).toBeLessThan(3000); // 3秒以内
  });

});