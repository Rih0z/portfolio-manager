/**
 * E2E テスト共通定数
 * @file e2e/fixtures/test-constants.ts
 */

export const URLS = {
  production: 'https://portfolio-wise.com',
  apiBase: 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod',
  configEndpoint: '/config/client',
};

export const SELECTORS = {
  appHeader: '[data-testid="app-header"]',
  tabNavigation: '[data-testid="tab-navigation"]',
  portfolioScoreCard: '[data-testid="portfolio-score-card"]',
  pnlSummary: '[data-testid="pnl-summary"]',
  strengthsWeaknessCard: '[data-testid="strengths-weakness-card"]',
  loginButton: 'button:has-text("Google"), button:has-text("ログイン"), button:has-text("Login")',
  errorBoundary: '[data-testid="error-boundary"], .error-boundary',
};

export const TIMEOUTS = {
  pageLoad: 30_000,
  apiResponse: 15_000,
  animation: 2_000,
};
