/**
 * E2E test helper utilities
 */

/**
 * Wait for the application to be ready
 * @param {Page} page - Playwright page object
 */
export async function waitForAppReady(page) {
  // Wait for the main app container
  await page.waitForSelector('[data-testid="app-container"], .App', { 
    state: 'visible',
    timeout: 30000 
  });
  
  // Wait for any initial loading states to complete
  await page.waitForLoadState('networkidle');
  
  // Wait for any spinners to disappear
  const spinner = page.locator('.spinner, [data-testid="loading-spinner"]');
  if (await spinner.count() > 0) {
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}

/**
 * Mock API responses
 * @param {Page} page - Playwright page object
 * @param {Object} mocks - Object containing API mocks
 */
export async function setupAPIMocks(page, mocks = {}) {
  // Intercept API calls and provide mock responses
  await page.route('**/api/**', async (route, request) => {
    const url = request.url();
    
    // Mock market data API
    if (url.includes('/marketData') && mocks.marketData) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mocks.marketData)
      });
      return;
    }
    
    // Mock portfolio API
    if (url.includes('/portfolio') && mocks.portfolio) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mocks.portfolio)
      });
      return;
    }
    
    // Mock config API
    if (url.includes('/config') && mocks.config) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mocks.config)
      });
      return;
    }
    
    // Continue with actual request if no mock is defined
    await route.continue();
  });
}

/**
 * Upload a file in E2E tests
 * @param {Page} page - Playwright page object
 * @param {string} selector - File input selector
 * @param {string} fileName - File name
 * @param {string} fileContent - File content
 * @param {string} mimeType - MIME type
 */
export async function uploadFile(page, selector, fileName, fileContent, mimeType = 'text/plain') {
  const buffer = Buffer.from(fileContent, 'utf-8');
  
  await page.setInputFiles(selector, {
    name: fileName,
    mimeType: mimeType,
    buffer: buffer
  });
}

/**
 * Check if an element contains expected text
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @param {string} expectedText - Expected text
 * @param {Object} options - Additional options
 */
export async function expectTextContent(page, selector, expectedText, options = {}) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', ...options });
  await expect(element).toContainText(expectedText);
}

/**
 * Take a screenshot with a descriptive name
 * @param {Page} page - Playwright page object
 * @param {string} name - Screenshot name
 */
export async function takeScreenshot(page, name) {
  await page.screenshot({ 
    path: `test-results/screenshots/${name}.png`,
    fullPage: true 
  });
}

/**
 * Wait for and dismiss any toast notifications
 * @param {Page} page - Playwright page object
 */
export async function dismissToasts(page) {
  const toasts = page.locator('[role="alert"], .toast, [data-testid="toast"]');
  const count = await toasts.count();
  
  for (let i = 0; i < count; i++) {
    const toast = toasts.nth(i);
    const closeButton = toast.locator('button[aria-label="Close"], .close-button');
    
    if (await closeButton.count() > 0) {
      await closeButton.click();
    }
  }
}

/**
 * Navigate to a specific tab
 * @param {Page} page - Playwright page object
 * @param {string} tabName - Name of the tab to navigate to
 */
export async function navigateToTab(page, tabName) {
  const tabButton = page.locator(`button:has-text("${tabName}"), a:has-text("${tabName}")`);
  await tabButton.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Format number for assertion
 * @param {number} value - Number to format
 * @param {string} locale - Locale for formatting
 */
export function formatNumber(value, locale = 'ja-JP') {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Wait for chart/visualization to render
 * @param {Page} page - Playwright page object
 * @param {string} chartSelector - Chart container selector
 */
export async function waitForChartRender(page, chartSelector = '.recharts-wrapper') {
  await page.waitForSelector(chartSelector, { state: 'visible' });
  // Additional wait for animations to complete
  await page.waitForTimeout(500);
}