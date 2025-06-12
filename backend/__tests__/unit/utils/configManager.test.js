/**
 * configManager.jsのテスト
 * 環境変数からアプリケーション設定を読み込み、デフォルト値や環境固有の設定を適用するユーティリティのテスト
 */
'use strict';

const { loadConfig, getConfig, sanitizeConfig } = require('../../../src/utils/configManager');

describe('configManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をリセット
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // モジュールキャッシュをクリア
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

  describe('loadConfig', () => {
    test('デフォルト設定（development環境）で正しく設定が読み込まれる', () => {
      const config = loadConfig();

      expect(config).toEqual({
        APP_NAME: 'PortfolioMarketDataAPI',
        REGION: 'ap-northeast-1',
        LOG_LEVEL: 'debug', // development環境のデフォルト
        NODE_ENV: 'development',
        SECRET_KEY: '',
        ADMIN_API_KEY: ''
      });
    });

    test('production環境で正しく設定が読み込まれる', () => {
      process.env.NODE_ENV = 'production';

      const config = loadConfig();

      expect(config).toEqual({
        APP_NAME: 'PortfolioMarketDataAPI',
        REGION: 'ap-northeast-1',
        LOG_LEVEL: 'warn', // production環境のデフォルト
        NODE_ENV: 'production',
        SECRET_KEY: '',
        ADMIN_API_KEY: ''
      });
    });

    test('test環境で正しく設定が読み込まれる', () => {
      process.env.NODE_ENV = 'test';

      const config = loadConfig();

      expect(config).toEqual({
        APP_NAME: 'PortfolioMarketDataAPI',
        REGION: 'ap-northeast-1',
        LOG_LEVEL: 'debug', // test環境のデフォルト
        NODE_ENV: 'test',
        SECRET_KEY: '',
        ADMIN_API_KEY: ''
      });
    });

    test('環境変数が設定されている場合はそれを使用する', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_NAME = 'CustomAppName';
      process.env.AWS_REGION = 'us-east-1';
      process.env.LOG_LEVEL = 'error';
      process.env.SECRET_KEY = 'secret123';
      process.env.ADMIN_API_KEY = 'admin456';

      const config = loadConfig();

      expect(config).toEqual({
        APP_NAME: 'CustomAppName',
        REGION: 'us-east-1',
        LOG_LEVEL: 'error',
        NODE_ENV: 'production',
        SECRET_KEY: 'secret123',
        ADMIN_API_KEY: 'admin456'
      });
    });

    test('未知の環境（staging等）ではデフォルトのLOG_LEVELを使用する', () => {
      process.env.NODE_ENV = 'staging';

      const config = loadConfig();

      expect(config.LOG_LEVEL).toBe('info'); // デフォルトのLOG_LEVEL
      expect(config.NODE_ENV).toBe('staging');
    });

    test('空文字の環境変数はデフォルト値を使用する', () => {
      process.env.APP_NAME = '';
      process.env.AWS_REGION = '';
      process.env.LOG_LEVEL = '';

      const config = loadConfig();

      expect(config.APP_NAME).toBe('PortfolioMarketDataAPI');
      expect(config.REGION).toBe('ap-northeast-1');
      expect(config.LOG_LEVEL).toBe('debug'); // development環境のデフォルト
    });
  });

  describe('getConfig', () => {
    test('キーを指定せずに呼び出すと完全な設定オブジェクトを返す（機密情報は除く）', () => {
      process.env.SECRET_KEY = 'secret123';
      process.env.ADMIN_API_KEY = 'admin456';

      const config = getConfig();

      expect(config).toEqual({
        APP_NAME: 'PortfolioMarketDataAPI',
        REGION: 'ap-northeast-1',
        LOG_LEVEL: 'debug',
        NODE_ENV: 'development',
        SECRET_KEY: '***', // マスクされている
        ADMIN_API_KEY: '***' // マスクされている
      });
    });

    test('特定のキーを指定すると該当する値を返す', () => {
      process.env.APP_NAME = 'TestApp';
      process.env.SECRET_KEY = 'secret123';

      expect(getConfig('APP_NAME')).toBe('TestApp');
      expect(getConfig('SECRET_KEY')).toBe('secret123'); // 機密情報もそのまま返す
      expect(getConfig('NODE_ENV')).toBe('development');
    });

    test('存在しないキーを指定するとundefinedを返す', () => {
      expect(getConfig('NON_EXISTENT_KEY')).toBeUndefined();
    });

    test('設定が未読み込みの場合は自動的に読み込む', () => {
      // configManagerを再読み込み
      jest.resetModules();
      const { getConfig: freshGetConfig } = require('../../../src/utils/configManager');

      process.env.NODE_ENV = 'test';
      const result = freshGetConfig('NODE_ENV');

      expect(result).toBe('test');
    });

    test('複数回呼び出しても設定が保持される', () => {
      process.env.APP_NAME = 'PersistentApp';

      const config1 = getConfig('APP_NAME');
      const config2 = getConfig('APP_NAME');

      expect(config1).toBe('PersistentApp');
      expect(config2).toBe('PersistentApp');
      expect(config1).toBe(config2);
    });
  });

  describe('sanitizeConfig', () => {
    test('機密情報キーをマスクする', () => {
      const config = {
        APP_NAME: 'TestApp',
        SECRET_KEY: 'secret123',
        ADMIN_API_KEY: 'admin456',
        LOG_LEVEL: 'info'
      };

      const sanitized = sanitizeConfig(config);

      expect(sanitized).toEqual({
        APP_NAME: 'TestApp',
        SECRET_KEY: '***',
        ADMIN_API_KEY: '***',
        LOG_LEVEL: 'info'
      });
    });

    test('機密情報キーが空文字の場合はマスクしない', () => {
      const config = {
        APP_NAME: 'TestApp',
        SECRET_KEY: '',
        ADMIN_API_KEY: '',
        LOG_LEVEL: 'info'
      };

      const sanitized = sanitizeConfig(config);

      expect(sanitized).toEqual({
        APP_NAME: 'TestApp',
        SECRET_KEY: '',
        ADMIN_API_KEY: '',
        LOG_LEVEL: 'info'
      });
    });

    test('機密情報キーがない場合は何もしない', () => {
      const config = {
        APP_NAME: 'TestApp',
        LOG_LEVEL: 'info'
      };

      const sanitized = sanitizeConfig(config);

      expect(sanitized).toEqual({
        APP_NAME: 'TestApp',
        LOG_LEVEL: 'info'
      });
    });

    test('元のオブジェクトを変更しない（イミュータブル）', () => {
      const config = {
        SECRET_KEY: 'secret123',
        ADMIN_API_KEY: 'admin456'
      };

      const sanitized = sanitizeConfig(config);

      // 元のオブジェクトは変更されない
      expect(config.SECRET_KEY).toBe('secret123');
      expect(config.ADMIN_API_KEY).toBe('admin456');

      // 新しいオブジェクトはマスクされている
      expect(sanitized.SECRET_KEY).toBe('***');
      expect(sanitized.ADMIN_API_KEY).toBe('***');
    });

    test('未定義の機密情報キーがある場合でもエラーにならない', () => {
      const config = {
        APP_NAME: 'TestApp',
        SECRET_KEY: undefined,
        ADMIN_API_KEY: null
      };

      expect(() => sanitizeConfig(config)).not.toThrow();

      const sanitized = sanitizeConfig(config);
      expect(sanitized.SECRET_KEY).toBeUndefined();
      expect(sanitized.ADMIN_API_KEY).toBeNull();
    });
  });

  describe('複合テスト', () => {
    test('実際のワークフロー：設定読み込み→取得→サニタイズ', () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_KEY = 'production-secret';
      process.env.ADMIN_API_KEY = 'admin-key-123';

      // 設定を読み込み
      const loadedConfig = loadConfig();
      expect(loadedConfig.SECRET_KEY).toBe('production-secret');

      // 特定のキーを取得
      const secretKey = getConfig('SECRET_KEY');
      expect(secretKey).toBe('production-secret');

      // 全体設定を取得（自動的にサニタイズされる）
      const allConfig = getConfig();
      expect(allConfig.SECRET_KEY).toBe('***');
      expect(allConfig.ADMIN_API_KEY).toBe('***');
      expect(allConfig.NODE_ENV).toBe('production');
    });
  });
});