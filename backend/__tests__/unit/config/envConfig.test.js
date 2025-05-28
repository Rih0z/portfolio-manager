/**
 * ファイルパス: __tests__/unit/config/envConfig.test.js
 *
 * envConfigモジュールのユニットテスト
 * 環境変数取得ユーティリティの挙動を検証する
 */

const originalEnv = process.env;

describe('envConfig utility', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv }; // reset
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('getNumberEnv returns numeric value and default', () => {
    process.env.TEST_NUM = '42';
    const { getNumberEnv } = require('../../../src/config/envConfig');
    expect(getNumberEnv('TEST_NUM', 5)).toBe(42);
    delete process.env.TEST_NUM;
    jest.resetModules();
    const reload = require('../../../src/config/envConfig');
    expect(reload.getNumberEnv('TEST_NUM', 5)).toBe(5);
  });

  test('getBooleanEnv parses true like values', () => {
    process.env.FLAG = 'Yes';
    const { getBooleanEnv } = require('../../../src/config/envConfig');
    expect(getBooleanEnv('FLAG', false)).toBe(true);
  });

  test('getArrayEnv splits values', () => {
    process.env.LIST = 'a,b , c';
    const { getArrayEnv } = require('../../../src/config/envConfig');
    expect(getArrayEnv('LIST')).toEqual(['a', 'b', 'c']);
  });

  test('getJsonEnv returns default on invalid JSON', () => {
    process.env.JSON_VAL = '{invalid}';
    const { getJsonEnv } = require('../../../src/config/envConfig');
    expect(getJsonEnv('JSON_VAL', { test: true })).toEqual({ test: true });
  });

  test('isDevelopment flag depends on NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    let cfg = require('../../../src/config/envConfig');
    expect(cfg.isDevelopment).toBe(false);
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    cfg = require('../../../src/config/envConfig');
    expect(cfg.isDevelopment).toBe(true);
  });
});
