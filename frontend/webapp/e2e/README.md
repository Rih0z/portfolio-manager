# E2E Testing with Playwright

This directory contains end-to-end tests for the Portfolio Manager application using Playwright.

## Setup Instructions

### 1. Install Playwright

First, make sure Playwright is installed with all necessary browsers:

```bash
# Install Playwright browsers
npm run e2e:install

# Install system dependencies (if needed)
npm run e2e:install-deps
```

### 2. Running Tests

#### Run all E2E tests
```bash
npm run e2e
```

#### Run tests with UI mode (recommended for development)
```bash
npm run e2e:ui
```

#### Run tests in headed mode (see browser)
```bash
npm run e2e:headed
```

#### Debug tests
```bash
npm run e2e:debug
```

#### Run tests for specific browser
```bash
npm run e2e:chrome    # Chrome only
npm run e2e:firefox   # Firefox only
npm run e2e:webkit    # Safari only
npm run e2e:mobile    # Mobile browsers
```

#### Generate test code with Codegen
```bash
npm run e2e:codegen
```

#### View test report
```bash
npm run e2e:report
```

## Test Structure

```
e2e/
├── fixtures/           # Test data and fixtures
│   └── test-data.js   # Shared test data
├── pages/             # Page Object Models
│   ├── BasePage.js    # Base page class
│   ├── DashboardPage.js
│   ├── DataImportPage.js
│   ├── SettingsPage.js
│   └── AIAdvisorPage.js
├── tests/             # Test specifications
│   ├── dashboard.spec.js
│   ├── data-import.spec.js
│   ├── settings.spec.js
│   ├── market-data.spec.js
│   └── ai-advisor.spec.js
└── utils/             # Helper utilities
    └── helpers.js     # Common helper functions
```

## Writing Tests

### Basic Test Structure

```javascript
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage.js';

test.describe('Feature Name', () => {
  let page;

  test.beforeEach(async ({ page }) => {
    // Setup before each test
    page = new DashboardPage(page);
    await page.goto();
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Using Page Object Models

Page objects encapsulate page-specific logic:

```javascript
// In your test
const dashboardPage = new DashboardPage(page);
await dashboardPage.goto();
const summary = await dashboardPage.getPortfolioSummary();
expect(summary.value).toBeGreaterThan(0);
```

### API Mocking

Mock API responses for testing without authentication:

```javascript
import { setupAPIMocks } from '../utils/helpers.js';

await setupAPIMocks(page, {
  portfolio: testPortfolioData,
  marketData: testMarketData
});
```

## Configuration

See `playwright.config.js` for test configuration including:
- Browser settings
- Viewport sizes
- Timeouts
- Base URL
- Test artifacts location

## Environment Variables

- `PLAYWRIGHT_BASE_URL`: Override base URL (default: http://localhost:3000)
- `CI`: Set to true in CI environments for optimized settings

## Best Practices

1. **Use Page Objects**: Encapsulate page logic in page object models
2. **Data-driven Tests**: Use fixtures for test data
3. **Wait Strategies**: Use proper wait methods instead of hard waits
4. **Accessibility**: Include accessibility checks in tests
5. **Screenshots**: Take screenshots on failures for debugging
6. **Parallel Execution**: Tests run in parallel by default

## Debugging Failed Tests

1. **Run with UI mode**: `npm run e2e:ui`
2. **Use debug mode**: `npm run e2e:debug`
3. **Check screenshots**: Located in `test-results/screenshots/`
4. **View traces**: Playwright captures traces on retry
5. **Check videos**: Videos are saved for failed tests

## CI/CD Integration

The tests are configured to run in CI environments:

```yaml
# Example GitHub Actions
- name: Install Playwright
  run: npm run e2e:install
  
- name: Run E2E tests
  run: npm run e2e
  
- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Common Issues

### Browser Installation
If browsers are not installed:
```bash
npm run e2e:install
```

### Permission Issues
On Linux, you might need system dependencies:
```bash
npm run e2e:install-deps
```

### Flaky Tests
- Increase timeouts in `playwright.config.js`
- Add proper wait conditions
- Use `test.retry()` for flaky tests

## Test Coverage

Current test coverage includes:
- ✅ Portfolio Dashboard display
- ✅ Data Import/Export functionality
- ✅ Settings management
- ✅ Market data visualization
- ✅ AI Advisor functionality (non-authenticated)
- ❌ Google Authentication (requires actual Google account)

## Contributing

When adding new tests:
1. Create appropriate page objects
2. Add test data to fixtures
3. Follow existing patterns
4. Ensure tests work without authentication
5. Add documentation for new features