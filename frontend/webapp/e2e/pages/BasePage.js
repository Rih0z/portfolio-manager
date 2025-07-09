/**
 * Base Page Object Model for common functionality
 */

export class BasePage {
  constructor(page) {
    this.page = page;
    
    // Common selectors
    this.selectors = {
      header: 'header, [data-testid="header"]',
      navigation: 'nav, [data-testid="navigation"]',
      footer: 'footer, [data-testid="footer"]',
      loadingSpinner: '.spinner, [data-testid="loading-spinner"]',
      errorMessage: '[data-testid="error-message"], .error-message',
      toast: '[role="alert"], .toast, [data-testid="toast"]',
      modal: '[role="dialog"], .modal, [data-testid="modal"]'
    };
  }

  /**
   * Navigate to a specific URL
   * @param {string} path - Path to navigate to
   */
  async goto(path = '') {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.selectors.header, { state: 'visible' });
  }

  /**
   * Check if loading spinner is visible
   */
  async isLoading() {
    const spinner = this.page.locator(this.selectors.loadingSpinner);
    return await spinner.isVisible();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete() {
    const spinner = this.page.locator(this.selectors.loadingSpinner);
    if (await spinner.count() > 0) {
      await spinner.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Get error message if present
   */
  async getErrorMessage() {
    const error = this.page.locator(this.selectors.errorMessage);
    if (await error.count() > 0) {
      return await error.textContent();
    }
    return null;
  }

  /**
   * Check if a toast notification is visible
   */
  async isToastVisible() {
    const toast = this.page.locator(this.selectors.toast);
    return await toast.isVisible();
  }

  /**
   * Get toast message
   */
  async getToastMessage() {
    const toast = this.page.locator(this.selectors.toast);
    if (await toast.count() > 0) {
      return await toast.textContent();
    }
    return null;
  }

  /**
   * Dismiss toast notification
   */
  async dismissToast() {
    const toast = this.page.locator(this.selectors.toast);
    const closeButton = toast.locator('button');
    if (await closeButton.count() > 0) {
      await closeButton.click();
    }
  }

  /**
   * Check if modal is visible
   */
  async isModalVisible() {
    const modal = this.page.locator(this.selectors.modal);
    return await modal.isVisible();
  }

  /**
   * Close modal
   */
  async closeModal() {
    // Try multiple ways to close modal
    const closeButton = this.page.locator('[aria-label="Close"], .close-button, button:has-text("閉じる"), button:has-text("Close")');
    if (await closeButton.count() > 0) {
      await closeButton.first().click();
    } else {
      // Try pressing Escape
      await this.page.keyboard.press('Escape');
    }
    
    // Wait for modal to disappear
    const modal = this.page.locator(this.selectors.modal);
    if (await modal.count() > 0) {
      await modal.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Take a screenshot
   * @param {string} name - Screenshot name
   */
  async screenshot(name) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Navigate using tab buttons
   * @param {string} tabName - Name of the tab
   */
  async navigateToTab(tabName) {
    const tabButton = this.page.locator(`button:has-text("${tabName}"), a:has-text("${tabName}")`);
    await tabButton.click();
    await this.waitForLoadingComplete();
  }
}