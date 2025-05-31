/**
 * ファイルパス: __tests__/unit/utils/deprecation.test.js
 *
 * deprecationユーティリティ warnDeprecation のテスト
 */

const { warnDeprecation } = require('../../../src/utils/deprecation');
const logger = require('../../../src/utils/logger');

jest.mock('../../../src/utils/logger');

describe('warnDeprecation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('デフォルト設定で警告メッセージを返しログに出力する', () => {
    const message = warnDeprecation('oldFeature', 'newFeature');

    expect(message).toContain("oldFeature");
    expect(message).toContain("newFeature");
    // デフォルトバージョン
    expect(message).toContain('v2.0.0');
    expect(message).toContain('v3.0.0');

    // logger.warn が呼び出され、スタック情報が含まれる
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(message));
    expect(logger.warn.mock.calls[0][0]).toMatch(/呼び出し元:/);
  });

  test('オプションでバージョン指定が可能', () => {
    const message = warnDeprecation('old', 'new', { version: '1.1', removalVersion: '2.0' });
    expect(message).toContain('v1.1');
    expect(message).toContain('v2.0');
  });

  test('throwError オプションで例外を投げる', () => {
    expect(() => {
      warnDeprecation('legacy', 'modern', { throwError: true });
    }).toThrow(/DEPRECATED/);
    expect(logger.warn).toHaveBeenCalled();
  });
});
