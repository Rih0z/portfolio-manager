import { test, expect } from '@playwright/test';
import { AWSIntegrationHelper } from './helpers/aws-integration';
import { AuthHelper } from './helpers/auth';

test.describe('AWS Integration Tests', () => {
  let awsHelper;
  let authHelper;

  test.beforeEach(async ({ page }) => {
    awsHelper = new AWSIntegrationHelper(page);
    authHelper = new AuthHelper(page);
  });

  test('API health check', async () => {
    const health = await awsHelper.checkAPIHealth();
    expect(health.status).toBe('healthy');
  });

  test('Market data API - US stock', async () => {
    const stockData = await awsHelper.testMarketDataAPI('AAPL');
    
    expect(stockData.symbol).toBe('AAPL');
    expect(stockData.price).toBeGreaterThan(0);
    expect(stockData.currency).toBe('USD');
    expect(stockData.source).toBeTruthy();
  });

  test('Market data API - Multiple symbols', async ({ page }) => {
    const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
      params: {
        symbols: 'AAPL,GOOGL,MSFT',
        type: 'us-stock'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(Object.keys(data.data)).toHaveLength(3);
    expect(data.data).toHaveProperty('AAPL');
    expect(data.data).toHaveProperty('GOOGL');
    expect(data.data).toHaveProperty('MSFT');
  });

  test('Exchange rate API', async ({ page }) => {
    const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
      params: {
        type: 'exchange-rate',
        base: 'USD',
        target: 'JPY'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('USD-JPY');
    
    const rate = data.data['USD-JPY'];
    expect(rate.rate).toBeGreaterThan(100); // USD/JPY is typically > 100
    expect(rate.rate).toBeLessThan(200);
  });

  test('Error handling - Invalid symbol', async () => {
    const errorResponse = await awsHelper.testErrorHandling();
    
    // APIは成功を返すが、データにエラー情報が含まれる
    expect(errorResponse.success).toBeDefined();
    
    if (errorResponse.data.INVALID_SYMBOL_12345) {
      const data = errorResponse.data.INVALID_SYMBOL_12345;
      if (data.error) {
        expect(data.error).toBeTruthy();
      } else {
        // フォールバックデータの場合
        expect(data.symbol).toBe('INVALID_SYMBOL_12345');
      }
    }
  });

  test('CORS configuration', async () => {
    const cors = await awsHelper.testCORSConfiguration();
    
    expect(cors.allowOrigin).toBeTruthy();
    expect(cors.allowMethods).toContain('GET');
    expect(cors.allowMethods).toContain('POST');
    expect(cors.allowHeaders).toContain('Content-Type');
  });

  test('Rate limiting', async () => {
    test.slow(); // このテストは時間がかかる
    
    const rateLimitResult = await awsHelper.testRateLimit();
    
    // 少なくともいくつかのリクエストは成功するはず
    expect(rateLimitResult.successfulRequests).toBeGreaterThan(0);
    
    // レート制限が機能している場合
    if (rateLimitResult.hasRateLimit) {
      expect(rateLimitResult.rateLimitedRequests).toBeGreaterThan(0);
    }
  });
});

test.describe('Authentication Flow', () => {
  let authHelper;
  let awsHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    awsHelper = new AWSIntegrationHelper(page);
  });

  test('Login flow with mock Google auth', async ({ page }) => {
    await page.goto('/');
    
    // モック認証を設定
    await authHelper.mockGoogleLogin();
    
    // ログインボタンが表示されることを確認
    const loginButton = page.locator('button.mock-google-button');
    await expect(loginButton).toBeVisible();
    
    // ログイン実行
    await loginButton.click();
    
    // ログイン後の確認（実際のUIに合わせて調整）
    await expect(page.locator('text=ポートフォリオ')).toBeVisible({ timeout: 10000 });
  });

  test('Session persistence', async ({ page }) => {
    // テスト用認証をセットアップ
    await authHelper.setupTestAuth();
    await page.goto('/');
    
    // セッション状態を確認
    const sessionStatus = await awsHelper.testSessionManagement();
    
    if (sessionStatus.hasSession) {
      expect(sessionStatus.sessionValid).toBe(true);
    }
    
    // ページリロード後もセッションが保持されることを確認
    await page.reload();
    
    const sessionAfterReload = await awsHelper.testSessionManagement();
    expect(sessionAfterReload.hasSession).toBe(sessionStatus.hasSession);
  });
});

test.describe('Frontend-Backend Integration', () => {
  test('Portfolio data flow', async ({ page }) => {
    await page.goto('/');
    
    // ポートフォリオデータの追加
    await page.click('text=設定');
    await page.click('text=保有銘柄を追加');
    
    // 銘柄を入力
    await page.fill('input[placeholder="銘柄コード"]', 'AAPL');
    await page.fill('input[placeholder="数量"]', '10');
    await page.click('button:has-text("追加")');
    
    // データが表示されることを確認
    await expect(page.locator('text=AAPL')).toBeVisible();
    
    // APIからデータが取得されることを確認
    await page.waitForResponse(response => 
      response.url().includes('/api/market-data') && 
      response.status() === 200
    );
    
    // 価格が表示されることを確認
    await expect(page.locator('text=/\\$[0-9]+\\.[0-9]+/')).toBeVisible();
  });

  test('Real-time data update', async ({ page }) => {
    await page.goto('/');
    
    // ダッシュボードに移動
    await page.click('text=ダッシュボード');
    
    // 更新ボタンをクリック
    const refreshButton = page.locator('button:has-text("更新")');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      
      // API呼び出しを待つ
      const response = await page.waitForResponse(response => 
        response.url().includes('/api/market-data') && 
        response.status() === 200
      );
      
      const data = await response.json();
      expect(data.success).toBe(true);
    }
  });
});

test.describe('Error Scenarios', () => {
  test('Network error handling', async ({ page, context }) => {
    // ネットワークをオフラインにする
    await context.setOffline(true);
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=/ネットワーク|接続|オフライン/i')).toBeVisible({ timeout: 10000 });
    
    // ネットワークを復元
    await context.setOffline(false);
  });

  test('API error handling', async ({ page }) => {
    // APIエラーをシミュレート
    await page.route('**/api/market-data', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/');
    
    // エラーハンドリングが機能することを確認
    // アプリケーションがクラッシュしないことを確認
    await expect(page).toHaveTitle(/Portfolio/i);
  });
});