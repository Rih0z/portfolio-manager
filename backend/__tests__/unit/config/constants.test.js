/**
 * ファイルパス: __tests__/unit/config/constants.test.js
 *
 * constants モジュールの追加定数をテストする
 */

const constants = require('../../../src/config/constants');

describe('constants module', () => {
  test('DATA_SOURCES 定義を持つ', () => {
    expect(constants.DATA_SOURCES).toBeDefined();
    expect(constants.DATA_SOURCES.US_STOCK.DEFAULT_PRIORITY.length).toBeGreaterThan(0);
    expect(Array.isArray(constants.DATA_SOURCES.JP_STOCK.DEFAULT_PRIORITY)).toBe(true);
  });

  test('PREWARM_SYMBOLS 定義を持つ', () => {
    expect(constants.PREWARM_SYMBOLS).toBeDefined();
    expect(constants.PREWARM_SYMBOLS['us-stock']).toContain('AAPL');
    expect(constants.PREWARM_SYMBOLS['exchange-rate']).toContain('USD-JPY');
  });
});
