/**
 * APIユーティリティの単体テスト
 *
 * @file src/__tests__/unit/utils/apiUtils.test.ts
 */

import {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  formatErrorResponse,
  generateFallbackData,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
  RETRY,
  TIMEOUT,
} from '@/utils/apiUtils';

vi.mock('@/utils/envUtils', () => ({
  getApiEndpoint: vi.fn().mockResolvedValue('https://api.test.com/endpoint'),
  isLocalDevelopment: vi.fn().mockReturnValue(false),
}));
vi.mock('@/utils/csrfManager', () => ({
  default: { addTokenToRequest: vi.fn() },
}));
vi.mock('@/utils/errorHandler', () => ({
  handleApiError: vi.fn((err: any) => err),
}));
vi.mock('@/utils/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

describe('apiUtils', () => {
  afterEach(() => {
    clearAuthToken();
    resetAllCircuitBreakers();
  });

  // ─── トークン管理 ──────────────────────────────────────

  describe('auth token management', () => {
    it('setAuthTokenでトークンを設定できる', () => {
      setAuthToken('test-token-123');
      expect(getAuthToken()).toBe('test-token-123');
    });

    it('clearAuthTokenでトークンをクリアできる', () => {
      setAuthToken('test-token');
      clearAuthToken();
      expect(getAuthToken()).toBeNull();
    });

    it('初期状態ではトークンがnull', () => {
      expect(getAuthToken()).toBeNull();
    });
  });

  // ─── RETRY/TIMEOUT定数 ──────────────────────────────────

  describe('constants', () => {
    it('RETRY定数が定義されている', () => {
      expect(RETRY.MAX_ATTEMPTS).toBe(2);
      expect(RETRY.INITIAL_DELAY).toBe(500);
      expect(RETRY.BACKOFF_FACTOR).toBe(2);
      expect(RETRY.MAX_DELAY).toBe(60000);
      expect(RETRY.CIRCUIT_BREAKER_THRESHOLD).toBe(5);
    });

    it('TIMEOUT定数が定義されている', () => {
      expect(TIMEOUT.DEFAULT).toBe(10000);
      expect(TIMEOUT.EXCHANGE_RATE).toBe(5000);
      expect(TIMEOUT.US_STOCK).toBe(10000);
      expect(TIMEOUT.JP_STOCK).toBe(20000);
    });
  });

  // ─── formatErrorResponse ───────────────────────────────

  describe('formatErrorResponse', () => {
    it('サーバーレスポンスエラーをフォーマットする', () => {
      const error = {
        message: 'Request failed',
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };
      const result = formatErrorResponse(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe(true);
      expect(result.errorType).toBe('API_ERROR');
      expect(result.status).toBe(500);
      expect(result.message).toBe('Internal Server Error');
    });

    it('429レート制限エラーをフォーマットする', () => {
      const error = {
        message: 'Too many requests',
        response: { status: 429, data: {} },
      };
      const result = formatErrorResponse(error);

      expect(result.errorType).toBe('RATE_LIMIT');
      expect(result.status).toBe(429);
    });

    it('タイムアウトエラーをフォーマットする', () => {
      const error = {
        message: 'timeout',
        code: 'ECONNABORTED',
      };
      const result = formatErrorResponse(error);

      expect(result.errorType).toBe('TIMEOUT');
      expect(result.message).toBe('リクエストがタイムアウトしました');
    });

    it('ネットワークエラーをフォーマットする', () => {
      const error = {
        message: 'Network Error',
      };
      const result = formatErrorResponse(error);

      expect(result.errorType).toBe('NETWORK');
      expect(result.message).toBe('ネットワーク接続に問題があります');
    });

    it('未知のエラーをフォーマットする', () => {
      const error = {
        message: 'Unknown error',
      };
      const result = formatErrorResponse(error);

      expect(result.errorType).toBe('UNKNOWN');
      expect(result.errorDetail).toBe('Unknown error');
    });

    it('tickerパラメータを含む', () => {
      const error = { message: 'Error' };
      const result = formatErrorResponse(error, 'AAPL');

      expect(result.ticker).toBe('AAPL');
    });
  });

  // ─── generateFallbackData ──────────────────────────────

  describe('generateFallbackData', () => {
    it('日本株のフォールバックデータを生成する', () => {
      const result = generateFallbackData('7203.T');

      expect(result.ticker).toBe('7203.T');
      expect(result.currency).toBe('JPY');
      expect(result.price).toBe(1000);
      expect(result.isStock).toBe(true);
      expect(result.isMutualFund).toBe(false);
      expect(result.source).toBe('Fallback');
    });

    it('4桁コードの日本株を判定する', () => {
      const result = generateFallbackData('7203');
      expect(result.currency).toBe('JPY');
      expect(result.price).toBe(1000);
    });

    it('投資信託のフォールバックデータを生成する', () => {
      const result = generateFallbackData('12345678');

      expect(result.ticker).toBe('12345678');
      expect(result.currency).toBe('JPY');
      expect(result.price).toBe(10000);
      expect(result.isMutualFund).toBe(true);
      expect(result.isStock).toBe(false);
    });

    it('米国株のフォールバックデータを生成する', () => {
      const result = generateFallbackData('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.currency).toBe('USD');
      expect(result.price).toBe(100);
      expect(result.isStock).toBe(true);
      expect(result.isMutualFund).toBe(false);
    });

    it('lastUpdatedが有効なISO文字列', () => {
      const result = generateFallbackData('AAPL');
      expect(() => new Date(result.lastUpdated)).not.toThrow();
      expect(new Date(result.lastUpdated).toISOString()).toBe(result.lastUpdated);
    });
  });

  // ─── サーキットブレーカー ──────────────────────────────

  describe('circuit breaker', () => {
    it('resetCircuitBreakerが個別リセットする', () => {
      // エラーなく呼べることを確認
      expect(() => resetCircuitBreaker('test-endpoint')).not.toThrow();
    });

    it('resetAllCircuitBreakersが全てリセットする', () => {
      expect(() => resetAllCircuitBreakers()).not.toThrow();
    });

    it('存在しないブレーカーのリセットはエラーにならない', () => {
      expect(() => resetCircuitBreaker('nonexistent')).not.toThrow();
    });
  });
});
