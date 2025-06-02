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
    
    // windowオブジェクトをクリア
    delete global.window;
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
    beforeEach(() => {
      // ブラウザ環境をシミュレート
      global.window = {
        resetCircuitBreakers: undefined
      };
    });

    it('windowオブジェクトにresetCircuitBreakers関数を追加する', () => {
      // モジュールを読み込み
      require('../../../utils/resetCircuitBreaker');
      
      expect(global.window.resetCircuitBreakers).toBeDefined();
      expect(typeof global.window.resetCircuitBreakers).toBe('function');
    });

    it('初期化時にログメッセージを表示する', () => {
      // モジュールを読み込み
      require('../../../utils/resetCircuitBreaker');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Circuit breaker reset function available: window.resetCircuitBreakers()'
      );
    });

    it('window.resetCircuitBreakers()を呼び出すとresetAllCircuitBreakersが実行される', () => {
      // モジュールを読み込み
      require('../../../utils/resetCircuitBreaker');
      
      // 関数を実行
      global.window.resetCircuitBreakers();
      
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
    });

    it('window.resetCircuitBreakers()実行時にログメッセージを表示する', () => {
      // モジュールを読み込み
      require('../../../utils/resetCircuitBreaker');
      
      // 関数を実行
      global.window.resetCircuitBreakers();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });

    it('複数回呼び出しても正常に動作する', () => {
      // モジュールを読み込み
      require('../../../utils/resetCircuitBreaker');
      
      // 複数回実行
      global.window.resetCircuitBreakers();
      global.window.resetCircuitBreakers();
      global.window.resetCircuitBreakers();
      
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });

    it('resetAllCircuitBreakersがエラーを投げても安全に処理する', () => {
      // エラーを投げるように設定
      resetAllCircuitBreakers.mockImplementation(() => {
        throw new Error('Circuit breaker error');
      });
      
      // モジュールを読み込み
      require('../../../utils/resetCircuitBreaker');
      
      // エラーが投げられることを確認
      expect(() => {
        global.window.resetCircuitBreakers();
      }).toThrow('Circuit breaker error');
      
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
    });
  });

  describe('非ブラウザ環境での動作', () => {
    beforeEach(() => {
      // windowオブジェクトが存在しない環境をシミュレート
      global.window = undefined;
    });

    it('windowが未定義の場合でもエラーが発生しない', () => {
      expect(() => {
        require('../../../utils/resetCircuitBreaker');
      }).not.toThrow();
    });

    it('windowが未定義の場合はグローバル関数を追加しない', () => {
      require('../../../utils/resetCircuitBreaker');
      
      expect(global.window).toBeUndefined();
    });

    it('windowが未定義の場合は初期化ログも表示しない', () => {
      require('../../../utils/resetCircuitBreaker');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('Node.js環境でも正常に動作する', () => {
      // Node.js環境をシミュレート
      delete global.window;
      
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

  describe('モジュール再読み込みテスト', () => {
    beforeEach(() => {
      global.window = {};
    });

    it('モジュールを複数回読み込んでも安全に動作する', () => {
      // 最初の読み込み
      require('../../../utils/resetCircuitBreaker');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      
      // モジュールキャッシュをクリア
      delete require.cache[require.resolve('../../../utils/resetCircuitBreaker')];
      
      // 2回目の読み込み
      require('../../../utils/resetCircuitBreaker');
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it('windowプロパティが既に存在する場合でも上書きする', () => {
      // 既存の関数を設定
      global.window.resetCircuitBreakers = jest.fn();
      const existingFunction = global.window.resetCircuitBreakers;
      
      // モジュールを読み込み
      require('../../../utils/resetCircuitBreaker');
      
      // 関数が置き換えられている
      expect(global.window.resetCircuitBreakers).not.toBe(existingFunction);
      expect(typeof global.window.resetCircuitBreakers).toBe('function');
    });
  });

  describe('window環境の境界値テスト', () => {
    it('windowがnullの場合', () => {
      global.window = null;
      
      expect(() => {
        require('../../../utils/resetCircuitBreaker');
      }).not.toThrow();
    });

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

  describe('デバッグ機能テスト', () => {
    beforeEach(() => {
      global.window = {};
    });

    it('デバッグ関数が期待通りの動作をする', () => {
      require('../../../utils/resetCircuitBreaker');
      
      // デバッグ関数を実行
      global.window.resetCircuitBreakers();
      
      // resetAllCircuitBreakersが呼ばれる
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
      
      // ログメッセージが表示される
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });

    it('開発者コンソールでの使用例をシミュレート', () => {
      require('../../../utils/resetCircuitBreaker');
      
      // 開発者が複数回実行する場合
      for (let i = 0; i < 5; i++) {
        global.window.resetCircuitBreakers();
      }
      
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(5);
    });

    it('関数名が分かりやすい', () => {
      require('../../../utils/resetCircuitBreaker');
      
      expect(global.window.resetCircuitBreakers.name).toBeTruthy();
    });
  });

  describe('統合テスト', () => {
    beforeEach(() => {
      global.window = {};
    });

    it('完全なライフサイクルテスト', () => {
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

    it('エクスポートとグローバル関数が同じ動作をする', () => {
      const module = require('../../../utils/resetCircuitBreaker');
      
      // エクスポート関数を実行
      module.resetAllCircuitBreakers();
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
      
      // グローバル関数を実行（ログ付き）
      global.window.resetCircuitBreakers();
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(2);
      
      // ログはグローバル関数のみ
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });
  });
});