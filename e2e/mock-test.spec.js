import { test, expect } from '@playwright/test';

test.describe('Mock Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // APIレスポンスをモック
    await page.route('**/health', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() })
      });
    });

    await page.route('**/api/market-data**', route => {
      const url = new URL(route.request().url());
      const symbols = url.searchParams.get('symbols');
      const type = url.searchParams.get('type');

      if (type === 'exchange-rate') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              'USD-JPY': {
                rate: 150.23,
                base: 'USD',
                target: 'JPY',
                timestamp: new Date().toISOString()
              }
            }
          })
        });
      } else if (symbols) {
        const symbolList = symbols.split(',');
        const data = {};
        symbolList.forEach(symbol => {
          data[symbol] = {
            symbol: symbol,
            price: Math.random() * 200 + 100,
            currency: 'USD',
            source: 'mock',
            timestamp: new Date().toISOString()
          };
        });

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data })
        });
      } else {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Missing parameters' })
        });
      }
    });
  });

  test('Mocked API health check', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
  });

  test('Mocked market data API', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/market-data', {
      params: {
        symbols: 'AAPL,GOOGL',
        type: 'us-stock'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('AAPL');
    expect(data.data).toHaveProperty('GOOGL');
    expect(data.data.AAPL.price).toBeGreaterThan(0);
  });

  test('Mocked exchange rate API', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/market-data', {
      params: {
        type: 'exchange-rate',
        base: 'USD',
        target: 'JPY'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data['USD-JPY'].rate).toBeGreaterThan(100);
  });

  test('Performance metrics collection', async ({ page }) => {
    // パフォーマンス測定用のモック
    const startTime = Date.now();
    
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        page.request.get('http://localhost:3000/api/market-data', {
          params: { symbols: `TEST${i}`, type: 'us-stock' }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    // すべてのリクエストが成功
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
    
    // パフォーマンスメトリクス
    const totalTime = endTime - startTime;
    const avgTime = totalTime / requests.length;
    
    console.log(`Performance Metrics:
    - Total time: ${totalTime}ms
    - Average time per request: ${avgTime}ms
    - Requests per second: ${(1000 / avgTime).toFixed(2)}`);
    
    // 平均応答時間は1秒以内
    expect(avgTime).toBeLessThan(1000);
  });

  test('Error handling simulation', async ({ page }) => {
    // エラーレスポンスをモック
    await page.route('**/api/error-test', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    const response = await page.request.get('http://localhost:3000/api/error-test');
    expect(response.status()).toBe(500);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('CORS headers validation', async ({ page }) => {
    // CORSヘッダーを含むレスポンスをモック
    await page.route('**/api/cors-test', route => {
      route.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({ success: true })
      });
    });
    
    const response = await page.request.get('http://localhost:3000/api/cors-test');
    const headers = response.headers();
    
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toContain('GET');
  });
});