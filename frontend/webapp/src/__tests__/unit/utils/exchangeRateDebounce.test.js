/**
 * exchangeRateDebounce.js のユニットテスト
 * 為替レート更新のデバウンス管理テスト
 */

import {
  shouldUpdateExchangeRate,
  resetExchangeRateTimer,
  clearExchangeRateCache
} from '../../../utils/exchangeRateDebounce';

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

describe('exchangeRateDebounce', () => {
  let consoleLogSpy;
  let originalDateNow;

  beforeEach(() => {
    // コンソールログをモック
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Date.nowをモック
    originalDateNow = Date.now;
    
    // localStorageのモックをクリア
    jest.clearAllMocks();
    
    // タイマーをリセット（モジュールを再読み込み）
    jest.resetModules();
  });

  afterEach(() => {
    // Date.nowを復元
    Date.now = originalDateNow;
    
    // コンソールモックを復元
    consoleLogSpy.mockRestore();
    
    // タイマーをリセット
    const module = require('../../../utils/exchangeRateDebounce');
    module.resetExchangeRateTimer();
  });

  describe('shouldUpdateExchangeRate', () => {
    beforeEach(() => {
      // 新しくモジュールをインポート
      jest.resetModules();
    });

    it('初回呼び出し時はtrueを返す', () => {
      const mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(true);
    });

    it('1時間以内の再呼び出しではfalseを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 30分後（1800000ms後）
      Date.now = jest.fn(() => baseTime + 1800000);
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('為替レート更新をスキップ')
      );
    });

    it('1時間経過後はtrueを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 1時間+1分後（3660000ms後）
      Date.now = jest.fn(() => baseTime + 3660000);
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(true);
    });

    it('forceUpdateがtrueの場合は常にtrueを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 1分後（デバウンス中）
      Date.now = jest.fn(() => baseTime + 60000);
      const result = shouldUpdateExchangeRate(true);
      
      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('為替レート強制更新を実行します');
    });

    it('強制更新後もタイマーが更新される', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 強制更新
      shouldUpdateExchangeRate(true);
      
      // 30分後（通常ならデバウンス中）
      Date.now = jest.fn(() => baseTime + 1800000);
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(false);
    });

    it('適切な経過時間メッセージを表示する', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 30分後（1800000ms = 30分）
      Date.now = jest.fn(() => baseTime + 1800000);
      shouldUpdateExchangeRate();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('前回から30分しか経過していません')
      );
    });

    it('経過時間を分単位で正しく計算する', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 45分後（2700000ms = 45分）
      Date.now = jest.fn(() => baseTime + 2700000);
      shouldUpdateExchangeRate();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('前回から45分しか経過していません')
      );
    });

    it('1時間ちょうどでtrueを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // ちょうど1時間後（3600000ms）
      Date.now = jest.fn(() => baseTime + 3600000);
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(true);
    });

    it('59分59秒後でもfalseを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 59分59秒後（3599000ms）
      Date.now = jest.fn(() => baseTime + 3599000);
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(false);
    });
  });

  describe('resetExchangeRateTimer', () => {
    it('タイマーをリセットする', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate, resetExchangeRateTimer } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 30分後（通常ならfalseになる）
      Date.now = jest.fn(() => baseTime + 1800000);
      
      // タイマーをリセット
      resetExchangeRateTimer();
      
      // リセット後はtrueを返す
      const result = shouldUpdateExchangeRate();
      expect(result).toBe(true);
    });

    it('リセット時にログメッセージを表示する', () => {
      const { resetExchangeRateTimer } = require('../../../utils/exchangeRateDebounce');
      
      resetExchangeRateTimer();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('為替レートタイマーをリセットしました');
    });

    it('複数回呼び出しても安全に動作する', () => {
      const { resetExchangeRateTimer } = require('../../../utils/exchangeRateDebounce');
      
      expect(() => {
        resetExchangeRateTimer();
        resetExchangeRateTimer();
        resetExchangeRateTimer();
      }).not.toThrow();
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearExchangeRateCache', () => {
    it('JPYとUSDのキャッシュをクリアする', () => {
      const { clearExchangeRateCache } = require('../../../utils/exchangeRateDebounce');
      
      clearExchangeRateCache();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('exchangeRate_JPY');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('exchangeRate_USD');
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(2);
    });

    it('キャッシュクリア時にログメッセージを表示する', () => {
      const { clearExchangeRateCache } = require('../../../utils/exchangeRateDebounce');
      
      clearExchangeRateCache();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('為替レートキャッシュをクリアします');
    });

    it('タイマーもリセットする', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate, clearExchangeRateCache } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 30分後（通常ならfalseになる）
      Date.now = jest.fn(() => baseTime + 1800000);
      
      // キャッシュをクリア（タイマーもリセットされる）
      clearExchangeRateCache();
      
      // リセット後はtrueを返す
      const result = shouldUpdateExchangeRate();
      expect(result).toBe(true);
    });

    it('キャッシュクリアとタイマーリセットの両方のログを表示する', () => {
      const { clearExchangeRateCache } = require('../../../utils/exchangeRateDebounce');
      
      clearExchangeRateCache();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('為替レートキャッシュをクリアします');
      expect(consoleLogSpy).toHaveBeenCalledWith('為替レートタイマーをリセットしました');
    });

    it('localStorageエラーでも安全に動作する', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const { clearExchangeRateCache } = require('../../../utils/exchangeRateDebounce');
      
      expect(() => {
        clearExchangeRateCache();
      }).toThrow('localStorage error');
    });
  });

  describe('モジュール状態の管理', () => {
    it('モジュール間で状態が共有される', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate: update1 } = require('../../../utils/exchangeRateDebounce');
      const { shouldUpdateExchangeRate: update2 } = require('../../../utils/exchangeRateDebounce');
      
      // 最初のインスタンスで呼び出し
      update1();
      
      // 30分後、2つ目のインスタンスで確認
      Date.now = jest.fn(() => baseTime + 1800000);
      const result = update2();
      
      expect(result).toBe(false);
    });

    it('リセット後は新しい呼び出しでtrueを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate, resetExchangeRateTimer } = require('../../../utils/exchangeRateDebounce');
      
      // 呼び出し
      shouldUpdateExchangeRate();
      
      // リセット
      resetExchangeRateTimer();
      
      // 新しい呼び出しでtrueを返す
      const result = shouldUpdateExchangeRate();
      expect(result).toBe(true);
    });
  });

  describe('境界値テスト', () => {
    it('0分経過時はfalseを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 即座に再呼び出し
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(false);
    });

    it('1ミリ秒経過時はfalseを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 1ミリ秒後
      Date.now = jest.fn(() => baseTime + 1);
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(false);
    });

    it('1時間 - 1ミリ秒経過時はfalseを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 1時間 - 1ミリ秒後
      Date.now = jest.fn(() => baseTime + 3600000 - 1);
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(false);
    });

    it('1時間 + 1ミリ秒経過時はtrueを返す', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      // 最初の呼び出し
      shouldUpdateExchangeRate();
      
      // 1時間 + 1ミリ秒後
      Date.now = jest.fn(() => baseTime + 3600000 + 1);
      const result = shouldUpdateExchangeRate();
      
      expect(result).toBe(true);
    });
  });

  describe('ログメッセージの詳細テスト', () => {
    it('1分経過時のメッセージ', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      shouldUpdateExchangeRate();
      
      Date.now = jest.fn(() => baseTime + 60000); // 1分
      shouldUpdateExchangeRate();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '為替レート更新をスキップ: 前回から1分しか経過していません（1時間待機）'
      );
    });

    it('0分経過時のメッセージ（Math.roundによる丸め）', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      shouldUpdateExchangeRate();
      
      Date.now = jest.fn(() => baseTime + 29000); // 29秒（0分に丸められる）
      shouldUpdateExchangeRate();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '為替レート更新をスキップ: 前回から0分しか経過していません（1時間待機）'
      );
    });

    it('切り上げが必要な時間のメッセージ', () => {
      const baseTime = 1000000;
      Date.now = jest.fn(() => baseTime);
      
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      shouldUpdateExchangeRate();
      
      Date.now = jest.fn(() => baseTime + 90000); // 1.5分（2分に丸められる）
      shouldUpdateExchangeRate();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '為替レート更新をスキップ: 前回から2分しか経過していません（1時間待機）'
      );
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の呼び出しでも高速で動作する', () => {
      const { shouldUpdateExchangeRate } = require('../../../utils/exchangeRateDebounce');
      
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        shouldUpdateExchangeRate();
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });
  });
});