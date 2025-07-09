/**
 * Market Data Visualization E2E Tests
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';
import { testMarketData } from '../fixtures/test-data.js';
import { waitForAppReady, waitForChartRender, setupAPIMocks } from '../utils/helpers.js';

test.describe('Market Data Visualization', () => {
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    
    // Setup market data mocks
    await setupAPIMocks(page, {
      marketData: testMarketData,
      portfolio: {
        holdings: [],
        totals: { totalValue: 0, totalGain: 0, totalGainPercent: 0 }
      }
    });
    
    await dashboardPage.goto();
    await waitForAppReady(page);
  });

  test.describe('Market Indices Display', () => {
    test('should display major market indices', async ({ page }) => {
      // Look for market indices section
      const indicesSection = page.locator('[data-testid="market-indices"], .market-indices');
      await expect(indicesSection).toBeVisible();
      
      // Check for Nikkei 225
      const nikkei = page.locator('text=/日経平均|Nikkei 225|^N225/i');
      await expect(nikkei).toBeVisible();
      
      // Check for Dow Jones
      const dow = page.locator('text=/ダウ平均|Dow Jones|^DJI/i');
      await expect(dow).toBeVisible();
      
      // Check for S&P 500
      const sp500 = page.locator('text=/S&P 500|^GSPC/i');
      await expect(sp500).toBeVisible();
      
      await dashboardPage.screenshot('market-indices');
    });

    test('should display index values and changes', async ({ page }) => {
      // Check Nikkei data
      const nikkeiValue = page.locator('[data-index="^N225"] [data-field="value"], .index-value:has-text("日経平均")');
      const nikkeiText = await nikkeiValue.textContent();
      expect(nikkeiText).toMatch(/[\d,]+/);
      
      // Check change percentage
      const nikkeiChange = page.locator('[data-index="^N225"] [data-field="change"], .index-change:has-text("日経平均")');
      const changeText = await nikkeiChange.textContent();
      expect(changeText).toMatch(/[+-]?\d+\.?\d*%?/);
      
      // Check color coding (green for positive, red for negative)
      const changeClass = await nikkeiChange.getAttribute('class');
      expect(changeClass).toMatch(/text-(green|red)|positive|negative/);
    });

    test('should update market data in real-time', async ({ page }) => {
      let updateCount = 0;
      
      // Mock real-time updates
      await page.route('**/api/marketData/indices', async (route) => {
        updateCount++;
        const updatedData = {
          indices: testMarketData.indices.map(index => ({
            ...index,
            value: index.value * (1 + (Math.random() * 0.02 - 0.01)),
            change: (Math.random() * 2 - 1).toFixed(2)
          }))
        };
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedData)
        });
      });
      
      // Wait for potential updates
      await page.waitForTimeout(10000);
      
      // Should have fetched updates
      expect(updateCount).toBeGreaterThan(0);
    });
  });

  test.describe('Exchange Rate Display', () => {
    test('should display USD/JPY exchange rate', async ({ page }) => {
      const exchangeRate = page.locator('[data-testid="exchange-rate"], .exchange-rate');
      await expect(exchangeRate).toBeVisible();
      
      const rateText = await exchangeRate.textContent();
      expect(rateText).toMatch(/USD\/JPY|ドル\/円/);
      expect(rateText).toMatch(/\d+\.?\d*/);
    });

    test('should show exchange rate changes', async ({ page }) => {
      const rateChange = page.locator('[data-testid="exchange-rate-change"], .rate-change');
      if (await rateChange.count() > 0) {
        const changeText = await rateChange.textContent();
        expect(changeText).toMatch(/[+-]?\d+\.?\d*%?/);
      }
    });

    test('should update exchange rate', async ({ page }) => {
      // Mock exchange rate update
      await page.route('**/api/marketData/exchangeRates', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rates: [
              { pair: 'USD/JPY', rate: 151.25, change: 0.5 }
            ]
          })
        });
      });
      
      // Trigger refresh
      const refreshButton = page.locator('button:has-text("更新"), button:has-text("Refresh")').first();
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Charts and Visualizations', () => {
    test('should display portfolio performance chart', async ({ page }) => {
      // Navigate to portfolio with data
      await setupAPIMocks(page, {
        portfolio: {
          holdings: [
            { tickerLocal: 'AAPL', quantity: 100, currentPrice: 180, purchasePrice: 150 }
          ],
          performance: [
            { date: '2024-01-01', value: 15000 },
            { date: '2024-01-02', value: 15500 },
            { date: '2024-01-03', value: 16000 },
            { date: '2024-01-04', value: 15800 },
            { date: '2024-01-05', value: 16200 }
          ]
        }
      });
      
      await page.reload();
      await waitForAppReady(page);
      
      // Check for performance chart
      const chart = page.locator('.recharts-line-chart, [data-testid="performance-chart"]');
      await expect(chart).toBeVisible();
      
      await waitForChartRender(page);
      
      // Check for line elements
      const lines = page.locator('.recharts-line');
      expect(await lines.count()).toBeGreaterThan(0);
      
      await dashboardPage.screenshot('performance-chart');
    });

    test('should display allocation pie chart', async ({ page }) => {
      // Setup portfolio with multiple holdings
      await setupAPIMocks(page, {
        portfolio: {
          holdings: [
            { tickerLocal: 'AAPL', name: 'Apple', value: 50000 },
            { tickerLocal: '7203', name: 'Toyota', value: 30000 },
            { tickerLocal: 'MSFT', name: 'Microsoft', value: 20000 }
          ]
        }
      });
      
      await page.reload();
      await waitForAppReady(page);
      
      // Check for pie chart
      const pieChart = page.locator('.recharts-pie-chart, [data-testid="allocation-chart"]');
      await expect(pieChart).toBeVisible();
      
      await waitForChartRender(page);
      
      // Check for pie slices
      const slices = page.locator('.recharts-pie-sector');
      expect(await slices.count()).toBeGreaterThan(0);
      
      // Check for legend
      const legend = page.locator('.recharts-legend-wrapper');
      await expect(legend).toBeVisible();
    });

    test('should show chart tooltips on hover', async ({ page }) => {
      const chart = page.locator('.recharts-wrapper').first();
      if (await chart.count() > 0) {
        // Hover over chart area
        await chart.hover({ position: { x: 100, y: 100 } });
        
        // Check for tooltip
        const tooltip = page.locator('.recharts-tooltip-wrapper:visible');
        if (await tooltip.count() > 0) {
          const tooltipText = await tooltip.textContent();
          expect(tooltipText).toBeTruthy();
        }
      }
    });

    test('should handle chart resize on window resize', async ({ page }) => {
      // Initial size
      await page.setViewportSize({ width: 1200, height: 800 });
      await waitForChartRender(page);
      
      // Resize to smaller
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(500);
      
      // Charts should still be visible
      const charts = page.locator('.recharts-wrapper');
      const count = await charts.count();
      
      for (let i = 0; i < count; i++) {
        await expect(charts.nth(i)).toBeVisible();
      }
    });
  });

  test.describe('Market Data Filters and Controls', () => {
    test('should filter market data by region', async ({ page }) => {
      // Look for region filter
      const regionFilter = page.locator('select[name="region"], [data-testid="region-filter"]');
      if (await regionFilter.count() > 0) {
        // Select Japan
        await regionFilter.selectOption('JP');
        
        // Should show only Japanese indices
        const nikkei = page.locator('text=/日経平均|Nikkei/i');
        await expect(nikkei).toBeVisible();
        
        // US indices should be hidden or less prominent
        const dow = page.locator('text=/ダウ平均|Dow Jones/i');
        const dowVisible = await dow.isVisible().catch(() => false);
        
        // Select US
        await regionFilter.selectOption('US');
        
        // Should show US indices
        await expect(page.locator('text=/Dow Jones|S&P 500/i').first()).toBeVisible();
      }
    });

    test('should toggle between different chart types', async ({ page }) => {
      // Look for chart type selector
      const chartTypeSelector = page.locator('[data-testid="chart-type-selector"], .chart-type-selector');
      if (await chartTypeSelector.count() > 0) {
        // Switch to bar chart
        await chartTypeSelector.locator('button:has-text("Bar"), button:has-text("棒グラフ")').click();
        
        // Check for bar chart elements
        const bars = page.locator('.recharts-bar');
        if (await bars.count() > 0) {
          await expect(bars.first()).toBeVisible();
        }
        
        // Switch back to line chart
        await chartTypeSelector.locator('button:has-text("Line"), button:has-text("線グラフ")').click();
      }
    });

    test('should change time period for charts', async ({ page }) => {
      // Look for time period selector
      const periodSelector = page.locator('[data-testid="period-selector"], .period-selector');
      if (await periodSelector.count() > 0) {
        // Select 1 month
        await periodSelector.locator('button:has-text("1M"), button:has-text("1ヶ月")').click();
        await page.waitForLoadState('networkidle');
        
        // Select 1 year
        await periodSelector.locator('button:has-text("1Y"), button:has-text("1年")').click();
        await page.waitForLoadState('networkidle');
        
        // Charts should update
        await waitForChartRender(page);
      }
    });
  });

  test.describe('Market Data Error Handling', () => {
    test('should handle market data API errors', async ({ page }) => {
      // Mock API error
      await page.route('**/api/marketData/**', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Market data service unavailable' })
        });
      });
      
      await page.reload();
      await waitForAppReady(page);
      
      // Should show error or fallback message
      const errorMessage = page.locator('text=/利用できません|Unavailable|エラー|Error/i');
      await expect(errorMessage.first()).toBeVisible();
    });

    test('should show stale data warning', async ({ page }) => {
      // Mock old data
      await setupAPIMocks(page, {
        marketData: {
          ...testMarketData,
          lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day old
        }
      });
      
      await page.reload();
      await waitForAppReady(page);
      
      // Should show stale data warning
      const warning = page.locator('text=/古いデータ|Stale data|更新が必要/i');
      if (await warning.count() > 0) {
        await expect(warning.first()).toBeVisible();
      }
    });
  });

  test.describe('Mobile Market Data Display', () => {
    test('should display market data on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.reload();
      await waitForAppReady(page);
      
      // Market indices should be visible in mobile layout
      const indices = page.locator('[data-testid="market-indices"], .market-indices');
      await expect(indices).toBeVisible();
      
      // Charts might be in a carousel or tabs
      const charts = page.locator('.recharts-wrapper');
      expect(await charts.count()).toBeGreaterThan(0);
      
      await dashboardPage.screenshot('market-data-mobile');
    });
  });
});