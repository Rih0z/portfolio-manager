/**
 * MCP (Model Context Protocol) Enhanced Test Helpers
 * 
 * This helper class provides natural language testing capabilities
 * for the portfolio management application using MCP.
 */

export class MCPTestHelper {
  constructor(page) {
    this.page = page;
    this.defaultTimeout = 10000;
  }

  /**
   * Perform natural language actions on the portfolio application
   * @param {string} naturalLanguageCommand - Human-readable command
   * @returns {Promise<Object>} Result of the action
   */
  async performPortfolioAction(naturalLanguageCommand) {
    const command = naturalLanguageCommand.toLowerCase();
    
    try {
      // Navigation commands
      if (command.includes('navigate to dashboard') || command.includes('go to dashboard')) {
        return await this.navigateToDashboard();
      }
      
      if (command.includes('navigate to settings') || command.includes('go to settings')) {
        return await this.navigateToSettings();
      }
      
      if (command.includes('navigate to data') || command.includes('go to data integration')) {
        return await this.navigateToDataIntegration();
      }
      
      if (command.includes('navigate to simulation') || command.includes('go to simulation')) {
        return await this.navigateToSimulation();
      }
      
      // Portfolio manipulation commands
      if (command.includes('add') && (command.includes('stock') || command.includes('asset'))) {
        return await this.addAssetFromCommand(command);
      }
      
      if (command.includes('remove') && (command.includes('stock') || command.includes('asset'))) {
        return await this.removeAssetFromCommand(command);
      }
      
      if (command.includes('update') && command.includes('shares')) {
        return await this.updateSharesFromCommand(command);
      }
      
      // Data operations
      if (command.includes('import') && command.includes('portfolio')) {
        return await this.importPortfolioData();
      }
      
      if (command.includes('export') && command.includes('portfolio')) {
        return await this.exportPortfolioData();
      }
      
      // Language switching
      if (command.includes('switch to') && (command.includes('english') || command.includes('japanese'))) {
        return await this.switchLanguage(command.includes('english') ? 'en' : 'ja');
      }
      
      return { success: false, message: `Command not recognized: ${naturalLanguageCommand}` };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate portfolio conditions using natural language
   * @param {string} expectedCondition - Human-readable validation condition
   * @returns {Promise<Object>} Validation result
   */
  async validatePortfolioCondition(expectedCondition) {
    const condition = expectedCondition.toLowerCase();
    
    try {
      // Portfolio value validation
      if (condition.includes('portfolio total') || condition.includes('total value')) {
        return await this.validatePortfolioTotal(condition);
      }
      
      // Asset presence validation
      if (condition.includes('asset') && condition.includes('appears')) {
        return await this.validateAssetPresence(condition);
      }
      
      // Data format validation
      if (condition.includes('formatted') && condition.includes('currency')) {
        return await this.validateCurrencyFormatting();
      }
      
      // Loading state validation
      if (condition.includes('loading') || condition.includes('displayed')) {
        return await this.validatePageLoaded();
      }
      
      // Error state validation
      if (condition.includes('error') && condition.includes('message')) {
        return await this.validateErrorHandling();
      }
      
      return { success: false, message: `Condition not recognized: ${expectedCondition}` };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Navigation helpers
  async navigateToDashboard() {
    const dashboardSelectors = [
      'text=/dashboard|ダッシュボード/i',
      '[href="/"], [href="/dashboard"]',
      'button:has-text("Dashboard")',
      '.nav-dashboard'
    ];
    
    for (const selector of dashboardSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click();
          await this.page.waitForLoadState('networkidle');
          return { success: true, message: 'Navigated to dashboard' };
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: go to root
    await this.page.goto('/');
    return { success: true, message: 'Navigated to home page' };
  }

  async navigateToSettings() {
    const settingsSelectors = [
      'text=/settings|設定/i',
      '[href="/settings"]',
      'button:has-text("Settings")',
      '.nav-settings'
    ];
    
    return await this.navigateWithSelectors(settingsSelectors, 'settings');
  }

  async navigateToDataIntegration() {
    const dataSelectors = [
      'text=/data|データ|integration|連携/i',
      '[href="/data"]',
      'button:has-text("Data")',
      '.nav-data'
    ];
    
    return await this.navigateWithSelectors(dataSelectors, 'data integration');
  }

  async navigateToSimulation() {
    const simulationSelectors = [
      'text=/simulation|シミュレーション/i',
      '[href="/simulation"]',
      'button:has-text("Simulation")',
      '.nav-simulation'
    ];
    
    return await this.navigateWithSelectors(simulationSelectors, 'simulation');
  }

  async navigateWithSelectors(selectors, pageName) {
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click();
          await this.page.waitForLoadState('networkidle');
          return { success: true, message: `Navigated to ${pageName}` };
        }
      } catch (e) {
        continue;
      }
    }
    
    return { success: false, message: `Could not navigate to ${pageName}` };
  }

  // Asset manipulation helpers
  async addAssetFromCommand(command) {
    // Extract ticker and details from command
    const tickerMatch = command.match(/([A-Z]{1,5}(?:\\.T)?|[0-9]{4}(?:\\.T)?)/);
    const sharesMatch = command.match(/([0-9]+)\s*shares/);
    const priceMatch = command.match(/(?:at\s*)?[$¥]?([0-9,]+(?:\.[0-9]{2})?)/);
    
    if (!tickerMatch) {
      return { success: false, message: 'Could not extract ticker from command' };
    }
    
    const ticker = tickerMatch[1];
    const shares = sharesMatch ? parseInt(sharesMatch[1]) : 1;
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null;
    
    // Try to find add asset functionality
    const addSelectors = [
      'button:has-text("Add")',
      'button:has-text("追加")',
      'text=/add asset|add stock|新規追加/i',
      '[data-testid="add-asset"]'
    ];
    
    for (const selector of addSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click();
          await this.page.waitForTimeout(500);
          
          // Fill in ticker
          const tickerInput = this.page.locator('input[name="ticker"], input[placeholder*="ticker"], input[placeholder*="symbol"]').first();
          if (await tickerInput.count() > 0) {
            await tickerInput.fill(ticker);
          }
          
          // Fill in shares
          const sharesInput = this.page.locator('input[name="shares"], input[placeholder*="shares"], input[placeholder*="quantity"]').first();
          if (await sharesInput.count() > 0) {
            await sharesInput.fill(shares.toString());
          }
          
          // Fill in price if provided
          if (price) {
            const priceInput = this.page.locator('input[name="price"], input[placeholder*="price"]').first();
            if (await priceInput.count() > 0) {
              await priceInput.fill(price.toString());
            }
          }
          
          // Submit the form
          const submitButton = this.page.locator('button[type="submit"], button:has-text("Save"), button:has-text("保存")').first();
          if (await submitButton.count() > 0) {
            await submitButton.click();
            await this.page.waitForLoadState('networkidle');
          }
          
          return { 
            success: true, 
            message: `Added ${shares} shares of ${ticker}`,
            data: { ticker, shares, price }
          };
        }
      } catch (e) {
        continue;
      }
    }
    
    return { success: false, message: 'Could not find add asset functionality' };
  }

