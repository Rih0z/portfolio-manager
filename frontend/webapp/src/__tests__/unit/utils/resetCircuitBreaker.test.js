import { vi } from "vitest";
/**
 * resetCircuitBreaker.js のユニットテスト
 * サーキットブレーカーリセット用ユーティリティのテスト
 */

// apiUtilsをモック
vi.mock('../../../utils/apiUtils', () => ({
  resetAllCircuitBreakers: vi.fn()
}));

import { resetAllCircuitBreakers } from '../../../utils/apiUtils';

describe('resetCircuitBreaker', () => {
  let consoleLogSpy;

  beforeEach(() => {
    // コンソールログをモック
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // モックをクリア（resetAllMocks で implementation もリセット）
    vi.resetAllMocks();
    // resetAllMocks がスパイの実装もクリアするため再設定
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // windowから追加されたプロパティを削除
    if (typeof window !== 'undefined' && window.resetCircuitBreakers) {
      delete window.resetCircuitBreakers;
    }

    // モジュールキャッシュをリセット
    vi.resetModules();
  });

  afterEach(() => {
    // コンソールモックを復元
    consoleLogSpy.mockRestore();

    // windowから追加されたプロパティを削除
    if (typeof window !== 'undefined' && window.resetCircuitBreakers) {
      delete window.resetCircuitBreakers;
    }
  });

  describe('ブラウザ環境での動作', () => {
    it('windowオブジェクトにresetCircuitBreakers関数を追加し、ログを表示する', async () => {
      // モジュールを読み込み（動的import）
      await import('../../../utils/resetCircuitBreaker');

      // window関数が追加されている
      expect(window.resetCircuitBreakers).toBeDefined();
      expect(typeof window.resetCircuitBreakers).toBe('function');

      // 初期化ログが表示されている
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Circuit breaker reset function available: window.resetCircuitBreakers()'
      );
    });

    it('グローバル関数を実行するとresetAllCircuitBreakersが呼ばれる', async () => {
      // モジュールを読み込み
      await import('../../../utils/resetCircuitBreaker');

      // グローバル関数を実行
      window.resetCircuitBreakers();

      // resetAllCircuitBreakersが呼ばれている
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);

      // ログメッセージが表示されている
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });

    it('複数回呼び出しても正常に動作する', async () => {
      await import('../../../utils/resetCircuitBreaker');

      // 複数回実行
      window.resetCircuitBreakers();
      window.resetCircuitBreakers();
      window.resetCircuitBreakers();

      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(3);
    });

    it('resetAllCircuitBreakersがエラーを投げても処理される', async () => {
      // エラーを投げるように設定
      resetAllCircuitBreakers.mockImplementation(() => {
        throw new Error('Circuit breaker error');
      });

      await import('../../../utils/resetCircuitBreaker');

      // エラーが投げられることを確認
      expect(() => {
        window.resetCircuitBreakers();
      }).toThrow('Circuit breaker error');

      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
    });
  });

  describe('エクスポート機能', () => {
    it('resetAllCircuitBreakersを正しくエクスポートする', async () => {
      const module = await import('../../../utils/resetCircuitBreaker');

      expect(module.resetAllCircuitBreakers).toBe(resetAllCircuitBreakers);
    });

    it('エクスポートされた関数を直接呼び出せる', async () => {
      const { resetAllCircuitBreakers: exportedFunction } = await import('../../../utils/resetCircuitBreaker');

      exportedFunction();

      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
    });
  });

  describe('境界値テスト', () => {
    it('windowが空オブジェクト的な環境でも動作する', async () => {
      // jsdom環境ではwindowは常に存在する
      await import('../../../utils/resetCircuitBreaker');

      expect(window.resetCircuitBreakers).toBeDefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Circuit breaker reset function available: window.resetCircuitBreakers()'
      );
    });
  });

  describe('統合テスト', () => {
    it('完全なライフサイクルテスト', async () => {
      // 1. モジュール読み込み
      const module = await import('../../../utils/resetCircuitBreaker');

      // 2. 初期化ログの確認
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Circuit breaker reset function available: window.resetCircuitBreakers()'
      );

      // 3. グローバル関数の確認
      expect(window.resetCircuitBreakers).toBeDefined();

      // 4. エクスポートされた関数の確認
      expect(module.resetAllCircuitBreakers).toBe(resetAllCircuitBreakers);

      // 5. グローバル関数の実行
      window.resetCircuitBreakers();

      // 6. 期待される動作の確認
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });

    it('エクスポートとグローバル関数が独立して動作する', async () => {
      const module = await import('../../../utils/resetCircuitBreaker');

      // エクスポート関数を実行（ログなし）
      module.resetAllCircuitBreakers();
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1);

      // グローバル関数を実行（ログあり）
      window.resetCircuitBreakers();
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(2);

      // ログはグローバル関数のみ
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'All circuit breakers have been reset'
      );
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の呼び出しでも高速で動作する', async () => {
      await import('../../../utils/resetCircuitBreaker');

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        window.resetCircuitBreakers();
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
      expect(resetAllCircuitBreakers).toHaveBeenCalledTimes(1000);
    });
  });
});
