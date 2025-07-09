/**
 * Dashboard Page Object Model
 */

import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      ...this.selectors,
      // Portfolio summary
      portfolioValue: '[data-testid="portfolio-value"], .portfolio-value',
      totalGain: '[data-testid="total-gain"], .total-gain',
      totalGainPercent: '[data-testid="total-gain-percent"], .gain-percent',
      
      // Holdings table
      holdingsTable: '[data-testid="holdings-table"], .holdings-table, table',
      holdingRow: '[data-testid="holding-row"], tbody tr',
      
      // Charts
      pieChart: '[data-testid="allocation-chart"], .recharts-pie',
      performanceChart: '[data-testid="performance-chart"], .recharts-line',
      
      // Data status
      dataStatus: '[data-testid="data-status"], .data-status',
      lastUpdated: '[data-testid="last-updated"], .last-updated',
      
      // Actions
      refreshButton: 'button:has-text("更新"), button:has-text("Refresh")',
      exportButton: 'button:has-text("エクスポート"), button:has-text("Export")',
      importButton: 'button:has-text("インポート"), button:has-text("Import")'
    };
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await super.goto('/');
    await this.waitForDashboardLoad();
  }

  /**
   * Wait for dashboard to load
   */
  async waitForDashboardLoad() {
    await this.page.waitForSelector(this.selectors.portfolioValue, { state: 'visible' });
    await this.waitForLoadingComplete();
  }

  /**
   * Get portfolio summary values
   */
  async getPortfolioSummary() {
    const value = await this.page.locator(this.selectors.portfolioValue).textContent();
    const gain = await this.page.locator(this.selectors.totalGain).textContent();
    const gainPercent = await this.page.locator(this.selectors.totalGainPercent).textContent();
    
    return {
      value: this.parseNumberFromText(value),
      gain: this.parseNumberFromText(gain),
      gainPercent: this.parsePercentFromText(gainPercent)
    };
  }

  /**
   * Get holdings data
   */
  async getHoldings() {
    const rows = this.page.locator(this.selectors.holdingRow);
    const count = await rows.count();
    const holdings = [];
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const cells = row.locator('td');
      
      holdings.push({
        ticker: await cells.nth(0).textContent(),
        name: await cells.nth(1).textContent(),
        quantity: this.parseNumberFromText(await cells.nth(2).textContent()),
        price: this.parseNumberFromText(await cells.nth(3).textContent()),
        value: this.parseNumberFromText(await cells.nth(4).textContent()),
        gain: this.parseNumberFromText(await cells.nth(5).textContent()),
        gainPercent: this.parsePercentFromText(await cells.nth(6).textContent())
      });
    }
    
    return holdings;
  }

  /**
   * Check if pie chart is visible
   */
  async isPieChartVisible() {
    const chart = this.page.locator(this.selectors.pieChart);
    return await chart.isVisible();
  }

  /**
   * Check if performance chart is visible
   */
  async isPerformanceChartVisible() {
    const chart = this.page.locator(this.selectors.performanceChart);
    return await chart.isVisible();
  }

  /**
   * Get data status
   */
  async getDataStatus() {
    const status = await this.page.locator(this.selectors.dataStatus).textContent();
    const lastUpdated = await this.page.locator(this.selectors.lastUpdated).textContent();
    
    return {
      status,
      lastUpdated
    };
  }

  /**
   * Click refresh button
   */
  async refreshData() {
    await this.page.locator(this.selectors.refreshButton).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click export button
   */
  async clickExport() {
    await this.page.locator(this.selectors.exportButton).click();
  }

  /**
   * Click import button
   */
  async clickImport() {
    await this.page.locator(this.selectors.importButton).click();
  }

  /**
   * Parse number from text (handles Japanese formatting)
   */
  parseNumberFromText(text) {
    if (!text) return 0;
    // Remove currency symbols, commas, and spaces
    const cleaned = text.replace(/[¥$,\s]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Parse percentage from text
   */
  parsePercentFromText(text) {
    if (!text) return 0;
    const cleaned = text.replace(/[%\s]/g, '');
    return parseFloat(cleaned) || 0;
  }
}