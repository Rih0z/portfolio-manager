/**
 * ファイルパス: __tests__/unit/config/envConfig.additional.test.js
 *
 * envConfigユーティリティの追加テスト
 */

const originalEnv = process.env;

describe('envConfig additional cases', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('getStringEnv returns provided value or default', () => {
    process.env.TEST_STRING = 'hello';
    const { getStringEnv } = require('../../../src/config/envConfig');
    expect(getStringEnv('TEST_STRING', 'default')).toBe('hello');

    delete process.env.TEST_STRING;
    jest.resetModules();
    const reload = require('../../../src/config/envConfig');
    expect(reload.getStringEnv('TEST_STRING', 'default')).toBe('default');
  });

  test('getBooleanEnv returns default when not set', () => {
    const { getBooleanEnv } = require('../../../src/config/envConfig');
    expect(getBooleanEnv('UNDEFINED_BOOL', true)).toBe(true);
  });

  test('getArrayEnv allows custom separator', () => {
    process.env.LIST = 'a|b|c';
    const { getArrayEnv } = require('../../../src/config/envConfig');
    expect(getArrayEnv('LIST', [], '|')).toEqual(['a', 'b', 'c']);
  });

  test('getJsonEnv parses valid JSON', () => {
    process.env.JSON_VAL = '{"key":1}';
    const { getJsonEnv } = require('../../../src/config/envConfig');
    expect(getJsonEnv('JSON_VAL')).toEqual({ key: 1 });
  });
});
