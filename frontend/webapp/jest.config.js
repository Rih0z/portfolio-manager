/**
 * Jest設定ファイル
 * Create React Appのデフォルト設定を拡張
 */

module.exports = {
  // CRAのデフォルト設定を継承
  ...require('react-scripts/scripts/utils/createJestConfig')(
    p => require.resolve(p),
    __dirname,
    false
  ),

  // カスタムレポーター設定
  reporters: [
    "default",
    [
      "jest-junit",
      {
        "outputDirectory": "./test-results",
        "outputName": "junit.xml",
        "suiteName": "Portfolio Manager Tests",
        "includeConsoleOutput": true,
        "includeShortConsoleOutput": false,
        "addFileAttribute": "true"
      }
    ],
    [
      "jest-html-reporter",
      {
        "pageTitle": "ポートフォリオマネージャーテスト結果",
        "outputPath": "./test-results/test-report.html",
        "includeFailureMsg": true,
        "includeSuiteFailure": true,
        "includeConsoleLog": true,
        "theme": "darkTheme"
      }
    ],
    [
      "<rootDir>/custom-reporter.js",
      {
        "outputDir": "./test-results",
        "generateVisualReport": true
      }
    ]
  ],
  
  // テスト環境設定
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  
  // タイムアウト設定
  testTimeout: 15000,
  
  // カバレッジ設定
  collectCoverage: true,
  coverageDirectory: 'coverage',
  
  // axiosのESMサポート
  transformIgnorePatterns: [
    "node_modules/(?!(axios)/)"
  ],
  
  // グローバル設定
  globals: {
    "process.env.NODE_ENV": "test",
    "process.env.REACT_APP_MARKET_DATA_API_URL": "https://api.example.com",
    "process.env.REACT_APP_API_STAGE": "test",
    "process.env.REACT_APP_GOOGLE_CLIENT_ID": "test-client-id",
    "process.env.REACT_APP_DEFAULT_EXCHANGE_RATE": "150.0"
  }
};