import { test, expect } from '@playwright/test';

test.describe('API Performance Tests', () => {
  const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

  test('API response time measurement', async ({ request }) => {
    const endpoints = [
      { name: 'Health Check', url: '/health' },
      { name: 'Single Stock', url: '/api/market-data?symbols=AAPL&type=us-stock' },
      { name: 'Multiple Stocks', url: '/api/market-data?symbols=AAPL,GOOGL,MSFT&type=us-stock' },
      { name: 'Exchange Rate', url: '/api/market-data?type=exchange-rate&base=USD&target=JPY' }
    ];
    
    console.log('\n=== API Performance Test Results ===');
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await request.get(`${apiUrl}${endpoint.url}`);
      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 1秒以内
      
      console.log(`✅ ${endpoint.name}: ${responseTime}ms`);
    }
  });

  test('Concurrent request handling', async ({ request }) => {
    const concurrentRequests = 10;
    const requests = [];
    
    console.log(`\n=== Concurrent Requests Test (${concurrentRequests} requests) ===`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        request.get(`${apiUrl}/api/market-data?symbols=TEST${i}&type=us-stock`)
      );
    }
    
    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    const successCount = responses.filter(r => r.status() === 200).length;
    const avgTime = totalTime / concurrentRequests;
    
    console.log(`✅ Total time: ${totalTime}ms`);
    console.log(`✅ Average time per request: ${avgTime.toFixed(2)}ms`);
    console.log(`✅ Success rate: ${(successCount / concurrentRequests * 100).toFixed(0)}%`);
    console.log(`✅ Requests per second: ${(1000 / avgTime).toFixed(2)}`);
    
    expect(successCount).toBe(concurrentRequests);
    expect(avgTime).toBeLessThan(500); // 平均500ms以内
  });

  test('Large payload handling', async ({ request }) => {
    // 50銘柄を一度にリクエスト
    const symbols = Array.from({ length: 50 }, (_, i) => `SYM${i}`).join(',');
    
    console.log('\n=== Large Payload Test (50 symbols) ===');
    
    const startTime = Date.now();
    const response = await request.get(`${apiUrl}/api/market-data?symbols=${symbols}&type=us-stock`);
    const responseTime = Date.now() - startTime;
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    const responseSize = JSON.stringify(data).length;
    
    console.log(`✅ Response time: ${responseTime}ms`);
    console.log(`✅ Response size: ${(responseSize / 1024).toFixed(2)}KB`);
    console.log(`✅ Symbols returned: ${Object.keys(data.data || {}).length}`);
    
    expect(responseTime).toBeLessThan(2000); // 2秒以内
    expect(responseSize).toBeLessThan(100000); // 100KB以内
  });

  test('Cache performance', async ({ request }) => {
    const symbol = 'CACHE_TEST';
    const url = `${apiUrl}/api/market-data?symbols=${symbol}&type=us-stock`;
    
    console.log('\n=== Cache Performance Test ===');
    
    // 1回目のリクエスト（キャッシュなし）
    const firstStart = Date.now();
    const firstResponse = await request.get(url);
    const firstTime = Date.now() - firstStart;
    
    expect(firstResponse.status()).toBe(200);
    
    // 2回目のリクエスト（キャッシュあり想定）
    const secondStart = Date.now();
    const secondResponse = await request.get(url);
    const secondTime = Date.now() - secondStart;
    
    expect(secondResponse.status()).toBe(200);
    
    console.log(`✅ First request: ${firstTime}ms`);
    console.log(`✅ Second request: ${secondTime}ms`);
    console.log(`✅ Cache improvement: ${((1 - secondTime/firstTime) * 100).toFixed(0)}%`);
    
    // 2回目は1回目より速いはず（または同等）
    expect(secondTime).toBeLessThanOrEqual(firstTime + 50); // 誤差50ms許容
  });
});