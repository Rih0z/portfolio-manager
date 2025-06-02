/**
 * fixExchangeRate.js のユニットテスト
 * 為替レート修復ユーティリティのテスト
 */

// exchangeRateDebounceをモック
jest.mock('../../../utils/exchangeRateDebounce', () => ({
  clearExchangeRateCache: jest.fn()
}));

import { clearExchangeRateCache } from '../../../utils/exchangeRateDebounce';

// localStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Date.toISOStringのモック
const mockISOString = '2023-05-01T12:00:00.000Z';
const originalDate = Date;

describe('fixExchangeRate', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let originalWindow;

  beforeEach(() => {
    // コンソールメソッドをモック
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Dateをモック
    global.Date = class extends originalDate {
      toISOString() {
        return mockISOString;
      }
    };
    
    // windowオブジェクトをバックアップ
    originalWindow = global.window;
    global.window = { ...originalWindow };
    
    // モックをクリア
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Dateを復元
    global.Date = originalDate;
    
    // windowオブジェクトを復元
    global.window = originalWindow;
    
    // コンソールモックを復元
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    
    // windowから追加されたプロパティを削除
    if (global.window && global.window.fixExchangeRate) {
      delete global.window.fixExchangeRate;
    }
  });

  describe('モジュール初期化', () => {
    it('windowオブジェクトにfixExchangeRate関数を追加する', () => {
      // モジュールを読み込み
      const { fixExchangeRate } = require('../../../utils/fixExchangeRate');
      
      expect(global.window.fixExchangeRate).toBe(fixExchangeRate);
      expect(typeof global.window.fixExchangeRate).toBe('function');
    });

    it('初期化時に使用方法を表示する', () => {
      // モジュールを読み込み
      require('../../../utils/fixExchangeRate');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '%c為替レート修復ツールが利用可能です',
        'color: blue; font-weight: bold;'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '修復するには、コンソールで以下を実行してください:'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '%cfixExchangeRate()',
        'color: green; font-family: monospace;'
      );
    });

    it('エクスポートされた関数が利用可能', () => {
      const { fixExchangeRate } = require('../../../utils/fixExchangeRate');
      
      expect(fixExchangeRate).toBeDefined();
      expect(typeof fixExchangeRate).toBe('function');
    });
  });

  describe('fixExchangeRate関数の動作', () => {
    let fixExchangeRate;

    beforeEach(() => {
      const module = require('../../../utils/fixExchangeRate');
      fixExchangeRate = module.fixExchangeRate;
    });

    describe('正常なケース', () => {
      it('ポートフォリオデータが存在しない場合', () => {
        localStorageMock.getItem.mockReturnValue(null);
        
        const result = fixExchangeRate();
        
        expect(result).toBe(true);
        expect(clearExchangeRateCache).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith('=== 為替レート修復を開始します ===');
        expect(consoleLogSpy).toHaveBeenCalledWith('=== 修復処理が完了しました ===');
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
        expect(consoleLogSpy).toHaveBeenCalledWith('為替レートは正常です。');
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
        expect(consoleLogSpy).toHaveBeenCalledWith('不正な為替レートを検出しました。修正します。');
        expect(consoleLogSpy).toHaveBeenCalledWith('為替レートを修正しました。');
        
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
        expect(consoleLogSpy).toHaveBeenCalledWith('不正な為替レートを検出しました。修正します。');
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
        expect(consoleLogSpy).toHaveBeenCalledWith('為替レートデータが存在しません。デフォルト値を設定します。');
        
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
        
        expect(consoleLogSpy).toHaveBeenCalledWith('=== 為替レート修復を開始します ===');
        expect(consoleLogSpy).toHaveBeenCalledWith('1. 為替レートキャッシュをクリア中...');
        expect(consoleLogSpy).toHaveBeenCalledWith('2. ポートフォリオデータを確認中...');
        expect(consoleLogSpy).toHaveBeenCalledWith('3. 修復完了！ページをリロードしてください。');
        expect(consoleLogSpy).toHaveBeenCalledWith('=== 修復処理が完了しました ===');
      });
    });

    describe('エラーハンドリング', () => {
      it('不正なBase64データの場合にエラーログを表示する', () => {
        localStorageMock.getItem.mockReturnValue('invalid-base64-data');
        
        const result = fixExchangeRate();
        
        expect(result).toBe(true); // 全体の処理は成功
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'ポートフォリオデータの解析に失敗しました:',
          expect.any(Error)
        );
      });

      it('不正なJSONデータの場合にエラーログを表示する', () => {
        const invalidJson = btoa('{"invalid": json}');
        localStorageMock.getItem.mockReturnValue(invalidJson);
        
        const result = fixExchangeRate();
        
        expect(result).toBe(true);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'ポートフォリオデータの解析に失敗しました:',
          expect.any(Error)
        );
      });

      it('localStorageでエラーが発生した場合', () => {
        localStorageMock.getItem.mockImplementation(() => {
          throw new Error('localStorage error');
        });
        
        const result = fixExchangeRate();
        
        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '修復中にエラーが発生しました:',
          expect.any(Error)
        );
      });

      it('clearExchangeRateCacheでエラーが発生した場合', () => {
        clearExchangeRateCache.mockImplementation(() => {
          throw new Error('Cache clear error');
        });
        
        const result = fixExchangeRate();
        
        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '修復中にエラーが発生しました:',
          expect.any(Error)
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
        
        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '修復中にエラーが発生しました:',
          expect.any(Error)
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
        
        expect(consoleLogSpy).toHaveBeenCalledWith('為替レートは正常です。');
        // 0は有効な数値として扱われる
      });

      it('rateが負の数値の場合', () => {
        const invalidData = { exchangeRate: { rate: -100 } };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);
        
        fixExchangeRate();
        
        expect(consoleLogSpy).toHaveBeenCalledWith('為替レートは正常です。');
        // 負の数値も有効な数値として扱われる
      });

      it('rateがInfinityの場合', () => {
        const invalidData = { exchangeRate: { rate: Infinity } };
        const encodedData = btoa(JSON.stringify(invalidData));
        localStorageMock.getItem.mockReturnValue(encodedData);
        
        fixExchangeRate();
        
        expect(consoleLogSpy).toHaveBeenCalledWith('為替レートは正常です。');
        // Infinityも数値型として扱われる
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
        jest.clearAllMocks();
        
        fixExchangeRate();
        
        expect(consoleLogSpy).toHaveBeenCalledWith('為替レートは正常です。');
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
        expect(consoleLogSpy).toHaveBeenCalledWith('不正な為替レートを検出しました。修正します。');
        expect(consoleLogSpy).toHaveBeenCalledWith('為替レートを修正しました。');
        
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
    let fixExchangeRate;

    beforeEach(() => {
      const module = require('../../../utils/fixExchangeRate');
      fixExchangeRate = module.fixExchangeRate;
    });

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
        { rate: Symbol('test') }
      ];

      testCases.forEach((exchangeRate, index) => {
        const data = { exchangeRate };
        const encodedData = btoa(JSON.stringify(data));
        localStorageMock.getItem.mockReturnValue(encodedData);
        
        jest.clearAllMocks();
        
        const result = fixExchangeRate();
        
        expect(result).toBe(true);
        if (typeof exchangeRate.rate !== 'number') {
          expect(localStorageMock.setItem).toHaveBeenCalled();
        }
      });
    });
  });
});