import { vi } from "vitest";
/**
 * fixExchangeRate.js のユニットテスト
 * 為替レート修復ユーティリティのテスト
 */

// loggerモジュールのモック
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));
vi.mock('../../../utils/logger', () => ({ default: mockLogger }));

// exchangeRateDebounceをモック
vi.mock('../../../utils/exchangeRateDebounce', () => ({
  clearExchangeRateCache: vi.fn()
}));

import { clearExchangeRateCache } from '../../../utils/exchangeRateDebounce';
import { fixExchangeRate } from '../../../utils/fixExchangeRate';

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Date.toISOStringのモック
const mockISOString = '2023-05-01T12:00:00.000Z';

describe('fixExchangeRate', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let originalDateToISOString;

  beforeEach(() => {
    // モックをクリア
    vi.resetAllMocks();

    // コンソールメソッドをモック（resetAllMocks の後）
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Date.prototype.toISOString をモック
    originalDateToISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = vi.fn(() => mockISOString);
  });

  afterEach(() => {
    // Date.prototype.toISOString を復元
    Date.prototype.toISOString = originalDateToISOString;

    // コンソールモックを復元
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('モジュール初期化', () => {
    it('windowオブジェクトにfixExchangeRate関数を追加する', () => {
      expect(window.fixExchangeRate).toBe(fixExchangeRate);
      expect(typeof window.fixExchangeRate).toBe('function');
    });

    it('エクスポートされた関数が利用可能', () => {
      expect(fixExchangeRate).toBeDefined();
      expect(typeof fixExchangeRate).toBe('function');
    });
  });

  describe('fixExchangeRate関数の動作', () => {
    describe('正常なケース', () => {
      it('ポートフォリオデータが存在しない場合', () => {
        localStorageMock.getItem.mockReturnValue(null);

        const result = fixExchangeRate();

        expect(result).toBe(true);
        expect(clearExchangeRateCache).toHaveBeenCalledTimes(1);
        expect(mockLogger.log).toHaveBeenCalledWith('=== 為替レート修復を開始します ===');
        expect(mockLogger.log).toHaveBeenCalledWith('=== 修復処理が完了しました ===');
      });

      it('正常な為替レートが存在する場合', () => {
        const validData = {
          exchangeRate: {
            rate: 140.5,
            lastUpdated: '2023-05-01T10:00:00.000Z',
            isDefault: false,
            source: 'api'
          }
        };
        const encodedData = btoa(JSON.stringify(validData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        const result = fixExchangeRate();

        expect(result).toBe(true);
        expect(mockLogger.log).toHaveBeenCalledWith('為替レートは正常です。');
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });

      it('不正な為替レート（nullまたはundefined）を修正する', () => {
        const invalidData = {
          exchangeRate: {
            rate: null,
            lastUpdated: '2023-05-01T10:00:00.000Z'
          }
        };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        const result = fixExchangeRate();

        expect(result).toBe(true);
        expect(mockLogger.log).toHaveBeenCalledWith('不正な為替レートを検出しました。修正します。');
        expect(mockLogger.log).toHaveBeenCalledWith('為替レートを修正しました。');

        // 修正されたデータが保存される
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'portfolioData',
          expect.any(String)
        );
      });

      it('不正な為替レート（文字列）を修正する', () => {
        const invalidData = {
          exchangeRate: {
            rate: 'invalid-rate',
            lastUpdated: '2023-05-01T10:00:00.000Z'
          }
        };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        const result = fixExchangeRate();

        expect(result).toBe(true);
        expect(mockLogger.log).toHaveBeenCalledWith('不正な為替レートを検出しました。修正します。');
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });

      it('exchangeRateプロパティが存在しない場合にデフォルト値を設定する', () => {
        const dataWithoutExchangeRate = {
          holdings: [],
          lastUpdated: '2023-05-01T10:00:00.000Z'
        };
        const encodedData = btoa(JSON.stringify(dataWithoutExchangeRate));
        localStorageMock.getItem.mockReturnValue(encodedData);

        const result = fixExchangeRate();

        expect(result).toBe(true);
        expect(mockLogger.log).toHaveBeenCalledWith('為替レートデータが存在しません。デフォルト値を設定します。');

        // 修正されたデータの確認
        const setItemCall = localStorageMock.setItem.mock.calls[0];
        const savedData = JSON.parse(atob(setItemCall[1]));

        expect(savedData.exchangeRate).toEqual({
          rate: 150.0,
          lastUpdated: mockISOString,
          isDefault: true,
          source: 'fix-utility'
        });
      });

      it('修正処理の完全なログフローを確認する', () => {
        const invalidData = { exchangeRate: { rate: undefined } };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        fixExchangeRate();

        expect(mockLogger.log).toHaveBeenCalledWith('=== 為替レート修復を開始します ===');
        expect(mockLogger.log).toHaveBeenCalledWith('1. 為替レートキャッシュをクリア中...');
        expect(mockLogger.log).toHaveBeenCalledWith('2. ポートフォリオデータを確認中...');
        expect(mockLogger.log).toHaveBeenCalledWith('3. 修復完了！ページをリロードしてください。');
        expect(mockLogger.log).toHaveBeenCalledWith('=== 修復処理が完了しました ===');
      });
    });

    describe('エラーハンドリング', () => {
      it('不正なBase64データの場合にエラーログを表示する', () => {
        localStorageMock.getItem.mockReturnValue('invalid-base64-data');

        const result = fixExchangeRate();

        expect(result).toBe(true); // 全体の処理は成功
        expect(mockLogger.error).toHaveBeenCalledWith(
          'ポートフォリオデータの解析に失敗しました:',
          expect.objectContaining({})
        );
      });

      it('不正なJSONデータの場合にエラーログを表示する', () => {
        const invalidJson = btoa('{"invalid": json}');
        localStorageMock.getItem.mockReturnValue(invalidJson);

        const result = fixExchangeRate();

        expect(result).toBe(true);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'ポートフォリオデータの解析に失敗しました:',
          expect.objectContaining({})
        );
      });

      it('localStorageでエラーが発生した場合', () => {
        localStorageMock.getItem.mockImplementation(() => {
          throw new Error('localStorage error');
        });

        const result = fixExchangeRate();

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          '修復中にエラーが発生しました:',
          expect.objectContaining({})
        );
      });

      it('clearExchangeRateCacheでエラーが発生した場合', () => {
        clearExchangeRateCache.mockImplementation(() => {
          throw new Error('Cache clear error');
        });

        const result = fixExchangeRate();

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          '修復中にエラーが発生しました:',
          expect.objectContaining({})
        );
      });

      it('データ保存でエラーが発生した場合', () => {
        const invalidData = { exchangeRate: { rate: null } };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);
        localStorageMock.setItem.mockImplementation(() => {
          throw new Error('Save error');
        });

        const result = fixExchangeRate();

        // setItem のエラーは内側の try/catch で捕捉される
        // ('ポートフォリオデータの解析に失敗しました:')
        // 全体の処理は成功として完了する
        expect(result).toBe(true);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'ポートフォリオデータの解析に失敗しました:',
          expect.objectContaining({})
        );
      });
    });

    describe('データ修正の詳細テスト', () => {
      it('修正されたデータの構造が正しい', () => {
        const originalData = {
          holdings: [{ ticker: 'AAPL', shares: 10 }],
          exchangeRate: { rate: 'invalid' }
        };
        const encodedData = btoa(JSON.stringify(originalData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        fixExchangeRate();

        const setItemCall = localStorageMock.setItem.mock.calls[0];
        const savedData = JSON.parse(atob(setItemCall[1]));

        expect(savedData.holdings).toEqual(originalData.holdings);
        expect(savedData.exchangeRate).toEqual({
          rate: 150.0,
          lastUpdated: mockISOString,
          isDefault: true,
          source: 'fix-utility'
        });
      });

      it('既存のデータを保持して為替レートのみ修正する', () => {
        const originalData = {
          holdings: [{ ticker: 'AAPL', shares: 10 }],
          lastUpdated: '2023-04-01T10:00:00.000Z',
          customField: 'preserved',
          exchangeRate: { rate: NaN }
        };
        const encodedData = btoa(JSON.stringify(originalData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        fixExchangeRate();

        const setItemCall = localStorageMock.setItem.mock.calls[0];
        const savedData = JSON.parse(atob(setItemCall[1]));

        expect(savedData.holdings).toEqual(originalData.holdings);
        expect(savedData.lastUpdated).toBe(originalData.lastUpdated);
        expect(savedData.customField).toBe(originalData.customField);
        expect(savedData.exchangeRate.rate).toBe(150.0);
      });

      it('rateが0の場合も修正対象とする', () => {
        const invalidData = { exchangeRate: { rate: 0 } };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        fixExchangeRate();

        // ソースコード: !data.exchangeRate.rate => !0 => true なので修正対象
        // 実装を確認: rate が 0 は falsy なので "不正な為替レート" として扱われる
        expect(mockLogger.log).toHaveBeenCalledWith('不正な為替レートを検出しました。修正します。');
      });

      it('rateが負の数値の場合', () => {
        const invalidData = { exchangeRate: { rate: -100 } };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        fixExchangeRate();

        // -100 は truthy かつ typeof 'number' なので正常扱い
        expect(mockLogger.log).toHaveBeenCalledWith('為替レートは正常です。');
      });

      it('rateがInfinityの場合', () => {
        // JSON.stringify converts Infinity to null, so when parsed back rate becomes null
        const invalidData = { exchangeRate: { rate: Infinity } };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        fixExchangeRate();

        // Infinity は JSON.stringify で null になるため、不正なレートとして処理される
        expect(mockLogger.log).toHaveBeenCalledWith('不正な為替レートを検出しました。修正します。');
      });
    });

    describe('複数回実行テスト', () => {
      it('複数回実行しても安全に動作する', () => {
        const validData = { exchangeRate: { rate: 150.0 } };
        const encodedData = btoa(JSON.stringify(validData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        const result1 = fixExchangeRate();
        const result2 = fixExchangeRate();
        const result3 = fixExchangeRate();

        expect(result1).toBe(true);
        expect(result2).toBe(true);
        expect(result3).toBe(true);

        expect(clearExchangeRateCache).toHaveBeenCalledTimes(3);
      });

      it('修正後のデータに対して再実行すると正常と判定される', () => {
        const invalidData = { exchangeRate: { rate: null } };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        // 最初の実行で修正
        fixExchangeRate();

        // 修正されたデータを取得
        const setItemCall = localStorageMock.setItem.mock.calls[0];
        const fixedData = setItemCall[1];

        // 2回目の実行
        localStorageMock.getItem.mockReturnValue(fixedData);
        vi.clearAllMocks();
        // clearAllMocksの後にスパイを再設定
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        fixExchangeRate();

        expect(mockLogger.log).toHaveBeenCalledWith('為替レートは正常です。');
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });
    });

    describe('統合テスト', () => {
      it('完全な修復フローが正常に動作する', () => {
        const corruptedData = {
          holdings: [
            { ticker: 'AAPL', shares: 10 },
            { ticker: 'MSFT', shares: 5 }
          ],
          lastUpdated: '2023-04-01T10:00:00.000Z',
          exchangeRate: {
            rate: 'corrupted',
            lastUpdated: 'invalid-date',
            source: 'unknown'
          }
        };
        const encodedData = btoa(JSON.stringify(corruptedData));
        localStorageMock.getItem.mockReturnValue(encodedData);

        const result = fixExchangeRate();

        // 修復成功
        expect(result).toBe(true);

        // キャッシュクリアが実行される
        expect(clearExchangeRateCache).toHaveBeenCalledTimes(1);

        // 適切なログが表示される
        expect(mockLogger.log).toHaveBeenCalledWith('不正な為替レートを検出しました。修正します。');
        expect(mockLogger.log).toHaveBeenCalledWith('為替レートを修正しました。');

        // データが正しく保存される
        const setItemCall = localStorageMock.setItem.mock.calls[0];
        expect(setItemCall[0]).toBe('portfolioData');

        const savedData = JSON.parse(atob(setItemCall[1]));
        expect(savedData.holdings).toEqual(corruptedData.holdings);
        expect(savedData.lastUpdated).toBe(corruptedData.lastUpdated);
        expect(savedData.exchangeRate).toEqual({
          rate: 150.0,
          lastUpdated: mockISOString,
          isDefault: true,
          source: 'fix-utility'
        });
      });
    });
  });

  describe('型安全性テスト', () => {
    it('さまざまな不正なrateタイプを処理する', () => {
      const testCases = [
        { rate: undefined },
        { rate: null },
        { rate: '' },
        { rate: 'string' },
        { rate: [] },
        { rate: {} },
        { rate: true },
        { rate: false },
      ];

      testCases.forEach((exchangeRate) => {
        const data = { exchangeRate };
        let encodedData;
        try {
          encodedData = btoa(JSON.stringify(data));
        } catch {
          // Symbol等のシリアライズ不可な値はスキップ
          return;
        }
        localStorageMock.getItem.mockReturnValue(encodedData);

        vi.clearAllMocks();
        // clearAllMocksの後にスパイを再設定
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = fixExchangeRate();

        expect(result).toBe(true);
        if (typeof exchangeRate.rate !== 'number') {
          expect(localStorageMock.setItem).toHaveBeenCalled();
        }
      });
    });
  });
});
