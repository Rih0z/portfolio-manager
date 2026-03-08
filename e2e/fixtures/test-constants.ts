/**
 * E2E テスト共通定数
 * @file e2e/fixtures/test-constants.ts
 */

export const URLS = {
  production: process.env.E2E_BASE_URL || 'https://portfolio-wise.com',
  apiBase: process.env.E2E_API_BASE_URL || 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod',
  configEndpoint: '/config/client',
};

export const SELECTORS = {
  // Existing
  appHeader: '[data-testid="app-header"]',
  tabNavigation: '[data-testid="tab-navigation"]',
  portfolioScoreCard: '[data-testid="portfolio-score-card"]',
  pnlSummary: '[data-testid="pnl-summary"]',
  strengthsWeaknessCard: '[data-testid="strengths-weakness-card"]',
  loginButton: 'button:has-text("Google"), button:has-text("ログイン"), button:has-text("Login")',
  errorBoundary: '[data-testid="error-boundary"], .error-boundary',
  // New for Phase 6
  landingPage: '[data-testid="landing-page"]',
  pricingPage: '[data-testid="pricing-page"]',
  dashboardPage: '[data-testid="dashboard-page"]',
  settingsPage: '[data-testid="settings-page"]',
  simulationPage: '[data-testid="simulation-page"]',
  aiAdvisorPage: '[data-testid="ai-advisor-page"]',
  dataImportPage: '[data-testid="data-import-page"]',
  notificationBell: '[data-testid="notification-bell"]',
  notificationDropdown: '[data-testid="notification-dropdown"]',
  referralSection: '[data-testid="referral-section"]',
  loadingFallback: '[data-testid="loading-fallback"]',
  loadingSpinner: '[data-testid="loading-spinner"]',
  termsPage: '[data-testid="terms-page"]',
  privacyPage: '[data-testid="privacy-page"]',
  disclaimerPage: '[data-testid="disclaimer-page"]',
  kkkrPage: '[data-testid="kkkr-page"]',
};

export const TIMEOUTS = {
  pageLoad: 30_000,
  apiResponse: 15_000,
  animation: 2_000,
};
