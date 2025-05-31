/**
 * ファイルパス: jest.config.js
 * 
 * Jest テスト設定ファイル
 * テスト全体の設定・構成を管理する中心ファイル
 * 
 * 依存関係:
 * - setupFiles: './jest.setup.js' - 基本環境変数とモックの設定
 * - setupFilesAfterEnv: './__tests__/setup.js' - テスト実行前後の共通処理
 * - reporters: 'custom-reporter.js' - カスタムレポート生成
 * 
 * @file jest.config.js
 * @author Portfolio Manager Team
 * @created 2025-05-18
 * @updated 2025-05-19 - 設定の最適化と依存関係の明確化
 * @updated 2025-05-20 - カバレッジレポータ設定の追加
 */

module.exports = {
  // テスト環境
  testEnvironment: 'node',
  
  // カバレッジの設定
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**',
    '!src/middleware/security.js',
    '!src/utils/auditLogger.js',
    '!src/utils/secureAuth.js',
    '!src/utils/secretsManager.js',
    '!src/services/matrics.js' // 一時的に除外（AWS SDK v3移行のため）
  ],
  
  // カバレッジレポーターの設定 - 複数の形式を同時に出力
  coverageReporters: [
    'json',         // 詳細なJSONフォーマット
    'lcov',         // HTML形式（ブラウザで表示）
    'text',         // コンソール出力用
    'text-summary', // コンソール出力サマリー
    'json-summary'  // 簡易JSON形式
  ],
  
  // カバレッジのしきい値 - 開発中はしきい値を適切な値に設定
  // カバレッジ目標はCOVERAGE_TARGET環境変数で動的に変更可能（initial/mid/final）
  coverageThreshold: {
    global: {
      branches: 70,     // 変更前: 0
      functions: 80,    // 変更前: 0
      lines: 80,        // 変更前: 0
      statements: 80    // 変更前: 0
    },
    'src/utils/*.js': {
      branches: 80,    // 変更前: 0
      functions: 90,   // 変更前: 0
      lines: 90        // 変更前: 0
    },
    'src/services/*.js': {
      branches: 75,    // 変更前: 0
      functions: 85,   // 変更前: 0
      lines: 85        // 変更前: 0
    }
  },
  
  // テストファイルのパターン
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // 開始前に実行するファイル - 環境変数やモックの基本設定
  setupFiles: ['./jest.setup.js'],
  
  // テスト実行前後のグローバル設定
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  
  // テストタイムアウト設定
  testTimeout: 10000,
  
  // モック設定
  moduleNameMapper: {
    '^axios$': '<rootDir>/__mocks__/axios.js'
  },
  
  // 並列実行設定
  maxWorkers: '50%',
  
  // テストの詳細レポート
  verbose: true,
  
  // レポート形式
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporter', {
      pageTitle: 'Portfolio Market Data API テスト結果',
      outputPath: './test-results/test-report.html',
      includeFailureMsg: true
    }],
    ['<rootDir>/__tests__/testUtils/custom-reporter.js', {}]
  ],
  
  // 特定のテストフォルダーの優先度設定
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/__tests__/unit/**/*.js'],
      testPathIgnorePatterns: ['/node_modules/']
    },
    {
      displayName: 'integration',
      testMatch: ['**/__tests__/integration/**/*.js'],
      testPathIgnorePatterns: ['/node_modules/']
    },
    {
      displayName: 'e2e',
      testMatch: ['**/__tests__/e2e/**/*.js'],
      testPathIgnorePatterns: ['/node_modules/']
    }
  ],
  
  // キャッシュ設定
  cacheDirectory: './.jest-cache',
  
  // エラー表示設定
  errorOnDeprecated: true,
  
  // テスト終了後に強制終了（CI環境用）
  forceExit: true
};
