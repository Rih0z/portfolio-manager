/**
 * Playwright Google認証テスト用設定
 * 
 * Google OAuth2認証を含むE2Eテストの設定ファイル
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  
  // テストタイムアウト設定
  timeout: 60000, // Google認証は時間がかかる場合があるため60秒に設定
  expect: {
    timeout: 10000
  },
  
  // 並列実行の設定
  fullyParallel: false, // Google認証テストは並列実行を避ける
  workers: 1, // 1つのワーカーで順次実行
  
  // 失敗時の再試行
  retries: process.env.CI ? 2 : 1,
  
  // レポート設定
  reporter: [
    ['html', { outputFolder: 'playwright-report-google-auth' }],
    ['json', { outputFile: 'test-results/google-auth-results.json' }]
  ],
  
  // グローバル設定
  use: {
    // ベースURL
    baseURL: 'https://portfolio-wise.com',
    
    // トレース設定
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // ブラウザ設定
    viewport: { width: 1280, height: 720 },
    
    // ネットワーク設定
    extraHTTPHeaders: {
      'User-Agent': 'Playwright-Google-Auth-Test'
    }
  },
  
  // プロジェクト設定
  projects: [
    // セットアップ専用プロジェクト
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      use: {
        ...devices['Desktop Chrome'],
        // セットアップ時は長めのタイムアウト
        actionTimeout: 30000,
        navigationTimeout: 30000
      }
    },
    
    // 認証済みテスト
    {
      name: 'authenticated-tests',
      use: {
        ...devices['Desktop Chrome'],
        // 保存された認証状態を使用
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.js/
    },
    
    // モバイルテスト（認証済み）
    {
      name: 'mobile-authenticated',
      use: {
        ...devices['iPhone 13'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.js/
    },
    
    // 非認証テスト（ログインページなど）
    {
      name: 'unauthenticated-tests',
      use: {
        ...devices['Desktop Chrome']
      },
      testMatch: [
        'tests/auth/**/*.spec.js',
        'tests/public/**/*.spec.js'
      ]
    }
  ],
  
  // Webサーバー設定（ローカルテスト用）
  webServer: process.env.NODE_ENV === 'development' ? {
    command: 'npm start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    cwd: './frontend/webapp'
  } : undefined,
  
  // 出力ディレクトリ
  outputDir: 'test-results/google-auth',
  
  // 環境変数の設定例
  metadata: {
    testType: 'Google OAuth E2E',
    environment: process.env.NODE_ENV || 'production',
    description: 'Google認証フローのエンドツーエンドテスト'
  }
});

/**
 * 使用方法：
 * 
 * 1. 初回セットアップ（手動認証）:
 *    npx playwright test --config=playwright-google-auth.config.js --project=setup
 * 
 * 2. 認証済みテストの実行:
 *    npx playwright test --config=playwright-google-auth.config.js --project=authenticated-tests
 * 
 * 3. 全テストの実行:
 *    npx playwright test --config=playwright-google-auth.config.js
 * 
 * 4. 特定のテストファイルの実行:
 *    npx playwright test tests/google-auth.spec.js --config=playwright-google-auth.config.js
 * 
 * 5. デバッグモード:
 *    npx playwright test --config=playwright-google-auth.config.js --project=setup --debug
 */