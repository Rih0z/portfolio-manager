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

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
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
  });
});