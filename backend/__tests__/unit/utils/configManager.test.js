/**
 * ファイルパス: __tests__/unit/utils/configManager.test.js
 *
 * 設定管理ユーティリティのユニットテスト
 * 環境変数読み込み、デフォルト値、環境別設定、機密情報マスクをテスト
 */

const configManager = require('../../../src/utils/configManager');

describe('configManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.LOG_LEVEL;
    delete process.env.SECRET_KEY;
    delete process.env.ADMIN_API_KEY;
    delete process.env.APP_NAME;
    delete process.env.AWS_REGION;
    delete process.env.NODE_ENV;


  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('環境変数から設定値を正しく読み込む', () => {
    process.env.APP_NAME = 'TestApp';
    process.env.AWS_REGION = 'us-east-1';
    process.env.LOG_LEVEL = 'warn';
    const cfg = configManager.loadConfig();

    expect(cfg.APP_NAME).toBe('TestApp');
    expect(cfg.REGION).toBe('us-east-1');
    expect(cfg.LOG_LEVEL).toBe('warn');
  });

  test('デフォルト値が適用される', () => {
    const cfg = configManager.loadConfig();

    expect(cfg.APP_NAME).toBe('PortfolioMarketDataAPI');
    expect(cfg.REGION).toBe('ap-northeast-1');
    expect(cfg.LOG_LEVEL).toBe('debug');
  });

  test('環境に応じた設定値が適用される', () => {
    process.env.NODE_ENV = 'production';
    const cfg = configManager.loadConfig();

    expect(cfg.LOG_LEVEL).toBe('warn');
  });

  test('機密情報が適切に処理される', () => {
    process.env.SECRET_KEY = 'secret';
    process.env.ADMIN_API_KEY = 'apikey';
    configManager.loadConfig();
    const sanitized = configManager.getConfig();

    expect(sanitized.SECRET_KEY).toBe('***');
    expect(sanitized.ADMIN_API_KEY).toBe('***');
  });
});
