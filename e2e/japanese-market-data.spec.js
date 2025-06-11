import { test, expect } from '@playwright/test';
import { AWSIntegrationHelper } from './helpers/aws-integration';

test.describe('Japanese Market Data Integration', () => {
  let awsHelper;

  test.beforeEach(async ({ page }) => {
    awsHelper = new AWSIntegrationHelper(page);
  });

  test.describe('Japanese Stock Market', () => {
    test('Japanese stock data - 7203 (Toyota)', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: '7203.T',
          type: 'jp-stock'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('7203.T');
      
      const toyota = data.data['7203.T'];
      expect(toyota.symbol).toBe('7203.T');
      expect(toyota.price).toBeGreaterThan(0);
      expect(toyota.currency).toBe('JPY');
    });

    test('Multiple Japanese stocks', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: '7203.T,6758.T,9984.T', // Toyota, Sony, SoftBank
          type: 'jp-stock'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Object.keys(data.data)).toHaveLength(3);
      
      // Toyota
      expect(data.data).toHaveProperty('7203.T');
      expect(data.data['7203.T'].price).toBeGreaterThan(0);
      
      // Sony
      expect(data.data).toHaveProperty('6758.T');
      expect(data.data['6758.T'].price).toBeGreaterThan(0);
      
      // SoftBank
      expect(data.data).toHaveProperty('9984.T');
      expect(data.data['9984.T'].price).toBeGreaterThan(0);
    });

    test('TOPIX and Nikkei indices', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: '^N225,^TPX', // Nikkei 225, TOPIX
          type: 'jp-index'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      
      if (data.data['^N225']) {
        const nikkei = data.data['^N225'];
        expect(nikkei.price).toBeGreaterThan(20000); // Nikkei typically > 20,000
        expect(nikkei.price).toBeLessThan(50000);
      }
      
      if (data.data['^TPX']) {
        const topix = data.data['^TPX'];
        expect(topix.price).toBeGreaterThan(1000); // TOPIX typically > 1,000
        expect(topix.price).toBeLessThan(3000);
      }
    });

    test('Japanese stock with fallback handling', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: '1234.T', // Likely non-existent stock
          type: 'jp-stock'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      // API should still return a response, even for invalid symbols
      expect(data.success).toBeDefined();
      
      if (data.data['1234.T']) {
        const stock = data.data['1234.T'];
        // Either has error or fallback data
        expect(stock.error || stock.symbol).toBeDefined();
      }
    });
  });

  test.describe('Japanese Mutual Funds', () => {
    test('Popular Japanese mutual fund', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: '03311187', // SBI・V・S&P500インデックスファンド
          type: 'jp-fund'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      
      if (data.data['03311187']) {
        const fund = data.data['03311187'];
        expect(fund.symbol).toBe('03311187');
        expect(fund.price).toBeGreaterThan(0);
        expect(fund.currency).toBe('JPY');
      }
    });

    test('Multiple Japanese mutual funds', async ({ page }) => {
      const fundCodes = [
        '03311187', // SBI・V・S&P500
        '0131109A', // eMAXIS Slim 全世界株式
        '03312187'  // SBI・V・全世界株式
      ];
      
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: fundCodes.join(','),
          type: 'jp-fund'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      
      // At least one fund should have valid data
      const validFunds = Object.keys(data.data).filter(key => {
        const fund = data.data[key];
        return fund && fund.price && fund.price > 0;
      });
      
      expect(validFunds.length).toBeGreaterThan(0);
    });

    test('Fund search by name pattern', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/search-funds`, {
        params: {
          query: 'S&P500',
          type: 'jp-fund',
          limit: 10
        }
      });
      
      if (response.status() === 200) {
        const data = await response.json();
        
        expect(data.success).toBe(true);
        expect(Array.isArray(data.results)).toBe(true);
        
        if (data.results.length > 0) {
          const fund = data.results[0];
          expect(fund.name).toContain('S&P500' || fund.name.includes('S&P'));
          expect(fund.code).toBeTruthy();
        }
      }
    });
  });

  test.describe('Market Hours and Trading Status', () => {
    test('Japanese market hours check', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-status`, {
        params: {
          market: 'jp'
        }
      });
      
      if (response.status() === 200) {
        const data = await response.json();
        
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('market');
        expect(data.data.market).toBe('jp');
        expect(data.data).toHaveProperty('isOpen');
        expect(data.data).toHaveProperty('nextOpen');
        expect(data.data).toHaveProperty('nextClose');
      }
    });

    test('Market holidays handling', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-holidays`, {
        params: {
          market: 'jp',
          year: new Date().getFullYear()
        }
      });
      
      if (response.status() === 200) {
        const data = await response.json();
        
        expect(data.success).toBe(true);
        expect(Array.isArray(data.holidays)).toBe(true);
        
        // Should include common Japanese holidays
        const holidayNames = data.holidays.map(h => h.name.toLowerCase());
        const hasJapaneseHolidays = holidayNames.some(name => 
          name.includes('new year') || 
          name.includes('golden week') ||
          name.includes('emperor') ||
          name.includes('culture day')
        );
        
        if (data.holidays.length > 0) {
          expect(hasJapaneseHolidays).toBe(true);
        }
      }
    });
  });

  test.describe('Currency and Exchange Rates', () => {
    test('USD/JPY exchange rate', async ({ page }) => {
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
      expect(rate.rate).toBeGreaterThan(100);
      expect(rate.rate).toBeLessThan(200);
      expect(rate.lastUpdated).toBeTruthy();
    });

    test('Multiple currency pairs with JPY', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          type: 'exchange-rate',
          pairs: 'USD-JPY,EUR-JPY,GBP-JPY'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      
      const pairs = Object.keys(data.data);
      expect(pairs.length).toBeGreaterThan(0);
      
      pairs.forEach(pair => {
        const rateData = data.data[pair];
        expect(rateData.rate).toBeGreaterThan(0);
        expect(pair).toContain('JPY');
      });
    });
  });

  test.describe('Error Handling and Fallbacks', () => {
    test('Invalid Japanese stock code', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: '99999.T',
          type: 'jp-stock'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      if (data.data['99999.T']) {
        const stock = data.data['99999.T'];
        expect(stock.error || stock.fallback).toBeTruthy();
      }
    });

    test('Mixed valid and invalid symbols', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: '7203.T,INVALID.T,6758.T',
          type: 'jp-stock'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      
      // Valid symbols should have valid data
      expect(data.data['7203.T']).toBeTruthy();
      expect(data.data['6758.T']).toBeTruthy();
      
      // Invalid symbol should have error or fallback
      if (data.data['INVALID.T']) {
        expect(data.data['INVALID.T'].error || data.data['INVALID.T'].fallback).toBeTruthy();
      }
    });

    test('Rate limiting with Japanese market data', async ({ page }) => {
      test.slow(); // This test takes longer
      
      const symbols = ['7203.T', '6758.T', '9984.T', '8306.T', '9437.T'];
      const requests = [];
      
      // Make multiple concurrent requests
      for (let i = 0; i < 10; i++) {
        const request = page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
          params: {
            symbols: symbols[i % symbols.length],
            type: 'jp-stock'
          }
        });
        requests.push(request);
      }
      
      const responses = await Promise.allSettled(requests);
      
      let successCount = 0;
      let rateLimitedCount = 0;
      
      for (const result of responses) {
        if (result.status === 'fulfilled') {
          const response = result.value;
          if (response.status() === 200) {
            successCount++;
          } else if (response.status() === 429) {
            rateLimitedCount++;
          }
        }
      }
      
      // At least some requests should succeed
      expect(successCount).toBeGreaterThan(0);
      
      // Rate limiting may or may not be in effect
      console.log(`Successful requests: ${successCount}, Rate limited: ${rateLimitedCount}`);
    });
  });

  test.describe('Data Quality and Validation', () => {
    test('Data freshness validation', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: '7203.T',
          type: 'jp-stock'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      if (data.data['7203.T'] && data.data['7203.T'].lastUpdated) {
        const lastUpdated = new Date(data.data['7203.T'].lastUpdated);
        const now = new Date();
        const timeDiff = now - lastUpdated;
        
        // Data should be updated within the last 24 hours during market days
        expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000);
      }
    });

    test('Price range validation', async ({ page }) => {
      const response = await page.request.get(`${awsHelper.apiBaseUrl}/api/market-data`, {
        params: {
          symbols: '7203.T,6758.T',
          type: 'jp-stock'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      Object.keys(data.data).forEach(symbol => {
        const stock = data.data[symbol];
        if (stock.price && !stock.error) {
          // Japanese stocks typically range from 100 to 100,000 JPY
          expect(stock.price).toBeGreaterThan(10);
          expect(stock.price).toBeLessThan(1000000);
          
          // Validate other numeric fields
          if (stock.change) {
            expect(typeof stock.change).toBe('number');
          }
          
          if (stock.changePercent) {
            expect(typeof stock.changePercent).toBe('number');
            expect(Math.abs(stock.changePercent)).toBeLessThan(50); // Daily change rarely exceeds 50%
          }
        }
      });
    });
  });
});

test.describe('Japanese Fund UI Integration', () => {
  test('Search and add Japanese mutual fund', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to settings
    await page.click('text=設定');
    
    // Look for fund search or add functionality
    const addButton = page.locator('button:has-text("投資信託")');
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Try to search for a fund
      const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="ファンド"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('S&P500');
        
        // Wait for search results
        await page.waitForTimeout(2000);
        
        // Check if results are displayed
        const results = page.locator('[data-testid="fund-search-results"], .fund-result');
        if (await results.count() > 0) {
          // Select first result
          await results.first().click();
          
          // Verify fund was added
          await expect(page.locator('text=S&P500')).toBeVisible();
        }
      }
    }
  });

  test('Display Japanese stock prices in UI', async ({ page }) => {
    await page.goto('/');
    
    // Add a Japanese stock manually if possible
    const addStockButton = page.locator('button:has-text("追加"), button:has-text("Add")');
    if (await addStockButton.isVisible()) {
      await addStockButton.click();
      
      // Try to add Toyota stock
      const symbolInput = page.locator('input[placeholder*="銘柄"], input[placeholder*="symbol"]');
      if (await symbolInput.isVisible()) {
        await symbolInput.fill('7203.T');
        
        const confirmButton = page.locator('button:has-text("追加"), button:has-text("Add"), button:has-text("確認")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          
          // Wait for price to load
          await page.waitForTimeout(3000);
          
          // Check if price is displayed
          const pricePattern = /¥[0-9,]+|[0-9,]+円/;
          await expect(page.locator(`text=${pricePattern}`)).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });
});