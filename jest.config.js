/**
 * ファイルパス: jest.config.js
 * 
 * Jest テスト設定ファイル
 * テスト全体の設定・構成を管理する中心ファイル
 */

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
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // テストファイルのパターン
  testMatch: [
    '**/__test__/**/*.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}'
  ],
  
  // 開始前に実行するファイル
  setupFiles: ['./jest.setup.js'],
  
  // テスト実行前後のグローバル設定
  setupFilesAfterEnv: ['./__test__/setup.js'],
  
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

  // ト
