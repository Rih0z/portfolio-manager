/**
 * Settings Page Object Model
 */

import { BasePage } from './BasePage.js';

export class SettingsPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      ...this.selectors,
      // Settings tabs
      generalTab: 'button:has-text("一般設定"), button:has-text("General")',
      portfolioTab: 'button:has-text("ポートフォリオ"), button:has-text("Portfolio")',
      marketDataTab: 'button:has-text("市場データ"), button:has-text("Market Data")',
      aiTab: 'button:has-text("AI設定"), button:has-text("AI Settings")',
      
      // General settings
      languageSelect: 'select[name="language"], [data-testid="language-select"]',
      themeSelect: 'select[name="theme"], [data-testid="theme-select"]',
      currencySelect: 'select[name="currency"], [data-testid="currency-select"]',
      
      // Portfolio settings
      holdingsList: '[data-testid="holdings-list"], .holdings-list',
      holdingItem: '[data-testid="holding-item"], .holding-item',
      addHoldingButton: 'button:has-text("銘柄を追加"), button:has-text("Add Holding")',
      
      // Holding form fields
      tickerInput: 'input[name="ticker"], [data-testid="ticker-input"]',
      nameInput: 'input[name="name"], [data-testid="name-input"]',
      quantityInput: 'input[name="quantity"], [data-testid="quantity-input"]',
      priceInput: 'input[name="price"], [data-testid="price-input"]',
      
      // Market data settings
      dataSourceSelect: 'select[name="dataSource"], [data-testid="data-source-select"]',
      refreshIntervalInput: 'input[name="refreshInterval"], [data-testid="refresh-interval"]',
      exchangeRateInput: 'input[name="exchangeRate"], [data-testid="exchange-rate"]',
      
      // AI settings
      aiModelSelect: 'select[name="aiModel"], [data-testid="ai-model-select"]',
      promptTemplateTextarea: 'textarea[name="promptTemplate"], [data-testid="prompt-template"]',
      maxTokensInput: 'input[name="maxTokens"], [data-testid="max-tokens"]',
      
      // Actions
      saveButton: 'button:has-text("保存"), button:has-text("Save")',
      cancelButton: 'button:has-text("キャンセル"), button:has-text("Cancel")',
      resetButton: 'button:has-text("リセット"), button:has-text("Reset")',
      deleteButton: 'button:has-text("削除"), button:has-text("Delete")',
      
      // Messages
      successMessage: '[data-testid="settings-success"], .success-message',
      errorMessage: '[data-testid="settings-error"], .error-message'
    };
  }

  /**
   * Navigate to settings page
   */
  async goto() {
    await super.goto('/settings');
    await this.waitForPageLoad();
  }

  /**
   * Switch to a specific settings tab
   */
  async switchToTab(tabName) {
    const tabMap = {
      'general': this.selectors.generalTab,
      'portfolio': this.selectors.portfolioTab,
      'marketData': this.selectors.marketDataTab,
      'ai': this.selectors.aiTab
    };
    
    const selector = tabMap[tabName];
    if (selector) {
      await this.page.locator(selector).click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Update general settings
   */
  async updateGeneralSettings(settings) {
    if (settings.language) {
      await this.page.selectOption(this.selectors.languageSelect, settings.language);
    }
    
    if (settings.theme) {
      await this.page.selectOption(this.selectors.themeSelect, settings.theme);
    }
    
    if (settings.currency) {
      await this.page.selectOption(this.selectors.currencySelect, settings.currency);
    }
  }

  /**
   * Get current general settings
   */
  async getGeneralSettings() {
    return {
      language: await this.page.locator(this.selectors.languageSelect).inputValue(),
      theme: await this.page.locator(this.selectors.themeSelect).inputValue(),
      currency: await this.page.locator(this.selectors.currencySelect).inputValue()
    };
  }

  /**
   * Add a new holding
   */
  async addHolding(holding) {
    await this.page.locator(this.selectors.addHoldingButton).click();
    
    // Wait for form to appear
    await this.page.waitForSelector(this.selectors.tickerInput, { state: 'visible' });
    
    // Fill in holding details
    await this.page.fill(this.selectors.tickerInput, holding.ticker);
    await this.page.fill(this.selectors.nameInput, holding.name);
    await this.page.fill(this.selectors.quantityInput, holding.quantity.toString());
    await this.page.fill(this.selectors.priceInput, holding.price.toString());
  }

  /**
   * Get holdings list
   */
  async getHoldings() {
    const items = this.page.locator(this.selectors.holdingItem);
    const count = await items.count();
    const holdings = [];
    
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      holdings.push({
        ticker: await item.locator('[data-field="ticker"]').textContent(),
        name: await item.locator('[data-field="name"]').textContent(),
        quantity: await item.locator('[data-field="quantity"]').textContent(),
        price: await item.locator('[data-field="price"]').textContent()
      });
    }
    
    return holdings;
  }

  /**
   * Delete a holding
   */
  async deleteHolding(ticker) {
    const holding = this.page.locator(this.selectors.holdingItem).filter({ hasText: ticker });
    const deleteButton = holding.locator(this.selectors.deleteButton);
    await deleteButton.click();
    
    // Confirm deletion if modal appears
    const confirmButton = this.page.locator('button:has-text("確認"), button:has-text("Confirm")');
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
    }
  }

  /**
   * Update market data settings
   */
  async updateMarketDataSettings(settings) {
    if (settings.dataSource) {
      await this.page.selectOption(this.selectors.dataSourceSelect, settings.dataSource);
    }
    
    if (settings.refreshInterval) {
      await this.page.fill(this.selectors.refreshIntervalInput, settings.refreshInterval.toString());
    }
    
    if (settings.exchangeRate) {
      await this.page.fill(this.selectors.exchangeRateInput, settings.exchangeRate.toString());
    }
  }

  /**
   * Get market data settings
   */
  async getMarketDataSettings() {
    return {
      dataSource: await this.page.locator(this.selectors.dataSourceSelect).inputValue(),
      refreshInterval: await this.page.locator(this.selectors.refreshIntervalInput).inputValue(),
      exchangeRate: await this.page.locator(this.selectors.exchangeRateInput).inputValue()
    };
  }

  /**
   * Update AI settings
   */
  async updateAISettings(settings) {
    if (settings.model) {
      await this.page.selectOption(this.selectors.aiModelSelect, settings.model);
    }
    
    if (settings.promptTemplate) {
      await this.page.fill(this.selectors.promptTemplateTextarea, settings.promptTemplate);
    }
    
    if (settings.maxTokens) {
      await this.page.fill(this.selectors.maxTokensInput, settings.maxTokens.toString());
    }
  }

  /**
   * Get AI settings
   */
  async getAISettings() {
    return {
      model: await this.page.locator(this.selectors.aiModelSelect).inputValue(),
      promptTemplate: await this.page.locator(this.selectors.promptTemplateTextarea).inputValue(),
      maxTokens: await this.page.locator(this.selectors.maxTokensInput).inputValue()
    };
  }

  /**
   * Save settings
   */
  async saveSettings() {
    await this.page.locator(this.selectors.saveButton).click();
    
    // Wait for save to complete
    await this.page.waitForSelector(
      `${this.selectors.successMessage}, ${this.selectors.errorMessage}`,
      { state: 'visible', timeout: 10000 }
    );
  }

  /**
   * Check if settings were saved successfully
   */
  async isSettingsSaved() {
    const success = this.page.locator(this.selectors.successMessage);
    return await success.isVisible();
  }

  /**
   * Reset settings
   */
  async resetSettings() {
    await this.page.locator(this.selectors.resetButton).click();
    
    // Confirm reset if modal appears
    const confirmButton = this.page.locator('button:has-text("確認"), button:has-text("Confirm")');
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
    }
  }
}