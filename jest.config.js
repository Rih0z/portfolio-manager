module.exports = {
  // テスト環境
  testEnvironment: 'jsdom',
  
  // カバレッジの設定
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!**/node_modules/**'
  ],
  
  // カバレッジレポーターの設定
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'text-summary',
    'json-summary'
  ],
  
  // カバレッジのしきい値
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // テストファイルのパターン - 両方のパターンをサポート
  testMatch: [
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/__test__/**/*.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}'
  ],
  
  // 開始前に実行するファイル
  setupFiles: ['./jest.setup.js'],
  
  // テスト実行前後のグローバル設定
  setupFilesAfterEnv: ['./src/setupTests.js'],
  
  // テストタイムアウト設定
  testTimeout: 10000,
  
  // モジュール名のマッピング
  moduleNameMapper: {
    // スタイルとアセットのモック
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
    // パスエイリアス
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // レポーター設定
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporter', {
      pageTitle: 'ポートフォリオマネージャーテスト結果',
      outputPath: './test-results/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }],
    './custom-reporter.js'
  ]
};
