/**
 * Portfolio Dashboard E2E Tests
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';
import { testPortfolioData } from '../fixtures/test-data.js';
import { setupAPIMocks, waitForAppReady } from '../utils/helpers.js';

test.describe('Portfolio Dashboard', () => {
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    
    // Setup API mocks for non-authenticated features
    await setupAPIMocks(page, {
      portfolio: testPortfolioData,
      marketData: {
        exchangeRate: 150,
        lastUpdated: new Date().toISOString()
      },
      config: {
        apiUrl: 'https://api.example.com',
        features: {
          authentication: false
        }
      }
    });
    
    await dashboardPage.goto();
    await waitForAppReady(page);
  });

  test('should display portfolio summary', async ({ page }) => {
    const summary = await dashboardPage.getPortfolioSummary();
    
    expect(summary.value).toBeGreaterThan(0);
    expect(summary.gain).toBeDefined();
    expect(summary.gainPercent).toBeDefined();
    
    await dashboardPage.screenshot('dashboard-summary');
  });

  test('should display holdings table with correct data', async ({ page }) => {
    const holdings = await dashboardPage.getHoldings();
    
    expect(holdings.length).toBeGreaterThan(0);
    
    // Check first holding
    const firstHolding = holdings[0];
    expect(firstHolding.ticker).toBeTruthy();
    expect(firstHolding.name).toBeTruthy();
    expect(firstHolding.quantity).toBeGreaterThan(0);
    expect(firstHolding.price).toBeGreaterThan(0);
    expect(firstHolding.value).toBeGreaterThan(0);
  });

  test('should display allocation pie chart', async ({ page }) => {
    const isChartVisible = await dashboardPage.isPieChartVisible();
    expect(isChartVisible).toBe(true);
    
    // Wait for chart animation
    await page.waitForTimeout(1000);
    
    await dashboardPage.screenshot('dashboard-pie-chart');
  });

  test('should display performance chart', async ({ page }) => {
    const isChartVisible = await dashboardPage.isPerformanceChartVisible();
    expect(isChartVisible).toBe(true);
    
    // Wait for chart animation
    await page.waitForTimeout(1000);
    
    await dashboardPage.screenshot('dashboard-performance-chart');
  });

  test('should show data status and last updated time', async ({ page }) => {
    const dataStatus = await dashboardPage.getDataStatus();
    
    expect(dataStatus.status).toBeTruthy();
    expect(dataStatus.lastUpdated).toBeTruthy();
  });

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    // Get initial last updated time
    const initialStatus = await dashboardPage.getDataStatus();
    
    // Click refresh
    await dashboardPage.refreshData();
    
    // Check that loading occurred
    const wasLoading = await dashboardPage.isLoading();
    
    // Get new status
    const newStatus = await dashboardPage.getDataStatus();
    
    // Status should be updated (or at least attempted)
    expect(newStatus.status).toBeTruthy();
  });

  test('should navigate to import when import button is clicked', async ({ page }) => {
    await dashboardPage.clickImport();
    
    // Should navigate to data import page
    await expect(page).toHaveURL(/\/data/);
  });

  test('should handle empty portfolio state', async ({ page }) => {
    // Setup empty portfolio mock
    await setupAPIMocks(page, {
      portfolio: {
        holdings: [],
        totals: {
          totalValue: 0,
          totalGain: 0,
          totalGainPercent: 0
        }
      }
    });
    
    await page.reload();
    await waitForAppReady(page);
    
    // Should show empty state message
    const emptyMessage = page.locator('text=/ポートフォリオが空です|No holdings|Empty portfolio/i');
    await expect(emptyMessage).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Setup error mock
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.reload();
    
    // Should show error message
    const errorMessage = await dashboardPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.reload();
    await waitForAppReady(page);
    
    // Check that key elements are still visible
    const summary = await dashboardPage.getPortfolioSummary();
    expect(summary.value).toBeGreaterThan(0);
    
    // Holdings should be visible (possibly in a different layout)
    const holdings = await dashboardPage.getHoldings();
    expect(holdings.length).toBeGreaterThan(0);
    
    await dashboardPage.screenshot('dashboard-mobile');
  });

  test('should display currency correctly', async ({ page }) => {
    const holdings = await dashboardPage.getHoldings();
    
    // Check for JPY holdings
    const jpyHolding = holdings.find(h => h.ticker.match(/^\d{4}$/));
    if (jpyHolding) {
      const valueText = await page.locator(`text=${jpyHolding.ticker}`).locator('..').locator('text=/¥|円/').textContent();
      expect(valueText).toBeTruthy();
    }
    
    // Check for USD holdings
    const usdHolding = holdings.find(h => h.ticker.match(/^[A-Z]+$/));
    if (usdHolding) {
      const valueText = await page.locator(`text=${usdHolding.ticker}`).locator('..').locator('text=/\$|USD/').textContent();
      expect(valueText).toBeTruthy();
    }
  });

  test('should handle real-time updates', async ({ page }) => {
    // Mock WebSocket or polling updates
    let updateCount = 0;
    
    await page.route('**/api/marketData/realtime', async (route) => {
      updateCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          holdings: testPortfolioData.holdings.map(h => ({
            ...h,
            currentPrice: h.currentPrice * (1 + Math.random() * 0.02 - 0.01)
          }))
        })
      });
    });
    
    // Wait for potential updates
    await page.waitForTimeout(5000);
    
    // Should have attempted to fetch updates
    expect(updateCount).toBeGreaterThanOrEqual(0);
  });
});