  // Validation helpers
  async validatePortfolioTotal(condition) {
    const totalSelectors = [
      'text=/total|合計/i',
      '[data-testid="portfolio-total"]',
      '.portfolio-total',
      '.total-value'
    ];
    
    for (const selector of totalSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          const text = await element.textContent();
          const hasNumber = /[0-9,]+(?:\.[0-9]{2})?/.test(text);
          const hasCurrency = /[$¥]/.test(text);
          
          if (condition.includes('greater than')) {
            const amountMatch = condition.match(/([0-9,]+)/);
            if (amountMatch) {
              const threshold = parseInt(amountMatch[1].replace(',', ''));
              const valueMatch = text.match(/([0-9,]+(?:\.[0-9]{2})?)/);
              if (valueMatch) {
                const value = parseFloat(valueMatch[1].replace(',', ''));
                return { 
                  success: value > threshold, 
                  message: `Portfolio total ${value} ${value > threshold ? 'is' : 'is not'} greater than ${threshold}`,
                  data: { value, threshold }
                };
              }
            }
          }
          
          return { 
            success: hasNumber && hasCurrency, 
            message: `Portfolio total is ${hasNumber && hasCurrency ? 'properly' : 'not properly'} formatted`,
            data: { text }
          };
        }
      } catch (e) {
        continue;
      }
    }
    
    return { success: false, message: 'Could not find portfolio total' };
  }

  async validateAssetPresence(condition) {
    // Extract asset identifier from condition
    const assetMatch = condition.match(/([A-Z]{1,5}(?:\\.T)?|[0-9]{4}(?:\\.T)?)/);
    if (!assetMatch) {
      return { success: false, message: 'Could not extract asset identifier from condition' };
    }
    
    const asset = assetMatch[1];
    const assetElement = this.page.locator(`text=${asset}`).first();
    
    const isVisible = await assetElement.count() > 0;
    return { 
      success: isVisible, 
      message: `Asset ${asset} ${isVisible ? 'appears' : 'does not appear'} in the list`,
      data: { asset }
    };
  }

  async validateCurrencyFormatting() {
    const currencyElements = this.page.locator('text=/[$¥][0-9,]+(?:\\.[0-9]{2})?/');
    const count = await currencyElements.count();
    
    if (count === 0) {
      return { success: false, message: 'No currency formatted values found' };
    }
    
    // Check first few currency values for proper formatting
    let properlyFormatted = 0;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await currencyElements.nth(i).textContent();
      if (/[$¥][0-9,]+(?:\.[0-9]{2})?/.test(text)) {
        properlyFormatted++;
      }
    }
    
    return { 
      success: properlyFormatted > 0, 
      message: `${properlyFormatted} out of ${Math.min(count, 5)} currency values are properly formatted`,
      data: { total: count, properlyFormatted }
    };
  }

  async validatePageLoaded() {
    try {
      await this.page.waitForLoadState('networkidle', { timeout: this.defaultTimeout });
      const bodyVisible = await this.page.locator('body').isVisible();
      const mainContent = await this.page.locator('main, .app, .root, .main-content').first().isVisible();
      
      return { 
        success: bodyVisible && mainContent, 
        message: `Page ${bodyVisible && mainContent ? 'is' : 'is not'} properly loaded`,
        data: { bodyVisible, mainContent }
      };
    } catch (error) {
      return { success: false, message: 'Page failed to load', error: error.message };
    }
  }

  async switchLanguage(targetLang) {
    const langSelectors = [
      targetLang === 'en' ? 'text=/english|en|🇺🇸/i' : 'text=/japanese|jp|日本語|🇯🇵/i',
      '[aria-label*="language"], [aria-label*="言語"]',
      '.language-switcher',
      '[data-testid="language-switcher"]'
    ];
    
    for (const selector of langSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click();
          await this.page.waitForTimeout(1000);
          return { success: true, message: `Switched to ${targetLang}` };
        }
      } catch (e) {
        continue;
      }
    }
    
    return { success: false, message: 'Could not find language switcher' };
  }

  async validateErrorHandling() {
    const errorSelectors = [
      'text=/error|エラー|failed|失敗/i',
      '.error-message',
      '[role="alert"]',
      '.alert-error'
    ];
    
    let errorFound = false;
    let errorMessage = '';
    
    for (const selector of errorSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          errorFound = true;
          errorMessage = await element.textContent();
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    return { 
      success: !errorFound, // Success means no errors found
      message: errorFound ? `Error found: ${errorMessage}` : 'No errors detected',
      data: { errorFound, errorMessage }
    };
  }

  /**
   * Wait for specific condition with natural language description
   */
  async waitForCondition(description, timeout = this.defaultTimeout) {
    const condition = description.toLowerCase();
    
    if (condition.includes('loading') && condition.includes('complete')) {
      await this.page.waitForLoadState('networkidle', { timeout });
      return { success: true, message: 'Loading completed' };
    }
    
    if (condition.includes('element') && condition.includes('visible')) {
      // Extract element identifier
      const elementMatch = condition.match(/element\s+([^\s]+)\s+/);
      if (elementMatch) {
        const selector = elementMatch[1];
        await this.page.waitForSelector(selector, { state: 'visible', timeout });
        return { success: true, message: `Element ${selector} is visible` };
      }
    }
    
    return { success: false, message: `Could not interpret condition: ${description}` };
  }

  /**
   * Generate automated test report
   */
  generateTestReport(testResults) {
    const summary = {
      total: testResults.length,
      passed: testResults.filter(r => r.success).length,
      failed: testResults.filter(r => !r.success).length,
      timestamp: new Date().toISOString()
    };
    
    return {
      summary,
      details: testResults,
      recommendations: this.generateRecommendations(testResults)
    };
  }

  generateRecommendations(testResults) {
    const recommendations = [];
    
    const failedResults = testResults.filter(r => !r.success);
    
    if (failedResults.length > 0) {
      recommendations.push('Review failed test cases for potential UX improvements');
    }
    
    const navigationFailures = failedResults.filter(r => 
      r.message && r.message.includes('navigate')
    );
    
    if (navigationFailures.length > 0) {
      recommendations.push('Improve navigation accessibility and discoverability');
    }
    
    const formatFailures = failedResults.filter(r => 
      r.message && r.message.includes('format')
    );
    
    if (formatFailures.length > 0) {
      recommendations.push('Standardize data formatting across the application');
    }
    
    return recommendations;
  }
}