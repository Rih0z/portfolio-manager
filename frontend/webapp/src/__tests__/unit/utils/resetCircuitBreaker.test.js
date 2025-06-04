/**
 * resetCircuitBreaker.js のユニットテスト
 * サーキットブレーカーリセット用ユーティリティのテスト
 */

// apiUtilsをモック
jest.mock('../../../utils/apiUtils', () => ({
  resetAllCircuitBreakers: jest.fn()
}));

import { resetAllCircuitBreakers } from '../../../utils/apiUtils';

describe('resetCircuitBreaker', () => {
  let consoleLogSpy;
  let originalWindow;

  beforeEach(() => {
    // コンソールログをモック
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // windowオブジェクトをバックアップ
    originalWindow = global.window;
    
    // モックをクリア
    jest.clearAllMocks();
    
    // 既存の全モジュールキャッシュをクリア
    Object.keys(require.cache).forEach(key => {
      if (key.includes('resetCircuitBreaker')) {
        delete require.cache[key];
      }
    });
  });

  afterEach(() => {
    // windowオブジェクトを復元
    global.window = originalWindow;
    
    // コンソールモックを復元
    consoleLogSpy.mockRestore();
    
    // windowから追加されたプロパティを削除
    if (typeof global.window !== 'undefined' && global.window.resetCircuitBreakers) {
      delete global.window.resetCircuitBreakers;
    }
  });

  describe('ブラウザ環境での動作', () => {
    it('windowオブジェクトにresetCircuitBreakers関数を追加し、ログを表示する', () => {
      // ブラウザ環境をシミュレート
      global.window = {};
      
      // モジュールを読み込み
      require('../../../utils/resetCircuitBreaker');
      
      // window関数が追加されている
      expect(global.window.resetCircuitBreakers).toBeDefined();
      expect(typeof global.window.resetCircuitBreakers).toBe('function');
      
      // 初期化ログが表示されている
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Circuit breaker reset function available: window.resetCircuitBreakers()'
      );
    });

    it('グローバル関数を実行するとresetAllCircuitBreakersが呼ばれる', () => {
      // ブラウザ環境をシミュレート
      global.window = {};
      
      // モジュールを読み込み
      require('../../../utils/resetCircuitBreaker');
      
      // グローバル関数を実行
      global.window.resetCircuitBreakers();
      
      // resetAllCircuitBreakersが呼ばれている
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
      
      // ログメッセージが表示されている
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });

    it('複数回呼び出しても正常に動作する', () => {
      global.window = {};
      require('../../../utils/resetCircuitBreaker');
      
      // 複数回実行
      global.window.resetCircuitBreakers();
      global.window.resetCircuitBreakers();
      global.window.resetCircuitBreakers();
      
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(3);
    });

    it('resetAllCircuitBreakersがエラーを投げても処理される', () => {
      // エラーを投げるように設定
      resetAllCircuitBreakers.mockImplementation(() => {
        throw new Error('Circuit breaker error');
      });
      
      global.window = {};
      require('../../../utils/resetCircuitBreaker');
      
      // エラーが投げられることを確認
      expect(() => {
        global.window.resetCircuitBreakers();
      }).toThrow('Circuit breaker error');
      
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
    });
  });

  describe('非ブラウザ環境での動作', () => {
    it('windowが未定義の場合でもエラーが発生しない', () => {
      global.window = undefined;
      
      expect(() => {
        require('../../../utils/resetCircuitBreaker');
      }).not.toThrow();
    });

    it('windowが未定義の場合はグローバル関数を追加しない', () => {
      global.window = undefined;
      require('../../../utils/resetCircuitBreaker');
      
      expect(global.window).toBeUndefined();
    });

    it('windowが未定義の場合は初期化ログも表示しない', () => {
      global.window = undefined;
      require('../../../utils/resetCircuitBreaker');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('windowがnullの場合でも安全に動作する', () => {
      global.window = null;
      
      expect(() => {
        require('../../../utils/resetCircuitBreaker');
      }).not.toThrow();
    });
  });

  describe('エクスポート機能', () => {
    it('resetAllCircuitBreakersを正しくエクスポートする', () => {
      const module = require('../../../utils/resetCircuitBreaker');
      
      expect(module.resetAllCircuitBreakers).toBe(resetAllCircuitBreakers);
    });

    it('エクスポートされた関数を直接呼び出せる', () => {
      const { resetAllCircuitBreakers: exportedFunction } = require('../../../utils/resetCircuitBreaker');
      
      exportedFunction();
      
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
    });
  });

  describe('境界値テスト', () => {
    it('windowが空オブジェクトの場合', () => {
      global.window = {};
      
      require('../../../utils/resetCircuitBreaker');
      
      expect(global.window.resetCircuitBreakers).toBeDefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Circuit breaker reset function available: window.resetCircuitBreakers()'
      );
    });

    it('windowにプロパティが設定できない場合', () => {
      // freeze されたwindowオブジェクト
      global.window = Object.freeze({});
      
      expect(() => {
        require('../../../utils/resetCircuitBreaker');
      }).toThrow();
    });

    it('windowが関数の場合', () => {
      global.window = function() {};
      
      require('../../../utils/resetCircuitBreaker');
      
      expect(global.window.resetCircuitBreakers).toBeDefined();
    });
  });

  describe('統合テスト', () => {
    it('完全なライフサイクルテスト', () => {
      global.window = {};
      
      // 1. モジュール読み込み
      const module = require('../../../utils/resetCircuitBreaker');
      
      // 2. 初期化ログの確認
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Circuit breaker reset function available: window.resetCircuitBreakers()'
      );
      
      // 3. グローバル関数の確認
      expect(global.window.resetCircuitBreakers).toBeDefined();
      
      // 4. エクスポートされた関数の確認
      expect(module.resetAllCircuitBreakers).toBe(resetAllCircuitBreakers);
      
      // 5. グローバル関数の実行
      global.window.resetCircuitBreakers();
      
      // 6. 期待される動作の確認
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });

    it('エクスポートとグローバル関数が独立して動作する', () => {
      global.window = {};
      const module = require('../../../utils/resetCircuitBreaker');
      
      // エクスポート関数を実行（ログなし）
      module.resetAllCircuitBreakers();
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
      
      // グローバル関数を実行（ログあり）
      global.window.resetCircuitBreakers();
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(2);
      
      // ログはグローバル関数のみ
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の呼び出しでも高速で動作する', () => {
      global.window = {};
      require('../../../utils/resetCircuitBreaker');
      
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        global.window.resetCircuitBreakers();
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1000);
    });
  });
});