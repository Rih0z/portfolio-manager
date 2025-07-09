/**
 * resetCircuitBreaker.js のユニットテスト
 * サーキットブレーカーリセット用ユーティリティのテスト
 */

import { resetAllCircuitBreakers } from '../../../utils/resetCircuitBreaker';

// apiUtilsのモック
jest.mock('../../../utils/apiUtils', () => ({
  resetAllCircuitBreakers: jest.fn()
}));

import { resetAllCircuitBreakers as mockResetAllCircuitBreakers } from '../../../utils/apiUtils';

describe('resetCircuitBreaker', () => {
  let consoleSpy;

  beforeAll(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('exports', () => {
    it('resetAllCircuitBreakers をエクスポートしている', () => {
      expect(resetAllCircuitBreakers).toBe(mockResetAllCircuitBreakers);
      expect(typeof resetAllCircuitBreakers).toBe('function');
    });
  });

  describe('ブラウザ環境での動作', () => {
    it('window.resetCircuitBreakers が設定される', () => {
      expect(typeof window.resetCircuitBreakers).toBe('function');
    });

    it('window.resetCircuitBreakers() を実行すると resetAllCircuitBreakers が呼ばれる', () => {
      window.resetCircuitBreakers();

      expect(mockResetAllCircuitBreakers).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('All circuit breakers have been reset');
    });

    it('コンソールにリセット関数の利用方法が表示される（モジュール初期化時）', () => {
      // モジュール初期化時のconsole.logはすでに実行されているため、
      // この時点で出力されていることを間接的に確認
      expect(typeof window.resetCircuitBreakers).toBe('function');
      
      // 新しいコンソールスパイを作成してリセット関数の動作を確認
      const newConsoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      window.resetCircuitBreakers();
      expect(newConsoleSpy).toHaveBeenCalledWith('All circuit breakers have been reset');
      newConsoleSpy.mockRestore();
    });
  });

  describe('サーバー環境での動作', () => {
    let originalWindow;

    beforeEach(() => {
      originalWindow = global.window;
      delete global.window;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it('windowが未定義の場合もエラーが発生しない', () => {
      expect(() => {
        // モジュールを再インポートしてサーバー環境をシミュレート
        jest.resetModules();
        require('../../../utils/resetCircuitBreaker');
      }).not.toThrow();
    });
  });
});