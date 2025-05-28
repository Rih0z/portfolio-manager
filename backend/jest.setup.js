/**
 * ファイルパス: jest.setup.js
 * 
 * Jest テスト開始前の基本環境設定
 * テスト実行に必要な環境変数のデフォルト値とモックの設定
 * 
 * 注: このファイルはjest.config.jsのsetupFilesで指定されており、
 * 各テストファイルが実行される前に一度だけロードされます
 * 
 * @file jest.setup.js
 * @author Portfolio Manager Team
 * @created 2025-05-18
 * @updated 2025-05-19 - 環境変数設定の最適化、コメント追加
 */

// テスト環境を設定 - 各テストで共通の環境変数のデフォルト値を設定
process.env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'test',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  DYNAMODB_TABLE_PREFIX: process.env.DYNAMODB_TABLE_PREFIX || 'test-portfolio-market-data-',
  SESSION_TABLE: process.env.SESSION_TABLE || 'test-portfolio-market-data-sessions',
  CACHE_TABLE: process.env.CACHE_TABLE || 'test-portfolio-market-data-cache',
  CORS_ALLOW_ORIGIN: process.env.CORS_ALLOW_ORIGIN || '*',
  
  // API設定
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'test-admin-api-key',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  
  // 使用量制限
  DAILY_REQUEST_LIMIT: process.env.DAILY_REQUEST_LIMIT || '100',
  MONTHLY_REQUEST_LIMIT: process.env.MONTHLY_REQUEST_LIMIT || '1000',
  DISABLE_ON_LIMIT: process.env.DISABLE_ON_LIMIT || 'true',
  
  // キャッシュ設定
  CACHE_TIME_US_STOCK: process.env.CACHE_TIME_US_STOCK || '3600',
  CACHE_TIME_JP_STOCK: process.env.CACHE_TIME_JP_STOCK || '3600',
  CACHE_TIME_MUTUAL_FUND: process.env.CACHE_TIME_MUTUAL_FUND || '10800',
  CACHE_TIME_EXCHANGE_RATE: process.env.CACHE_TIME_EXCHANGE_RATE || '21600',
  
  // 認証設定
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
  SESSION_EXPIRES_DAYS: process.env.SESSION_EXPIRES_DAYS || '7',
};

// DynamoDBモックを有効化
const mockDynamoDb = {
  get: jest.fn().mockImplementation(() => ({
    promise: jest.fn().mockResolvedValue({ Item: null })
  })),
  put: jest.fn().mockImplementation(() => ({
    promise: jest.fn().mockResolvedValue({})
  })),
  update: jest.fn().mockImplementation(() => ({
    promise: jest.fn().mockResolvedValue({ Attributes: { count: 1 } })
  })),
  delete: jest.fn().mockImplementation(() => ({
    promise: jest.fn().mockResolvedValue({})
  })),
  scan: jest.fn().mockImplementation(() => ({
    promise: jest.fn().mockResolvedValue({ Items: [] })
  })),
  query: jest.fn().mockImplementation(() => ({
    promise: jest.fn().mockResolvedValue({ Items: [] })
  }))
};

// グローバルDynamoDBモック
global.__AWS_MOCK__ = {
  dynamoDb: mockDynamoDb
};

// コンソール出力をモック化（静かなテスト実行のため）
global.originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// テスト中は警告・エラーのみ出力（CI環境では調整可能）
if (process.env.CI !== 'true' && process.env.DEBUG !== 'true') {
  console.log = jest.fn();
  console.info = jest.fn();
}

// 日付のモック
jest.spyOn(global.Date, 'now').mockImplementation(() => 1715900000000); // 2025-05-18T10:00:00.000Z

// テスト開始時のログ（デバッグに役立つ情報）
console.log('------------- テスト環境設定 -------------');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DYNAMODB_ENDPOINT:', process.env.DYNAMODB_ENDPOINT);
console.log('現在のテスト日時:', new Date(Date.now()).toISOString());
console.log('-----------------------------------------');
