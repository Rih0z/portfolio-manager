/**
 * configManager.jsのシンプルテスト
 * 環境変数からアプリケーション設定を読み込むユーティリティのテスト
 */
'use strict';

// モジュールキャッシュをクリアしてから要求
delete require.cache[require.resolve('../../../src/utils/configManager')];

describe('configManager - Simple Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // configManagerのキャッシュをクリア
    delete require.cache[require.resolve('../../../src/utils/configManager')];
    
    // NODE_ENVをクリア
    delete process.env.NODE_ENV;
    delete process.env.APP_NAME;
    delete process.env.AWS_REGION;
    delete process.env.LOG_LEVEL;
    delete process.env.SECRET_KEY;
    delete process.env.ADMIN_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('loadConfig関数が存在する', () => {
    const { loadConfig } = require('../../../src/utils/configManager');
    expect(typeof loadConfig).toBe('function');
  });

  test('getConfig関数が存在する', () => {
    const { getConfig } = require('../../../src/utils/configManager');
    expect(typeof getConfig).toBe('function');
  });

  test('sanitizeConfig関数が存在する', () => {
    const { sanitizeConfig } = require('../../../src/utils/configManager');
    expect(typeof sanitizeConfig).toBe('function');
  });

  test('loadConfigでデフォルト設定が読み込まれる', () => {
    const { loadConfig } = require('../../../src/utils/configManager');
    const config = loadConfig();

    expect(config).toHaveProperty('APP_NAME', 'PortfolioMarketDataAPI');
    expect(config).toHaveProperty('REGION', 'ap-northeast-1');
    expect(config).toHaveProperty('NODE_ENV', 'development');
    expect(config).toHaveProperty('LOG_LEVEL', 'debug');
  });

  test('getConfigでキー指定して値を取得', () => {
    const { getConfig } = require('../../../src/utils/configManager');
    
    expect(getConfig('APP_NAME')).toBe('PortfolioMarketDataAPI');
    expect(getConfig('NODE_ENV')).toBe('development');
  });

  test('getConfigで全設定を取得', () => {
    const { getConfig } = require('../../../src/utils/configManager');
    const config = getConfig();

    expect(config).toHaveProperty('APP_NAME');
    expect(config).toHaveProperty('REGION');
    expect(config).toHaveProperty('NODE_ENV');
    expect(config).toHaveProperty('LOG_LEVEL');
  });

  test('sanitizeConfigで機密情報をマスク', () => {
    const { sanitizeConfig } = require('../../../src/utils/configManager');
    
    const testConfig = {
      APP_NAME: 'TestApp',
      SECRET_KEY: 'secret123',
      ADMIN_API_KEY: 'admin456',
      LOG_LEVEL: 'info'
    };

    const sanitized = sanitizeConfig(testConfig);

    expect(sanitized.APP_NAME).toBe('TestApp');
    expect(sanitized.SECRET_KEY).toBe('***');
    expect(sanitized.ADMIN_API_KEY).toBe('***');
    expect(sanitized.LOG_LEVEL).toBe('info');
  });

  test('production環境設定', () => {
    process.env.NODE_ENV = 'production';
    delete require.cache[require.resolve('../../../src/utils/configManager')];
    
    const { loadConfig } = require('../../../src/utils/configManager');
    const config = loadConfig();

    expect(config.NODE_ENV).toBe('production');
    expect(config.LOG_LEVEL).toBe('warn');
  });

  test('test環境設定', () => {
    process.env.NODE_ENV = 'test';
    delete require.cache[require.resolve('../../../src/utils/configManager')];
    
    const { loadConfig } = require('../../../src/utils/configManager');
    const config = loadConfig();

    expect(config.NODE_ENV).toBe('test');
    expect(config.LOG_LEVEL).toBe('debug');
  });

  test('カスタム環境変数の反映', () => {
    process.env.APP_NAME = 'CustomApp';
    process.env.AWS_REGION = 'us-east-1';
    process.env.LOG_LEVEL = 'error';
    delete require.cache[require.resolve('../../../src/utils/configManager')];
    
    const { loadConfig } = require('../../../src/utils/configManager');
    const config = loadConfig();

    expect(config.APP_NAME).toBe('CustomApp');
    expect(config.REGION).toBe('us-east-1');
    expect(config.LOG_LEVEL).toBe('error');
  });

  test('空の機密情報はマスクしない', () => {
    const { sanitizeConfig } = require('../../../src/utils/configManager');
    
    const testConfig = {
      SECRET_KEY: '',
      ADMIN_API_KEY: '',
      APP_NAME: 'TestApp'
    };

    const sanitized = sanitizeConfig(testConfig);

    expect(sanitized.SECRET_KEY).toBe('');
    expect(sanitized.ADMIN_API_KEY).toBe('');
    expect(sanitized.APP_NAME).toBe('TestApp');
  });
});