import { defineConfig, devices } from '@playwright/test';

/**
 * E2Eテスト設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* 最大並列実行数 */
  fullyParallel: true,
  /* CI環境でのリトライを無効化 */
  forbidOnly: !!process.env.CI,
  /* 失敗時のリトライ回数 */
  retries: process.env.CI ? 2 : 0,
  /* 並列ワーカー数 */
  workers: process.env.CI ? 1 : undefined,
  /* レポーター設定 */
  reporter: [
    ['html', { outputFolder: 'e2e-report' }],
    ['junit', { outputFile: 'e2e-results.xml' }],
    ['list'],
    ['./e2e/reporter/custom-reporter.js']
  ],
  
  /* グローバル設定 */
  use: {
    /* ベースURL */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    /* エビデンス収集 */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* タイムアウト */
    actionTimeout: 10000,
    navigationTimeout: 30000,
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
    },
    {
      name: 'authenticated',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json'
      },
    }
  ],

  /* ローカル開発サーバー */
  // webServer: process.env.CI ? undefined : {
  //   command: 'cd frontend/webapp && npm start',
  //   port: 3000,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});