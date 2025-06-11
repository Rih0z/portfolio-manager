import { defineConfig, devices } from '@playwright/test';

/**
 * 本番環境E2Eテスト設定
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/production-test.spec.js', '**/comprehensive-user-flow.spec.js'],
  
  /* 最大並列実行数 */
  fullyParallel: true,
  /* CI環境でのリトライを無効化 */
  forbidOnly: !!process.env.CI,
  /* 失敗時のリトライ回数 */
  retries: process.env.CI ? 2 : 1,
  /* 並列ワーカー数 */
  workers: process.env.CI ? 1 : 2,
  
  /* レポーター設定 */
  reporter: [
    ['html', { outputFolder: 'e2e-report/production' }],
    ['junit', { outputFile: 'e2e-results-production.xml' }],
    ['list']
  ],
  
  /* グローバル設定 */
  use: {
    /* ベースURL - 本番環境 */
    baseURL: 'https://2e9affd4.pfwise-portfolio-manager.pages.dev',
    
    /* エビデンス収集 */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* タイムアウト */
    actionTimeout: 15000,
    navigationTimeout: 45000,
  },

  /* プロジェクト設定 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    }
  ]
});