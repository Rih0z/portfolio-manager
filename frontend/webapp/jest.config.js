/**
 * Jest設定ファイル
 * Vite環境用のスタンドアロン設定
 */

module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],

  // テストファイルのマッチング
  testMatch: [
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/__test__/**/*.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
  ],

  // モジュール解決
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // トランスフォーム設定
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)',
  ],

  // カバレッジ設定
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/index.jsx',
    '!src/reportWebVitals.js',
    '!**/node_modules/**',
  ],
  coverageReporters: [
    'json',
    'json-summary',
    'lcov',
    'text',
    'text-summary',
    'clover',
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 25,
      lines: 30,
      statements: 30,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '/test-results/',
    '/.jest-cache/',
  ],

  // レポーター
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
        suiteName: 'Portfolio Manager Tests',
        includeConsoleOutput: true,
        includeShortConsoleOutput: false,
        addFileAttribute: 'true',
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'ポートフォリオマネージャーテスト結果',
        outputPath: './test-results/test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        theme: 'darkTheme',
      },
    ],
    [
      '<rootDir>/custom-reporter.js',
      {
        outputDir: './test-results',
        generateVisualReport: true,
      },
    ],
  ],

  // タイムアウト
  testTimeout: 15000,

  // グローバル設定 (VITE_ env vars for compatibility)
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.VITE_MARKET_DATA_API_URL': 'https://api.example.com',
    'process.env.VITE_API_STAGE': 'test',
    'process.env.VITE_GOOGLE_CLIENT_ID': 'test-client-id',
    'process.env.VITE_DEFAULT_EXCHANGE_RATE': '150.0',
  },
};
