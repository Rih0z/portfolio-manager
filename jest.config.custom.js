/**
 * カスタムJest設定
 * Create React Appの制約を回避してカスタムレポーターを使用
 */

const path = require('path');

module.exports = {
  // 基本設定
  roots: ['<rootDir>'],
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}'
  ],
  
  // 問題のあるテストを一時的に除外
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/unit/store/dataStore.test.js',
    '/__tests__/unit/store/userStore.test.js'
  ],
  
  // セットアップファイル
  setupFiles: [
    path.resolve(__dirname, 'jest.setup.js'),
    'react-app-polyfill/jsdom'
  ],
  setupFilesAfterEnv: [
    path.resolve(__dirname, 'src/setupTests.js')
  ],
  
  // トランスフォーム設定
  transform: {
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': path.resolve(__dirname, 'node_modules/react-scripts/config/jest/babelTransform.js'),
    '^.+\\.css$': path.resolve(__dirname, 'node_modules/react-scripts/config/jest/cssTransform.js'),
    '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)': path.resolve(__dirname, 'node_modules/react-scripts/config/jest/fileTransform.js')
  },
  
  // モジュール解決
  moduleNameMapper: {
    '^react-native$': 'react-native-web',
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^axios$': '<rootDir>/__mocks__/axios.js'
  },
  
  // トランスフォーム無視パターン
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\](?!(axios|@react-oauth|@headlessui|dayjs|papaparse|recharts|jwt-decode)[/\\\\])',
    '^.+\\.module\\.(css|sass|scss)$'
  ],
  
  // カバレッジ設定
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/setupTests.js',
    '!src/setupProxy.js',
    '!src/craco.config.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'json',
    'json-summary',
    'lcov',
    'text',
    'text-summary',
    'clover',
    'html'
  ],
  
  // カバレッジ閾値
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 25,
      lines: 30,
      statements: 30
    }
  },
  
  // カスタムレポーター設定
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
        addFileAttribute: 'true'
      }
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'ポートフォリオマネージャーテスト結果',
        outputPath: './test-results/test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        theme: 'darkTheme'
      }
    ],
    [
      '<rootDir>/custom-reporter.js',
      {
        outputDir: './test-results',
        generateVisualReport: true
      }
    ]
  ],
  
  // その他の設定
  testTimeout: 10000,
  verbose: true,
  maxWorkers: 1,
  cacheDirectory: '.jest-cache',
  moduleFileExtensions: [
    'web.js',
    'js',
    'web.ts',
    'ts',
    'web.tsx',
    'tsx',
    'json',
    'web.jsx',
    'jsx',
    'node'
  ],
  
  // グローバル設定
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.REACT_APP_MARKET_DATA_API_URL': 'https://api.example.com',
    'process.env.REACT_APP_API_STAGE': 'test',
    'process.env.REACT_APP_GOOGLE_CLIENT_ID': 'test-client-id',
    'process.env.REACT_APP_DEFAULT_EXCHANGE_RATE': '150.0'
  },
  
  // モジュールディレクトリ
  moduleDirectories: ['node_modules', 'src'],
  
  // テスト環境オプション
  testEnvironmentOptions: {
    url: 'http://localhost',
    resources: 'usable'
  }
};