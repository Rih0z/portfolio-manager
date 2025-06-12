/**
 * deprecation.jsのテスト
 * 非推奨機能に関するユーティリティのテスト
 */
'use strict';

const { warnDeprecation } = require('../../../src/utils/deprecation');
const logger = require('../../../src/utils/logger');

// モックの設定
jest.mock('../../../src/utils/logger');

describe('deprecation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('warnDeprecation', () => {
    test('基本的な非推奨警告を出力する', () => {
      const result = warnDeprecation('oldFunction', 'newFunction');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("DEPRECATED: 'oldFunction' は非推奨です（v2.0.0から）。代わりに 'newFunction' を使用してください。この機能は v3.0.0 で削除される予定です。")
      );
      expect(result).toContain('oldFunction');
      expect(result).toContain('newFunction');
      expect(result).toContain('v2.0.0');
      expect(result).toContain('v3.0.0');
    });

    test('カスタムバージョン情報を使用した警告を出力する', () => {
      const options = {
        version: '1.5.0',
        removalVersion: '2.5.0'
      };

      const result = warnDeprecation('oldApi', 'newApi', options);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("DEPRECATED: 'oldApi' は非推奨です（v1.5.0から）。代わりに 'newApi' を使用してください。この機能は v2.5.0 で削除される予定です。")
      );
      expect(result).toContain('v1.5.0');
      expect(result).toContain('v2.5.0');
    });

    test('throwErrorオプションがfalseの場合はエラーをスローしない', () => {
      expect(() => {
        warnDeprecation('oldMethod', 'newMethod', { throwError: false });
      }).not.toThrow();

      expect(logger.warn).toHaveBeenCalled();
    });

    test('throwErrorオプションがtrueの場合はエラーをスローする', () => {
      expect(() => {
        warnDeprecation('oldMethod', 'newMethod', { throwError: true });
      }).toThrow('DEPRECATED: \'oldMethod\' は非推奨です（v2.0.0から）。代わりに \'newMethod\' を使用してください。この機能は v3.0.0 で削除される予定です。');

      expect(logger.warn).toHaveBeenCalled();
    });

    test('空のオプションオブジェクトでもデフォルト値を使用する', () => {
      const result = warnDeprecation('testFunction', 'betterFunction', {});

      expect(result).toContain('v2.0.0');
      expect(result).toContain('v3.0.0');
      expect(logger.warn).toHaveBeenCalled();
    });

    test('部分的なオプションでもデフォルト値で補完する', () => {
      const options = { version: '1.2.3' };
      const result = warnDeprecation('partialOptions', 'fullOptions', options);

      expect(result).toContain('v1.2.3');
      expect(result).toContain('v3.0.0'); // デフォルトのremovalVersion
      expect(logger.warn).toHaveBeenCalled();
    });

    test('スタックトレース情報が含まれる', () => {
      warnDeprecation('stackTest', 'newStackTest');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('呼び出し元:')
      );
    });

    test('メッセージの返り値を確認する', () => {
      const deprecatedName = 'oldFeature';
      const alternative = 'newFeature';
      const options = { version: '1.0.0', removalVersion: '2.0.0' };

      const result = warnDeprecation(deprecatedName, alternative, options);

      expect(result).toBe(
        "DEPRECATED: 'oldFeature' は非推奨です（v1.0.0から）。代わりに 'newFeature' を使用してください。この機能は v2.0.0 で削除される予定です。"
      );
    });

    test('特殊文字を含む名前でも正しく処理する', () => {
      const result = warnDeprecation('old-function_v2', 'new.function.v3');

      expect(result).toContain('old-function_v2');
      expect(result).toContain('new.function.v3');
      expect(logger.warn).toHaveBeenCalled();
    });

    test('日本語を含む名前でも正しく処理する', () => {
      const result = warnDeprecation('古い関数', '新しい関数');

      expect(result).toContain('古い関数');
      expect(result).toContain('新しい関数');
      expect(logger.warn).toHaveBeenCalled();
    });

    test('nullやundefined値に対しても安全に処理する', () => {
      // null値でもエラーにならないことを確認
      expect(() => {
        warnDeprecation(null, 'replacement');
      }).not.toThrow();

      expect(() => {
        warnDeprecation('deprecated', null);
      }).not.toThrow();

      expect(logger.warn).toHaveBeenCalledTimes(2);
    });
  });
});