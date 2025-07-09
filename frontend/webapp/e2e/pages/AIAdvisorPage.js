/**
 * AI Advisor Page Object Model
 */

import { BasePage } from './BasePage.js';

export class AIAdvisorPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      ...this.selectors,
      // AI prompt section
      promptTextarea: 'textarea[name="prompt"], [data-testid="ai-prompt"]',
      promptTemplates: '[data-testid="prompt-templates"], .prompt-templates',
      templateButton: '[data-testid="template-button"], .template-button',
      
      // Actions
      analyzeButton: 'button:has-text("分析開始"), button:has-text("Analyze")',
      clearButton: 'button:has-text("クリア"), button:has-text("Clear")',
      copyButton: 'button:has-text("コピー"), button:has-text("Copy")',
      
      // Results
      resultsContainer: '[data-testid="ai-results"], .ai-results',
      analysisResult: '[data-testid="analysis-result"], .analysis-result',
      
      // Analysis sections
      riskAnalysis: '[data-testid="risk-analysis"], .risk-analysis',
      recommendations: '[data-testid="recommendations"], .recommendations',
      marketInsights: '[data-testid="market-insights"], .market-insights',
      
      // Status
      analyzingIndicator: '[data-testid="analyzing"], .analyzing-indicator',
      progressBar: '[data-testid="progress-bar"], .progress-bar',
      
      // History
      historyPanel: '[data-testid="history-panel"], .history-panel',
      historyItem: '[data-testid="history-item"], .history-item',
      
      // Export options
      exportPDFButton: 'button:has-text("PDF出力"), button:has-text("Export PDF")',
      exportMarkdownButton: 'button:has-text("Markdown出力"), button:has-text("Export Markdown")',
      
      // Settings
      advancedSettingsToggle: 'button:has-text("詳細設定"), button:has-text("Advanced Settings")',
      temperatureSlider: 'input[name="temperature"], [data-testid="temperature-slider"]',
      maxLengthInput: 'input[name="maxLength"], [data-testid="max-length"]'
    };
  }

  /**
   * Navigate to AI advisor page
   */
  async goto() {
    await super.goto('/ai-advisor');
    await this.waitForPageLoad();
  }

  /**
   * Enter custom prompt
   */
  async enterPrompt(prompt) {
    await this.page.fill(this.selectors.promptTextarea, prompt);
  }

  /**
   * Select a prompt template
   */
  async selectTemplate(templateName) {
    const template = this.page.locator(this.selectors.templateButton).filter({ hasText: templateName });
    await template.click();
    
    // Wait for prompt to be populated
    await this.page.waitForTimeout(300);
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates() {
    const templates = this.page.locator(this.selectors.templateButton);
    const count = await templates.count();
    const names = [];
    
    for (let i = 0; i < count; i++) {
      names.push(await templates.nth(i).textContent());
    }
    
    return names;
  }

  /**
   * Start analysis
   */
  async startAnalysis() {
    await this.page.locator(this.selectors.analyzeButton).click();
    await this.waitForAnalysisStart();
  }

  /**
   * Wait for analysis to start
   */
  async waitForAnalysisStart() {
    await this.page.waitForSelector(this.selectors.analyzingIndicator, { 
      state: 'visible',
      timeout: 5000 
    });
  }

  /**
   * Wait for analysis to complete
   */
  async waitForAnalysisComplete() {
    // Wait for analyzing indicator to disappear
    await this.page.waitForSelector(this.selectors.analyzingIndicator, { 
      state: 'hidden',
      timeout: 60000 // AI analysis can take time
    });
    
    // Wait for results to appear
    await this.page.waitForSelector(this.selectors.resultsContainer, { 
      state: 'visible' 
    });
  }

  /**
   * Check if analysis is in progress
   */
  async isAnalyzing() {
    const indicator = this.page.locator(this.selectors.analyzingIndicator);
    return await indicator.isVisible();
  }

  /**
   * Get analysis results
   */
  async getAnalysisResults() {
    const results = await this.page.locator(this.selectors.analysisResult).textContent();
    
    const sections = {
      full: results,
      risk: null,
      recommendations: null,
      insights: null
    };
    
    // Try to get individual sections if they exist
    const riskSection = this.page.locator(this.selectors.riskAnalysis);
    if (await riskSection.count() > 0) {
      sections.risk = await riskSection.textContent();
    }
    
    const recommendationsSection = this.page.locator(this.selectors.recommendations);
    if (await recommendationsSection.count() > 0) {
      sections.recommendations = await recommendationsSection.textContent();
    }
    
    const insightsSection = this.page.locator(this.selectors.marketInsights);
    if (await insightsSection.count() > 0) {
      sections.insights = await insightsSection.textContent();
    }
    
    return sections;
  }

  /**
   * Clear results
   */
  async clearResults() {
    await this.page.locator(this.selectors.clearButton).click();
  }

  /**
   * Copy results to clipboard
   */
  async copyResults() {
    await this.page.locator(this.selectors.copyButton).click();
  }

  /**
   * Get analysis history
   */
  async getHistory() {
    const items = this.page.locator(this.selectors.historyItem);
    const count = await items.count();
    const history = [];
    
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      history.push({
        prompt: await item.locator('[data-field="prompt"]').textContent(),
        timestamp: await item.locator('[data-field="timestamp"]').textContent()
      });
    }
    
    return history;
  }

  /**
   * Select history item
   */
  async selectHistoryItem(index) {
    const items = this.page.locator(this.selectors.historyItem);
    await items.nth(index).click();
    
    // Wait for prompt to be populated
    await this.page.waitForTimeout(300);
  }

  /**
   * Export analysis as PDF
   */
  async exportPDF() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator(this.selectors.exportPDFButton).click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * Export analysis as Markdown
   */
  async exportMarkdown() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator(this.selectors.exportMarkdownButton).click();
    const download = await downloadPromise;
    return download;
  }

  /**
   * Toggle advanced settings
   */
  async toggleAdvancedSettings() {
    await this.page.locator(this.selectors.advancedSettingsToggle).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Update advanced settings
   */
  async updateAdvancedSettings(settings) {
    await this.toggleAdvancedSettings();
    
    if (settings.temperature !== undefined) {
      await this.page.fill(this.selectors.temperatureSlider, settings.temperature.toString());
    }
    
    if (settings.maxLength !== undefined) {
      await this.page.fill(this.selectors.maxLengthInput, settings.maxLength.toString());
    }
  }

  /**
   * Get progress percentage
   */
  async getProgress() {
    const progressBar = this.page.locator(this.selectors.progressBar);
    if (await progressBar.count() > 0) {
      const style = await progressBar.getAttribute('style');
      const match = style.match(/width:\s*(\d+)%/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }
}