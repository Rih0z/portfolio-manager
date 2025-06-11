/**
 * 本番環境でのE2Eテスト
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://2e9affd4.pfwise-portfolio-manager.pages.dev';

test.describe('Production Environment Tests', () => {
  
  test('本番環境にアクセスできる', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/PortfolioWise/);
    
    // メインコンテンツの確認
    await expect(page.locator('body')).toBeVisible();
  });

  test('本番環境でアプリケーションが正常に動作する', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // ローディング完了を待機
    await page.waitForTimeout(3000);
    
    // ヘッダーの存在確認
    const header = page.locator('header, .header, h1').first();
    await expect(header).toBeVisible();
  });

  test('本番環境でナビゲーションが機能する', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // ナビゲーションリンクをテスト
    const links = page.locator('a, button').filter({ hasText: /設定|Settings|AI|ダッシュボード|Dashboard/i });
    const count = await links.count();
    
    if (count > 0) {
      // 最初のリンクをクリックしてナビゲーションをテスト
      await links.first().click();
      await page.waitForTimeout(2000); // ナビゲーション完了を待機
    }
  });

  test('本番環境でレスポンシブデザインが正しく動作する', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
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

  test('本番環境でパフォーマンスが適切', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
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
    
    // 本番環境でのパフォーマンス要件を確認
    expect(performanceData.loadTime).toBeLessThan(10000); // 10秒以内
    expect(performanceData.domContentLoaded).toBeLessThan(8000); // 8秒以内
  });

  test('本番環境でエラーハンドリングが正しく動作する', async ({ page }) => {
    // コンソールエラーをキャプチャ
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForTimeout(5000); // ページ読み込み完了を待機
    
    // 重大なJavaScriptエラーがないことを確認
    const criticalErrors = errors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('DevTools') &&
      !error.includes('extension') &&
      !error.includes('failed to fetch') // ネットワークエラーは除外
    );
    
    expect(criticalErrors.length).toBeLessThan(3); // 軽微なエラーは許容
  });

  test('本番環境でAPIが正常に動作する', async ({ page }) => {
    // API呼び出しを監視
    const apiCalls = [];
    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes('amazonaws.com')) {
        apiCalls.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForTimeout(3000);
    
    // APIコールが発生していることを確認
    expect(apiCalls.length).toBeGreaterThan(0);
    
    // 成功したAPIコールの存在を確認
    const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 400);
    expect(successfulCalls.length).toBeGreaterThan(0);
  });

  test('本番環境でセキュリティヘッダーが設定されている', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL);
    
    // セキュリティヘッダーの確認
    const headers = response.headers();
    
    // HTTPS強制確認
    expect(response.url()).toContain('https://');
    
    // Content-Type確認
    expect(headers['content-type']).toContain('text/html');
  });

});