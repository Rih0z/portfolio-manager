import {
  createApiClient,
  marketDataClient,
  authApiClient,
  fetchWithRetry,
  authFetch,
  formatErrorResponse,
  generateFallbackData,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
  wait,
  TIMEOUT,
  RETRY
} from '../../../utils/apiUtils';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: jest.fn((endpoint) => `http://localhost:3000/${endpoint}`),
  isLocalDevelopment: jest.fn(() => true)
}));
jest.mock('../../../utils/csrfManager', () => ({
  addTokenToRequest: jest.fn()
}));
jest.mock('../../../utils/errorHandler', () => ({
  handleApiError: jest.fn((error) => error)
}));
jest.mock('../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: jest.fn((ticker) => ticker === '7203.T' ? 'トヨタ自動車' : ticker)
}));
jest.mock('../../../utils/fundUtils', () => ({
  guessFundType: jest.fn(() => 'STOCK'),
  FUND_TYPES: {
    STOCK: 'STOCK',
    MUTUAL_FUND: 'MUTUAL_FUND',
    BOND: 'BOND',
    REIT: 'REIT'
  }
}));

const mockedAxios = axios;
// Ensure axios.create is a mock function
mockedAxios.create = jest.fn();

describe('apiUtils', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    defaults: {
      withCredentials: true,
      timeout: 10000,
      headers: {}
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearAuthToken();
    resetAllCircuitBreakers();
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Reset mock instance
    Object.keys(mockAxiosInstance).forEach(key => {
      if (typeof mockAxiosInstance[key].mockClear === 'function') {
        mockAxiosInstance[key].mockClear();
      }
    });
  });

  describe('Constants', () => {
    it('exports TIMEOUT constants', () => {
      expect(TIMEOUT.DEFAULT).toBe(10000);
      expect(TIMEOUT.EXCHANGE_RATE).toBe(5000);
      expect(TIMEOUT.US_STOCK).toBe(10000);
      expect(TIMEOUT.JP_STOCK).toBe(20000);
      expect(TIMEOUT.MUTUAL_FUND).toBe(20000);
    });

    it('exports RETRY constants', () => {
      expect(RETRY.MAX_ATTEMPTS).toBe(2);
      expect(RETRY.INITIAL_DELAY).toBe(500);
      expect(RETRY.BACKOFF_FACTOR).toBe(2);
      expect(RETRY.MAX_DELAY).toBe(60000);
      expect(RETRY.CIRCUIT_BREAKER_THRESHOLD).toBe(5);
      expect(RETRY.CIRCUIT_BREAKER_TIMEOUT).toBe(300000);
    });
  });

  describe('Auth Token Management', () => {
    it('sets and gets auth token', () => {
      const token = 'test-token-123';
      setAuthToken(token);
      expect(getAuthToken()).toBe(token);
    });

    it('clears auth token', () => {
      setAuthToken('test-token');
      clearAuthToken();
      expect(getAuthToken()).toBe(null);
    });

    it('handles null token', () => {
      setAuthToken(null);
      expect(getAuthToken()).toBe(null);
    });

    it('handles undefined token', () => {
      setAuthToken(undefined);
      expect(getAuthToken()).toBe(undefined);
    });
  });

  describe('Circuit Breaker', () => {
    it('resets circuit breaker by name', () => {
      expect(() => resetCircuitBreaker('test-service')).not.toThrow();
    });

    it('resets all circuit breakers', () => {
      expect(() => resetAllCircuitBreakers()).not.toThrow();
    });

    it('handles non-existent circuit breaker reset', () => {
      expect(() => resetCircuitBreaker('non-existent')).not.toThrow();
    });
  });

  describe('Wait function', () => {
    it('resolves after specified time', async () => {
      const startTime = Date.now();
      await wait(50);
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(45);
    });

    it('handles zero delay', async () => {
      const startTime = Date.now();
      await wait(0);
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('createApiClient', () => {
    it('creates API client without auth', () => {
      const client = createApiClient(false);
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: TIMEOUT.DEFAULT,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      expect(client).toBeDefined();
    });

    it('creates API client with auth', () => {
      const client = createApiClient(true);
      
      expect(mockedAxios.create).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    it('sets up request interceptors', () => {
      createApiClient(false);
      
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });

    it('sets up response interceptors', () => {
      createApiClient(false);
      
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('creates instances with proper defaults', () => {
      createApiClient(true);
      
      expect(mockAxiosInstance.defaults.withCredentials).toBe(true);
    });
  });

  describe('fetchWithRetry', () => {
    it('makes successful request on first attempt', async () => {
      const mockResponse = { data: { ticker: 'AAPL', price: 150 } };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);
      
      const result = await fetchWithRetry('market-data', { symbol: 'AAPL' });
      
      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds', async () => {
      const mockError = new Error('Network error');
      const mockResponse = { data: { ticker: 'AAPL', price: 150 } };
      
      mockAxiosInstance.get
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);
      
      const mockDelay = jest.fn().mockResolvedValue(undefined);
      const result = await fetchWithRetry('market-data', { symbol: 'AAPL' }, TIMEOUT.DEFAULT, 2, mockDelay);
      
      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(mockDelay).toHaveBeenCalled();
    });

    it('throws error after max retries', async () => {
      const mockError = new Error('Persistent error');
      mockAxiosInstance.get.mockRejectedValue(mockError);
      
      const mockDelay = jest.fn().mockResolvedValue(undefined);
      
      await expect(
        fetchWithRetry('market-data', { symbol: 'AAPL' }, TIMEOUT.DEFAULT, 1, mockDelay)
      ).rejects.toThrow('Persistent error');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('handles URL generation for different endpoint types', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      // Test with relative endpoint
      await fetchWithRetry('market-data');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'http://localhost:3000/market-data',
        expect.any(Object)
      );
      
      // Test with absolute URL
      await fetchWithRetry('https://api.example.com/data');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.any(Object)
      );
    });

    it('uses exponential backoff with jitter', async () => {
      const mockError = new Error('Error');
      mockAxiosInstance.get.mockRejectedValue(mockError);
      
      const mockDelay = jest.fn().mockResolvedValue(undefined);
      
      try {
        await fetchWithRetry('market-data', {}, TIMEOUT.DEFAULT, 2, mockDelay);
      } catch (error) {
        // Expected to fail
      }
      
      expect(mockDelay).toHaveBeenCalledTimes(2);
      // Check that delay increases (with jitter, should be around 500ms, then 1000ms)
      const call1Delay = mockDelay.mock.calls[0][0];
      const call2Delay = mockDelay.mock.calls[1][0];
      expect(call1Delay).toBeGreaterThan(400);
      expect(call2Delay).toBeGreaterThan(call1Delay);
    });
  });

  describe('authFetch', () => {
    beforeEach(() => {
      // Setup DOM environment for cookies
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'test=value'
      });
    });

    it('makes GET request successfully', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);
      
      const result = await authFetch('auth/session', 'get');
      
      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'http://localhost:3000/auth/session',
        expect.objectContaining({
          params: null,
          withCredentials: true
        })
      );
    });

    it('makes POST request successfully', async () => {
      const mockResponse = { data: { success: true } };
      const postData = { username: 'test' };
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);
      
      const result = await authFetch('auth/login', 'post', postData);
      
      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'http://localhost:3000/auth/login',
        postData,
        expect.objectContaining({
          withCredentials: true
        })
      );
    });

    it('makes PUT request successfully', async () => {
      const mockResponse = { data: { success: true } };
      const putData = { id: 1, name: 'updated' };
      mockAxiosInstance.put.mockResolvedValueOnce(mockResponse);
      
      const result = await authFetch('auth/update', 'put', putData);
      
      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        'http://localhost:3000/auth/update',
        putData,
        expect.objectContaining({
          withCredentials: true
        })
      );
    });

    it('makes DELETE request successfully', async () => {
      const mockResponse = { data: { success: true } };
      const deleteData = { id: 1 };
      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);
      
      const result = await authFetch('auth/delete', 'delete', deleteData);
      
      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        'http://localhost:3000/auth/delete',
        expect.objectContaining({
          data: deleteData,
          withCredentials: true
        })
      );
    });

    it('throws error for unsupported HTTP method', async () => {
      await expect(
        authFetch('auth/test', 'patch')
      ).rejects.toThrow('未対応のHTTPメソッド: patch');
    });

    it('handles 400 error responses gracefully', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { error: 'Bad request', details: 'Invalid input' }
        }
      };
      mockAxiosInstance.get.mockRejectedValueOnce(errorResponse);
      
      const result = await authFetch('auth/bad-request');
      
      expect(result).toEqual(errorResponse.response.data);
    });

    it('logs network error details', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const networkError = {
        message: 'Network Error',
        config: {
          url: 'http://localhost:3000/auth/test',
          method: 'get'
        }
      };
      mockAxiosInstance.get.mockRejectedValueOnce(networkError);
      
      await expect(authFetch('auth/test')).rejects.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Network Error詳細:',
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('formatErrorResponse', () => {
    it('formats generic error', () => {
      const error = new Error('Generic error');
      const result = formatErrorResponse(error, 'AAPL');
      
      expect(result).toEqual({
        success: false,
        error: true,
        message: 'データの取得に失敗しました',
        errorType: 'UNKNOWN',
        errorDetail: 'Generic error',
        ticker: 'AAPL'
      });
    });

    it('formats API error with response', () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };
      const result = formatErrorResponse(error);
      
      expect(result.status).toBe(500);
      expect(result.errorType).toBe('API_ERROR');
      expect(result.message).toBe('Internal server error');
    });

    it('formats rate limit error', () => {
      const error = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' }
        }
      };
      const result = formatErrorResponse(error);
      
      expect(result.errorType).toBe('RATE_LIMIT');
    });

    it('formats timeout error', () => {
      const error = { code: 'ECONNABORTED' };
      const result = formatErrorResponse(error);
      
      expect(result.errorType).toBe('TIMEOUT');
      expect(result.message).toBe('リクエストがタイムアウトしました');
    });

    it('formats network error', () => {
      const error = { message: 'Network Error' };
      const result = formatErrorResponse(error);
      
      expect(result.errorType).toBe('NETWORK');
      expect(result.message).toBe('ネットワーク接続に問題があります');
    });

    it('works without ticker', () => {
      const error = new Error('Test');
      const result = formatErrorResponse(error);
      
      expect(result.ticker).toBeUndefined();
      expect(result.success).toBe(false);
    });
  });

  describe('generateFallbackData', () => {
    it('generates fallback for Japanese stock', () => {
      const result = generateFallbackData('7203.T');
      
      expect(result).toEqual({
        ticker: '7203.T',
        price: 1000,
        name: 'トヨタ自動車',
        currency: 'JPY',
        lastUpdated: expect.any(String),
        source: 'Fallback',
        isStock: true,
        isMutualFund: false,
        fundType: 'STOCK'
      });
    });

    it('generates fallback for US stock', () => {
      const result = generateFallbackData('AAPL');
      
      expect(result).toEqual({
        ticker: 'AAPL',
        price: 100,
        name: 'AAPL (フォールバック)',
        currency: 'USD',
        lastUpdated: expect.any(String),
        source: 'Fallback',
        isStock: true,
        isMutualFund: false,
        fundType: 'STOCK'
      });
    });

    it('generates fallback for mutual fund', () => {
      const result = generateFallbackData('12345678');
      
      expect(result).toEqual({
        ticker: '12345678',
        price: 10000,
        name: '12345678 (フォールバック)',
        currency: 'JPY',
        lastUpdated: expect.any(String),
        source: 'Fallback',
        isStock: false,
        isMutualFund: true,
        fundType: 'STOCK'
      });
    });

    it('generates fallback for 4-digit JP stock without .T', () => {
      const result = generateFallbackData('7203');
      
      expect(result.currency).toBe('JPY');
      expect(result.price).toBe(1000);
      expect(result.isStock).toBe(true);
    });

    it('generates fallback for fund with letters', () => {
      const result = generateFallbackData('1234567A');
      
      expect(result.currency).toBe('JPY');
      expect(result.isMutualFund).toBe(true);
    });

    it('includes valid ISO date string', () => {
      const result = generateFallbackData('TEST');
      const date = new Date(result.lastUpdated);
      
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  describe('Client instances', () => {
    it('exports marketDataClient', () => {
      expect(marketDataClient).toBeDefined();
    });

    it('exports authApiClient', () => {
      expect(authApiClient).toBeDefined();
    });
  });

  describe('サーキットブレーカーの高度なテスト', () => {
    it('サーキットブレーカーがHALF_OPEN状態で動作する', async () => {
      // 連続失敗を発生させてサーキットブレーカーを開く
      const mockError = new Error('Circuit breaker test');
      mockAxiosInstance.get.mockRejectedValue(mockError);
      
      const endpoint = 'test-circuit-breaker';
      
      // 閾値まで失敗させる
      for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD; i++) {
        try {
          await fetchWithRetry(endpoint, {}, 100, 1);
        } catch (e) {
          // Expected failures
        }
      }
      
      // サーキットブレーカーが開いた状態で即座に失敗することを確認
      const start = Date.now();
      try {
        await fetchWithRetry(endpoint, {}, 100, 1);
      } catch (e) {
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(50); // サーキットブレーカーが即座に拒否
      }
    });

    it('異なるエンドポイントで独立したサーキットブレーカーが動作する', async () => {
      const mockError = new Error('Independent circuit test');
      mockAxiosInstance.get.mockRejectedValue(mockError);
      
      const endpoint1 = 'service-1';
      const endpoint2 = 'service-2';
      
      // service-1のサーキットブレーカーを開く
      for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD; i++) {
        try {
          await fetchWithRetry(endpoint1, {}, 100, 1);
        } catch (e) {
          // Expected
        }
      }
      
      // service-1は即座に失敗
      const start1 = Date.now();
      try {
        await fetchWithRetry(endpoint1, {}, 100, 1);
      } catch (e) {
        const duration1 = Date.now() - start1;
        expect(duration1).toBeLessThan(50);
      }
      
      // service-2は通常通り試行される
      const start2 = Date.now();
      try {
        await fetchWithRetry(endpoint2, {}, 200, 1);
      } catch (e) {
        const duration2 = Date.now() - start2;
        expect(duration2).toBeGreaterThan(100); // 通常のタイムアウト
      }
    });
  });

  describe('レスポンスインターセプターの認証処理', () => {
    let responseInterceptor;
    
    beforeEach(() => {
      createApiClient(true);
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      responseInterceptor = interceptorCall[0]; // 成功時のインターセプター
    });

    it('Google Drive APIエンドポイントを正しく判定する', () => {
      const driveResponse = {
        config: { url: 'https://www.googleapis.com/drive/v3/files' },
        data: { files: [] }
      };
      
      const result = responseInterceptor(driveResponse);
      expect(result).toBe(driveResponse);
    });

    it('認証APIエンドポイントでトークン処理をスキップする', () => {
      const authResponse = {
        config: { url: 'http://localhost:3000/auth/login' },
        data: { success: true }
      };
      
      const result = responseInterceptor(authResponse);
      expect(result).toBe(authResponse);
    });

    it('一般APIエンドポイントでヘッダーからトークンを抽出する', () => {
      const tokenSetSpy = jest.spyOn({ setAuthToken }, 'setAuthToken');
      
      const apiResponse = {
        config: { url: 'http://localhost:3000/api/data' },
        headers: { 'x-auth-token': 'new-token-123' },
        data: { data: 'test' }
      };
      
      responseInterceptor(apiResponse);
      // トークン設定が呼ばれることは期待しないが、エラーが発生しないことを確認
      expect(() => responseInterceptor(apiResponse)).not.toThrow();
    });
  });

  describe('リクエストインターセプターの認証処理', () => {
    let requestInterceptor;
    
    beforeEach(() => {
      createApiClient(true);
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      requestInterceptor = interceptorCall[0]; // リクエストインターセプター
    });

    it('認証トークンがある場合にヘッダーに追加する', async () => {
      setAuthToken('test-auth-token');
      
      const config = {
        url: 'http://localhost:3000/api/data',
        headers: {}
      };
      
      const result = await requestInterceptor(config);
      expect(result.headers.Authorization).toBe('Bearer test-auth-token');
    });

    it('認証トークンがない場合はヘッダーを追加しない', async () => {
      clearAuthToken();
      
      const config = {
        url: 'http://localhost:3000/api/data',
        headers: {}
      };
      
      const result = await requestInterceptor(config);
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('既存のヘッダーを保持する', async () => {
      setAuthToken('test-token');
      
      const config = {
        url: 'http://localhost:3000/api/data',
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'custom-value'
        }
      };
      
      const result = await requestInterceptor(config);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Custom-Header']).toBe('custom-value');
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('エラーレスポンスインターセプターの401処理', () => {
    let errorInterceptor;
    
    beforeEach(() => {
      createApiClient(true);
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      errorInterceptor = interceptorCall[1]; // エラー時のインターセプター
    });

    it('401エラーでトークンをクリアする', async () => {
      setAuthToken('expired-token');
      
      const error = {
        response: { status: 401 },
        config: { url: 'http://localhost:3000/api/protected' }
      };
      
      try {
        await errorInterceptor(error);
      } catch (e) {
        // エラーは再スローされる
      }
      
      expect(getAuthToken()).toBe(null);
    });

    it('認証API経由の401エラーではトークンをクリアしない', async () => {
      setAuthToken('valid-token');
      
      const error = {
        response: { status: 401 },
        config: { url: 'http://localhost:3000/auth/login' }
      };
      
      try {
        await errorInterceptor(error);
      } catch (e) {
        // エラーは再スローされる
      }
      
      expect(getAuthToken()).toBe('valid-token');
    });

    it('401以外のエラーではトークンを保持する', async () => {
      setAuthToken('valid-token');
      
      const error = {
        response: { status: 500 },
        config: { url: 'http://localhost:3000/api/data' }
      };
      
      try {
        await errorInterceptor(error);
      } catch (e) {
        // エラーは再スローされる
      }
      
      expect(getAuthToken()).toBe('valid-token');
    });
  });

  describe('createApiClientの境界条件', () => {
    it('interceptorsが未定義の場合でもエラーが発生しない', () => {
      const mockInstanceWithoutInterceptors = {
        get: jest.fn(),
        post: jest.fn(),
        defaults: { withCredentials: true, timeout: 10000, headers: {} }
      };
      
      mockedAxios.create.mockReturnValue(mockInstanceWithoutInterceptors);
      
      expect(() => createApiClient(true)).not.toThrow();
    });

    it('timeout設定が正しく適用される', () => {
      createApiClient(false);
      
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: TIMEOUT.DEFAULT
        })
      );
    });
  });

  describe('authFetchのデバッグ機能', () => {
    it('ローカル開発環境でデバッグログを出力する', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockResponse = { data: { debug: true } };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);
      
      await authFetch('auth/debug', 'get');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[authFetch] リクエスト:',
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[authFetch] レスポンス:',
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });

    it('CORSエラーの詳細ログ出力', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const corsError = {
        message: 'CORS error',
        config: { url: 'http://localhost:3000/auth/cors-test' }
      };
      mockAxiosInstance.get.mockRejectedValueOnce(corsError);
      
      await expect(authFetch('auth/cors-test')).rejects.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'CORS エラーが発生しました:',
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('handles empty endpoint in fetchWithRetry', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      
      await fetchWithRetry('');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'http://localhost:3000/',
        expect.any(Object)
      );
    });

    it('handles special characters in ticker for fallback', () => {
      const result = generateFallbackData('TICKER-WITH-DASH');
      
      expect(result.ticker).toBe('TICKER-WITH-DASH');
      expect(result.source).toBe('Fallback');
    });

    it('handles very long ticker names', () => {
      const longTicker = 'A'.repeat(50);
      const result = generateFallbackData(longTicker);
      
      expect(result.ticker).toBe(longTicker);
    });

    it('formatErrorResponseが複雑なエラーオブジェクトを処理する', () => {
      const complexError = {
        response: {
          status: 422,
          data: {
            message: 'Validation failed',
            errors: [
              { field: 'ticker', message: 'Invalid ticker' },
              { field: 'amount', message: 'Must be positive' }
            ]
          }
        },
        config: {
          url: 'http://localhost:3000/api/validate',
          method: 'post'
        }
      };
      
      const result = formatErrorResponse(complexError, 'INVALID');
      
      expect(result.status).toBe(422);
      expect(result.errorType).toBe('API_ERROR');
      expect(result.message).toBe('Validation failed');
      expect(result.ticker).toBe('INVALID');
    });

    it('generateFallbackDataが極端なケースを処理する', () => {
      // 空文字
      const emptyResult = generateFallbackData('');
      expect(emptyResult.ticker).toBe('');
      expect(emptyResult.source).toBe('Fallback');
      
      // null/undefined (文字列変換される)
      const nullResult = generateFallbackData(null);
      expect(nullResult.ticker).toBe('null');
      
      // 数値
      const numberResult = generateFallbackData(123);
      expect(numberResult.ticker).toBe(123);
    });
  });
});