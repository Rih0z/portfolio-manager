import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('Page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    // ページ読み込みは3秒以内
    expect(loadTime).toBeLessThan(3000);
    
    // Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        let cls = 0;
        let lcp = 0;
        let fid = 0;
        
        // Cumulative Layout Shift
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          lcp = entries[entries.length - 1].renderTime || entries[entries.length - 1].loadTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay (シミュレート)
        setTimeout(() => {
          resolve({
            cls: cls,
            lcp: lcp,
            fid: fid || 100 // デフォルト値
          });
        }, 2000);
      });
    });
    
    // Core Web Vitalsの基準値
    expect(metrics.cls).toBeLessThan(0.1); // Good CLS
    expect(metrics.lcp).toBeLessThan(2500); // Good LCP (2.5s)
    expect(metrics.fid).toBeLessThan(100); // Good FID (100ms)
  });

  test('API response time', async ({ page }) => {
    await page.goto('/');
    
    // API呼び出しの応答時間を測定
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/market-data') && 
      response.status() === 200
    );
    
    const startTime = Date.now();
    await page.click('text=更新');
    const response = await responsePromise;
    const responseTime = Date.now() - startTime;
    
    // API応答は1秒以内
    expect(responseTime).toBeLessThan(1000);
    
    // レスポンスサイズの確認
    const responseBody = await response.body();
    expect(responseBody.length).toBeLessThan(100000); // 100KB以下
  });

  test('Memory usage', async ({ page }) => {
    await page.goto('/');
    
    // 初期メモリ使用量
    const initialMetrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });
    
    if (initialMetrics) {
      // 複数の操作を実行
      for (let i = 0; i < 5; i++) {
        await page.click('text=設定');
        await page.click('text=ダッシュボード');
        await page.click('text=シミュレーション');
      }
      
      // 最終メモリ使用量
      const finalMetrics = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });
      
      if (finalMetrics) {
        const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
        
        // メモリリークのチェック（50MB以上の増加は警告）
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      }
    }
  });

  test('Bundle size check', async ({ page }) => {
    const response = await page.goto('/');
    
    // すべてのJSファイルのサイズを取得
    const jsResources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.endsWith('.js'))
        .map(entry => ({
          name: entry.name,
          size: entry.transferSize,
          duration: entry.duration
        }));
    });
    
    // 総バンドルサイズ
    const totalSize = jsResources.reduce((sum, resource) => sum + resource.size, 0);
    
    // 総バンドルサイズは2MB以下
    expect(totalSize).toBeLessThan(2 * 1024 * 1024);
    
    // 個別ファイルは500KB以下
    jsResources.forEach(resource => {
      expect(resource.size).toBeLessThan(500 * 1024);
    });
  });
});

test.describe('Stress Tests', () => {
  test('Concurrent requests', async ({ page }) => {
    await page.goto('/');
    
    // 20個の同時リクエスト
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        page.request.get(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000'}/api/market-data`, {
          params: {
            symbols: `TEST${i}`,
            type: 'us-stock'
          }
        })
      );
    }
    
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    // すべてのリクエストが5秒以内に完了
    expect(totalTime).toBeLessThan(5000);
    
    // 成功したリクエストの割合
    const successfulRequests = responses.filter(r => r.status() === 200).length;
    expect(successfulRequests).toBeGreaterThan(requests.length * 0.8); // 80%以上成功
  });

  test('Large data handling', async ({ page }) => {
    await page.goto('/');
    
    // 大量の銘柄を一度にリクエスト
    const symbols = Array.from({ length: 50 }, (_, i) => `SYM${i}`).join(',');
    
    const response = await page.request.get(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000'}/api/market-data`, {
      params: {
        symbols: symbols,
        type: 'us-stock'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBeDefined();
  });
});