/**
 * APIユーティリティの単体テスト
 *
 * @file src/__tests__/unit/utils/apiUtils.test.ts
 */

// --- Hoisted mocks (accessible in vi.mock factories) ---
const {
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosPut,
  mockAxiosDelete,
  mockAxiosInstance,
  mockAxiosStaticPost,
  mockAddTokenToRequest,
  mockGetApiEndpoint,
  mockLogger,
  interceptorCallbacks,
} = vi.hoisted(() => {
  const interceptorCallbacks = {
    request: [] as Array<{ fulfilled: Function; rejected?: Function }>,
    response: [] as Array<{ fulfilled: Function; rejected?: Function }>,
  };

  const mockAxiosGet = vi.fn();
  const mockAxiosPost = vi.fn();
  const mockAxiosPut = vi.fn();
  const mockAxiosDelete = vi.fn();
  const mockAxiosInstance: any = vi.fn(); // callable for retry

  Object.assign(mockAxiosInstance, {
    get: mockAxiosGet,
    post: mockAxiosPost,
    put: mockAxiosPut,
    delete: mockAxiosDelete,
    interceptors: {
      request: {
        use: vi.fn((fulfilled: Function, rejected?: Function) => {
          interceptorCallbacks.request.push({ fulfilled, rejected });
        }),
      },
      response: {
        use: vi.fn((fulfilled: Function, rejected?: Function) => {
          interceptorCallbacks.response.push({ fulfilled, rejected });
        }),
      },
    },
  });

  return {
    mockAxiosGet,
    mockAxiosPost,
    mockAxiosPut,
    mockAxiosDelete,
    mockAxiosInstance,
    mockAxiosStaticPost: vi.fn(),
    mockAddTokenToRequest: vi.fn().mockResolvedValue(undefined),
    mockGetApiEndpoint: vi.fn().mockResolvedValue('https://api.test.com/endpoint'),
    mockLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() },
    interceptorCallbacks,
  };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    post: mockAxiosStaticPost,
    get: vi.fn(),
  },
  __esModule: true,
}));

vi.mock('@/utils/envUtils', () => ({
  getApiEndpoint: mockGetApiEndpoint,
  isLocalDevelopment: vi.fn().mockReturnValue(false),
}));

vi.mock('@/utils/csrfManager', () => ({
  default: { addTokenToRequest: mockAddTokenToRequest },
}));

vi.mock('@/utils/errorHandler', () => ({
  handleApiError: vi.fn((err: any) => err),
}));

vi.mock('@/utils/logger', () => ({
  default: mockLogger,
}));

vi.mock('@/utils/japaneseStockNames', () => ({
  getJapaneseStockName: vi.fn((ticker: string) => ticker),
}));

vi.mock('@/utils/fundUtils', () => ({
  guessFundType: vi.fn().mockReturnValue('ETF'),
  FUND_TYPES: { STOCK: 'STOCK', MUTUAL_FUND: 'MUTUAL_FUND', ETF: 'ETF' },
}));

// Now import module under test (after mocks)
import {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  formatErrorResponse,
  generateFallbackData,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
  refreshAccessToken,
  createApiClient,
  fetchWithRetry,
  authFetch,
  wait,
  RETRY,
  TIMEOUT,
} from '@/utils/apiUtils';

// Helper: get the interceptor callbacks registered by the LAST createApiClient call
function getLatestInterceptors() {
  return {
    requestFulfilled: interceptorCallbacks.request[interceptorCallbacks.request.length - 1]?.fulfilled,
    requestRejected: interceptorCallbacks.request[interceptorCallbacks.request.length - 1]?.rejected,
    responseFulfilled: interceptorCallbacks.response[interceptorCallbacks.response.length - 1]?.fulfilled,
    responseRejected: interceptorCallbacks.response[interceptorCallbacks.response.length - 1]?.rejected,
  };
}

describe('apiUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthToken();
    resetAllCircuitBreakers();
  });

  afterEach(() => {
    clearAuthToken();
    resetAllCircuitBreakers();
    vi.useRealTimers();
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

    it('レスポンスのmessageが無い場合はステータスコードを含むメッセージ', () => {
      const error = {
        message: 'Request failed',
        response: { status: 404, data: {} },
      };
      const result = formatErrorResponse(error);
      expect(result.message).toBe('API エラー (404)');
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
      expect(result.price).toBe(230);
      expect(result.isStock).toBe(true);
      expect(result.isMutualFund).toBe(false);
    });

    it('lastUpdatedが有効なISO文字列', () => {
      const result = generateFallbackData('AAPL');
      expect(() => new Date(result.lastUpdated)).not.toThrow();
      expect(new Date(result.lastUpdated).toISOString()).toBe(result.lastUpdated);
    });

    it('フォールバック価格リストに無い銘柄はデフォルト100', () => {
      const result = generateFallbackData('UNKNOWN_TICKER');
      expect(result.price).toBe(100);
      expect(result.currency).toBe('USD');
    });
  });

  // ─── サーキットブレーカー ──────────────────────────────

  describe('circuit breaker', () => {
    it('resetCircuitBreakerが個別リセットする', () => {
      expect(() => resetCircuitBreaker('test-endpoint')).not.toThrow();
    });

    it('resetAllCircuitBreakersが全てリセットする', () => {
      expect(() => resetAllCircuitBreakers()).not.toThrow();
    });

    it('存在しないブレーカーのリセットはエラーにならない', () => {
      expect(() => resetCircuitBreaker('nonexistent')).not.toThrow();
    });
  });

  // ─── createApiClient ──────────────────────────────────

  describe('createApiClient', () => {
    it('axios.createを呼んでクライアントを作成する', () => {
      const client = createApiClient(false);
      expect(client).toBeDefined();
    });

    it('リクエストインターセプターとレスポンスインターセプターが設定される', () => {
      createApiClient(false);
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    describe('request interceptor', () => {
      it('GETリクエストではCSRFトークンを追加しない', async () => {
        createApiClient(false);
        const { requestFulfilled } = getLatestInterceptors();

        const config = { method: 'get', headers: {} as Record<string, string>, url: '/test' };
        const result = await requestFulfilled(config);

        expect(mockAddTokenToRequest).not.toHaveBeenCalled();
        expect(result.withCredentials).toBe(true);
      });

      it('POSTリクエストではCSRFトークンを追加する', async () => {
        createApiClient(false);
        const { requestFulfilled } = getLatestInterceptors();

        const config = { method: 'post', headers: {} as Record<string, string>, url: '/test' };
        await requestFulfilled(config);

        expect(mockAddTokenToRequest).toHaveBeenCalledWith(config);
      });

      it('PUTリクエストではCSRFトークンを追加する', async () => {
        createApiClient(false);
        const { requestFulfilled } = getLatestInterceptors();

        const config = { method: 'put', headers: {} as Record<string, string>, url: '/test' };
        await requestFulfilled(config);

        expect(mockAddTokenToRequest).toHaveBeenCalledWith(config);
      });

      it('DELETEリクエストではCSRFトークンを追加する', async () => {
        createApiClient(false);
        const { requestFulfilled } = getLatestInterceptors();

        const config = { method: 'delete', headers: {} as Record<string, string>, url: '/test' };
        await requestFulfilled(config);

        expect(mockAddTokenToRequest).toHaveBeenCalledWith(config);
      });

      it('CSRFトークン追加が失敗してもリクエストは続行する', async () => {
        mockAddTokenToRequest.mockRejectedValueOnce(new Error('CSRF error'));

        createApiClient(false);
        const { requestFulfilled } = getLatestInterceptors();

        const config = { method: 'post', headers: {} as Record<string, string>, url: '/test' };
        const result = await requestFulfilled(config);

        expect(result).toBeDefined();
        expect(result.withCredentials).toBe(true);
      });

      it('withAuth=trueの場合、トークンがあればAuthorizationヘッダーを設定する', async () => {
        setAuthToken('my-jwt-token');

        createApiClient(true);
        const { requestFulfilled } = getLatestInterceptors();

        const config = { method: 'get', headers: {} as Record<string, string>, url: '/test' };
        const result = await requestFulfilled(config);

        expect(result.headers['Authorization']).toBe('Bearer my-jwt-token');
      });

      it('withAuth=trueでトークンが無い場合はAuthorizationヘッダーを設定しない', async () => {
        clearAuthToken();
        createApiClient(true);
        const { requestFulfilled } = getLatestInterceptors();

        const config = { method: 'get', headers: {} as Record<string, string>, url: '/test' };
        const result = await requestFulfilled(config);

        expect(result.headers['Authorization']).toBeUndefined();
      });

      it('withAuth=falseの場合はAuthorizationヘッダーを設定しない', async () => {
        setAuthToken('my-jwt-token');
        createApiClient(false);
        const { requestFulfilled } = getLatestInterceptors();

        const config = { method: 'get', headers: {} as Record<string, string>, url: '/test' };
        const result = await requestFulfilled(config);

        expect(result.headers['Authorization']).toBeUndefined();
      });

      it('リクエストエラー時はrejectする', async () => {
        createApiClient(false);
        const { requestRejected } = getLatestInterceptors();

        const error = new Error('request error');
        await expect(requestRejected!(error)).rejects.toThrow('request error');
      });

      it('withCredentialsが常にtrueに設定される', async () => {
        createApiClient(false);
        const { requestFulfilled } = getLatestInterceptors();

        const config = { method: 'get', headers: {} as Record<string, string>, url: '/test', withCredentials: false };
        const result = await requestFulfilled(config);

        expect(result.withCredentials).toBe(true);
      });
    });

    describe('response interceptor', () => {
      it('レスポンスにaccessTokenがあればsetAuthTokenが呼ばれる', () => {
        createApiClient(false);
        const { responseFulfilled } = getLatestInterceptors();

        const response = {
          data: { data: { accessToken: 'new-jwt-token' } },
          config: { method: 'post', url: '/auth/login' },
          status: 200,
        };

        const result = responseFulfilled(response);
        expect(getAuthToken()).toBe('new-jwt-token');
        expect(result).toBe(response);
      });

      it('レスポンスにレガシー形式のtokenがあればsetAuthTokenが呼ばれる', () => {
        createApiClient(false);
        const { responseFulfilled } = getLatestInterceptors();

        const response = {
          data: { token: 'legacy-token' },
          config: { method: 'post', url: '/auth/login' },
          status: 200,
        };

        responseFulfilled(response);
        expect(getAuthToken()).toBe('legacy-token');
      });

      it('レスポンスにaccess_tokenがあればsetAuthTokenが呼ばれる', () => {
        createApiClient(false);
        const { responseFulfilled } = getLatestInterceptors();

        const response = {
          data: { access_token: 'access-token-value' },
          config: { method: 'post', url: '/auth/login' },
          status: 200,
        };

        responseFulfilled(response);
        expect(getAuthToken()).toBe('access-token-value');
      });

      it('レスポンスにauth_tokenがあればsetAuthTokenが呼ばれる', () => {
        createApiClient(false);
        const { responseFulfilled } = getLatestInterceptors();

        const response = {
          data: { auth_token: 'auth-token-value' },
          config: { method: 'post', url: '/auth' },
          status: 200,
        };

        responseFulfilled(response);
        expect(getAuthToken()).toBe('auth-token-value');
      });

      it('レスポンスにjwtフィールドがあればsetAuthTokenが呼ばれる', () => {
        createApiClient(false);
        const { responseFulfilled } = getLatestInterceptors();

        const response = {
          data: { jwt: 'jwt-value' },
          config: { method: 'post', url: '/auth' },
          status: 200,
        };

        responseFulfilled(response);
        expect(getAuthToken()).toBe('jwt-value');
      });

      it('レスポンスにjwtTokenフィールドがあればsetAuthTokenが呼ばれる', () => {
        createApiClient(false);
        const { responseFulfilled } = getLatestInterceptors();

        const response = {
          data: { jwtToken: 'jwtToken-value' },
          config: { method: 'post', url: '/auth' },
          status: 200,
        };

        responseFulfilled(response);
        expect(getAuthToken()).toBe('jwtToken-value');
      });

      it('レスポンスにauthTokenフィールドがあればsetAuthTokenが呼ばれる', () => {
        createApiClient(false);
        const { responseFulfilled } = getLatestInterceptors();

        const response = {
          data: { authToken: 'authToken-value' },
          config: { method: 'post', url: '/auth' },
          status: 200,
        };

        responseFulfilled(response);
        expect(getAuthToken()).toBe('authToken-value');
      });

      it('レスポンスにトークンが無い場合はauthTokenが変更されない', () => {
        setAuthToken('existing-token');
        createApiClient(false);
        const { responseFulfilled } = getLatestInterceptors();

        const response = {
          data: { someData: 'value' },
          config: { method: 'get', url: '/api/data' },
          status: 200,
        };

        responseFulfilled(response);
        expect(getAuthToken()).toBe('existing-token');
      });

      it('401エラーでリフレッシュを試行しリトライする', async () => {
        createApiClient(true);
        const { responseRejected } = getLatestInterceptors();

        // Mock refreshAccessToken: axios.post will be called
        mockAxiosStaticPost.mockResolvedValueOnce({
          data: { data: { accessToken: 'refreshed-token' } },
        });

        // Make the retried request succeed via client(originalRequest)
        mockAxiosInstance.mockResolvedValueOnce({
          data: { success: true },
        });

        const error = {
          response: { status: 401, data: {} },
          config: { url: '/api/protected', headers: {} as Record<string, string>, _retry: false },
        };

        const result = await responseRejected(error);
        expect(result.data.success).toBe(true);
      });

      it('401エラーでrefreshエンドポイント自体はリトライしない', async () => {
        createApiClient(true);
        const { responseRejected } = getLatestInterceptors();

        const error = {
          response: { status: 401, data: {} },
          config: { url: '/auth/refresh', headers: {} as Record<string, string>, _retry: false },
        };

        await expect(responseRejected(error)).rejects.toBeDefined();
      });

      it('401エラーでloginエンドポイント自体はリトライしない', async () => {
        createApiClient(true);
        const { responseRejected } = getLatestInterceptors();

        const error = {
          response: { status: 401, data: {} },
          config: { url: '/auth/google/login', headers: {} as Record<string, string>, _retry: false },
        };

        await expect(responseRejected(error)).rejects.toBeDefined();
      });

      it('401エラーでInvalid tokenメッセージがあればトークンをクリアする', async () => {
        setAuthToken('invalid-token');
        createApiClient(true);
        const { responseRejected } = getLatestInterceptors();

        // Mock refresh to fail
        mockAxiosStaticPost.mockRejectedValueOnce({
          response: { status: 401 },
          message: 'Unauthorized',
        });

        const error = {
          response: { status: 401, data: { message: 'Invalid token provided' } },
          config: { url: '/api/data', headers: {} as Record<string, string>, _retry: false },
        };

        await expect(responseRejected(error)).rejects.toBeDefined();
        expect(getAuthToken()).toBeNull();
      });

      it('401エラーでdriveエンドポイントの場合はインターセプター側ではトークンをクリアしない', async () => {
        setAuthToken('valid-token');
        createApiClient(true);
        const { responseRejected } = getLatestInterceptors();

        // Mock refresh to fail with network error (not 401/403) so refreshAccessToken preserves the token
        mockAxiosStaticPost.mockRejectedValueOnce({
          message: 'Network Error',
          // No response: network error => refreshAccessToken preserves token
        });

        const error = {
          response: { status: 401, data: { message: 'Invalid token' } },
          config: { url: '/drive/files', headers: {} as Record<string, string>, _retry: false },
        };

        await expect(responseRejected(error)).rejects.toBeDefined();
        // Drive endpoint: interceptor does NOT call clearAuthToken even with 'Invalid token' message
        // And refreshAccessToken also preserves the token (network error, not 401/403)
        expect(getAuthToken()).toBe('valid-token');
      });

      it('非401エラーはそのままrejectされる', async () => {
        createApiClient(false);
        const { responseRejected } = getLatestInterceptors();

        const error = {
          response: { status: 500, data: { message: 'Server error' } },
          config: { url: '/api/data', headers: {} },
        };

        await expect(responseRejected(error)).rejects.toBeDefined();
      });

      it('既にリトライ済み(_retry=true)の401はリフレッシュしない', async () => {
        createApiClient(true);
        const { responseRejected } = getLatestInterceptors();

        const error = {
          response: { status: 401, data: {} },
          config: { url: '/api/data', headers: {} as Record<string, string>, _retry: true },
        };

        await expect(responseRejected(error)).rejects.toBeDefined();
        expect(mockAxiosStaticPost).not.toHaveBeenCalled();
      });

      it('401リフレッシュ成功でnewTokenがnullの場合はリトライしない', async () => {
        createApiClient(true);
        const { responseRejected } = getLatestInterceptors();

        // Mock refresh returns but no token
        mockAxiosStaticPost.mockResolvedValueOnce({
          data: { data: {} },
        });

        const error = {
          response: { status: 401, data: {} },
          config: { url: '/api/data', headers: {} as Record<string, string>, _retry: false },
        };

        await expect(responseRejected(error)).rejects.toBeDefined();
      });

      it('responseがないエラーもrejectされる', async () => {
        createApiClient(false);
        const { responseRejected } = getLatestInterceptors();

        const error = {
          config: { url: '/api/data', headers: {} },
          message: 'Network Error',
        };

        await expect(responseRejected(error)).rejects.toBeDefined();
      });
    });
  });

  // ─── refreshAccessToken ────────────────────────────────

  describe('refreshAccessToken', () => {
    it('リフレッシュ成功時に新しいトークンを返す', async () => {
      mockAxiosStaticPost.mockResolvedValueOnce({
        data: { data: { accessToken: 'new-access-token' } },
      });

      const token = await refreshAccessToken();
      expect(token).toBe('new-access-token');
      expect(getAuthToken()).toBe('new-access-token');
    });

    it('トップレベルaccessTokenフィールドからもトークンを取得可能', async () => {
      mockAxiosStaticPost.mockResolvedValueOnce({
        data: { accessToken: 'top-level-token' },
      });

      const token = await refreshAccessToken();
      expect(token).toBe('top-level-token');
    });

    it('レスポンスにaccessTokenが無い場合はnullを返す', async () => {
      mockAxiosStaticPost.mockResolvedValueOnce({
        data: { someOtherData: true },
      });

      const token = await refreshAccessToken();
      expect(token).toBeNull();
    });

    it('リフレッシュ失敗時(401)はトークンをクリアしてnullを返す', async () => {
      setAuthToken('old-token');
      mockAxiosStaticPost.mockRejectedValueOnce({
        message: 'Unauthorized',
        response: { status: 401 },
      });

      const token = await refreshAccessToken();
      expect(token).toBeNull();
      expect(getAuthToken()).toBeNull();
    });

    it('リフレッシュ失敗時(403)はトークンをクリアしてnullを返す', async () => {
      setAuthToken('old-token');
      mockAxiosStaticPost.mockRejectedValueOnce({
        message: 'Forbidden',
        response: { status: 403 },
      });

      const token = await refreshAccessToken();
      expect(token).toBeNull();
      expect(getAuthToken()).toBeNull();
    });

    it('ネットワークエラー時はトークンを保持してnullを返す', async () => {
      setAuthToken('existing-token');
      mockAxiosStaticPost.mockRejectedValueOnce({
        message: 'Network Error',
      });

      const token = await refreshAccessToken();
      expect(token).toBeNull();
      expect(getAuthToken()).toBe('existing-token');
    });

    it('重複リフレッシュリクエストはキューイングされる', async () => {
      let resolveRefresh!: Function;
      mockAxiosStaticPost.mockImplementationOnce(() => new Promise((resolve) => {
        resolveRefresh = resolve;
      }));

      // Both calls start synchronously. The first sets isRefreshing=true before await.
      // The second sees isRefreshing=true and queues itself.
      const promise1 = refreshAccessToken();
      const promise2 = refreshAccessToken();

      // Allow microtasks to process (getApiEndpoint is async)
      await new Promise(resolve => setTimeout(resolve, 0));

      // Only one actual HTTP request should have been made
      expect(mockAxiosStaticPost).toHaveBeenCalledTimes(1);

      resolveRefresh({
        data: { data: { accessToken: 'shared-token' } },
      });

      const [token1, token2] = await Promise.all([promise1, promise2]);
      expect(token1).toBe('shared-token');
      expect(token2).toBe('shared-token');
    });

    it('リフレッシュ失敗時はキュー内のサブスクライバにもnullを通知', async () => {
      let rejectRefresh!: Function;
      mockAxiosStaticPost.mockImplementationOnce(() => new Promise((_, reject) => {
        rejectRefresh = reject;
      }));

      const promise1 = refreshAccessToken();
      const promise2 = refreshAccessToken();

      // Allow microtasks to process (getApiEndpoint is async)
      await new Promise(resolve => setTimeout(resolve, 0));

      rejectRefresh({ message: 'Refresh failed', response: { status: 401 } });

      const [token1, token2] = await Promise.all([promise1, promise2]);
      expect(token1).toBeNull();
      expect(token2).toBeNull();
    });
  });

  // ─── fetchWithRetry ────────────────────────────────────

  describe('fetchWithRetry', () => {
    it('成功時にデータを返す', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { price: 150 },
      });

      const result = await fetchWithRetry('stocks/AAPL', {}, 10000, 0, vi.fn());
      expect(result).toEqual({ price: 150 });
    });

    it('HTTPエンドポイントはgetApiEndpointを呼ばない', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { ok: true },
      });

      await fetchWithRetry('https://external.api.com/data', {}, 10000, 0, vi.fn());
      expect(mockAxiosGet.mock.calls[0][0]).toBe('https://external.api.com/data');
    });

    it('スラッシュで始まるエンドポイントはgetApiEndpointを呼ばない', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { ok: true },
      });

      await fetchWithRetry('/api-proxy/data', {}, 10000, 0, vi.fn());
      expect(mockAxiosGet.mock.calls[0][0]).toBe('/api-proxy/data');
    });

    it('相対パスのエンドポイントはgetApiEndpointを呼ぶ', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { ok: true },
      });

      await fetchWithRetry('stocks/AAPL', {}, 10000, 0, vi.fn());
      expect(mockGetApiEndpoint).toHaveBeenCalledWith('stocks/AAPL');
    });

    it('失敗時にリトライし最終的に成功する', async () => {
      const mockDelay = vi.fn().mockResolvedValue(undefined);

      mockAxiosGet
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ data: { price: 200 } });

      const result = await fetchWithRetry('stocks/RETRY_OK', {}, 10000, 1, mockDelay);
      expect(result).toEqual({ price: 200 });
      expect(mockDelay).toHaveBeenCalledTimes(1);
      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });

    it('リトライ回数を超えるとエラーを投げる', async () => {
      const mockDelay = vi.fn().mockResolvedValue(undefined);

      mockAxiosGet
        .mockRejectedValueOnce(new Error('Persistent error'))
        .mockRejectedValueOnce(new Error('Persistent error'));

      await expect(
        fetchWithRetry('stocks/FAIL_ALL', {}, 10000, 1, mockDelay)
      ).rejects.toThrow('Persistent error');
    });

    it('サーキットブレーカーがOPENの場合はすぐにエラーを投げる', async () => {
      const mockDelay = vi.fn().mockResolvedValue(undefined);

      const endpoint = 'stocks/CB_OPEN_TEST';
      for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD; i++) {
        mockAxiosGet.mockRejectedValueOnce(new Error('fail'));
        try {
          await fetchWithRetry(endpoint, {}, 10000, 0, mockDelay);
        } catch (_) {}
      }

      await expect(
        fetchWithRetry(endpoint, {}, 10000, 0, mockDelay)
      ).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('パラメータとタイムアウトをmarketDataClient.getに渡す', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { price: 100 },
      });

      await fetchWithRetry('stocks/VOO_PARAMS', { period: '1d' }, 5000, 0, vi.fn());

      const callArgs = mockAxiosGet.mock.calls[0];
      expect(callArgs[1].params).toEqual({ period: '1d' });
      expect(callArgs[1].timeout).toBe(5000);
    });

    it('リトライごとにタイムアウトが延長される', async () => {
      const mockDelay = vi.fn().mockResolvedValue(undefined);

      mockAxiosGet
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ data: { ok: true } });

      await fetchWithRetry('stocks/TIMEOUT_EXT', {}, 5000, 1, mockDelay);

      // First call: timeout=5000 + 0*2000 = 5000
      expect(mockAxiosGet.mock.calls[0][1].timeout).toBe(5000);
      // Second call (retry 1): timeout=5000 + 1*2000 = 7000
      expect(mockAxiosGet.mock.calls[1][1].timeout).toBe(7000);
    });
  });

  // ─── authFetch ─────────────────────────────────────────

  describe('authFetch', () => {
    it('GETリクエストを正しく実行する', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { user: { name: 'Test' } },
      });

      const result = await authFetch('users/me', 'get');
      expect(result).toEqual({ user: { name: 'Test' } });
      expect(mockAxiosGet).toHaveBeenCalled();
    });

    it('POSTリクエストを正しく実行する', async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: { success: true },
      });

      const result = await authFetch('data/save', 'post', { key: 'value' });
      expect(result).toEqual({ success: true });
      expect(mockAxiosPost).toHaveBeenCalled();
    });

    it('PUTリクエストを正しく実行する', async () => {
      mockAxiosPut.mockResolvedValueOnce({
        data: { updated: true },
      });

      const result = await authFetch('data/update', 'put', { key: 'new-value' });
      expect(result).toEqual({ updated: true });
      expect(mockAxiosPut).toHaveBeenCalled();
    });

    it('DELETEリクエストを正しく実行する', async () => {
      mockAxiosDelete.mockResolvedValueOnce({
        data: { deleted: true },
      });

      const result = await authFetch('data/remove', 'delete', { id: '123' });
      expect(result).toEqual({ deleted: true });
      expect(mockAxiosDelete).toHaveBeenCalled();
    });

    it('未対応のHTTPメソッドでエラーを投げる', async () => {
      await expect(
        authFetch('endpoint', 'patch')
      ).rejects.toThrow('未対応のHTTPメソッド: patch');
    });

    it('HTTPエンドポイントはgetApiEndpointを呼ばない', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { ok: true },
      });

      await authFetch('https://external.com/api', 'get');
      expect(mockAxiosGet.mock.calls[0][0]).toBe('https://external.com/api');
    });

    it('スラッシュで始まるエンドポイントはgetApiEndpointを呼ばない', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { ok: true },
      });

      await authFetch('/api-proxy/auth', 'get');
      expect(mockAxiosGet.mock.calls[0][0]).toBe('/api-proxy/auth');
    });

    it('相対パスのエンドポイントはgetApiEndpointを呼ぶ', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { ok: true },
      });

      await authFetch('users/profile', 'get');
      expect(mockGetApiEndpoint).toHaveBeenCalledWith('users/profile');
    });

    it('エラー時にサーキットブレーカーにfailureを記録する', async () => {
      const endpoint = 'auth-cb-fail-test';

      for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD; i++) {
        mockAxiosGet.mockRejectedValueOnce(new Error('Server Error'));
        try { await authFetch(endpoint, 'get'); } catch (_) {}
      }

      await expect(authFetch(endpoint, 'get')).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('成功時にサーキットブレーカーをリセットする', async () => {
      const endpoint = 'auth-cb-reset-ok';

      for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD - 1; i++) {
        mockAxiosGet.mockRejectedValueOnce(new Error('fail'));
        try { await authFetch(endpoint, 'get'); } catch (_) {}
      }

      mockAxiosGet.mockResolvedValueOnce({ data: { ok: true } });
      const result = await authFetch(endpoint, 'get');
      expect(result).toEqual({ ok: true });

      for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD - 1; i++) {
        mockAxiosGet.mockRejectedValueOnce(new Error('fail'));
        try { await authFetch(endpoint, 'get'); } catch (_) {}
      }

      mockAxiosGet.mockResolvedValueOnce({ data: { ok: true } });
      const result2 = await authFetch(endpoint, 'get');
      expect(result2).toEqual({ ok: true });
    });

    it('400エラーの場合はレスポンスデータを返す（throwしない）', async () => {
      mockAxiosGet.mockRejectedValueOnce({
        message: 'Bad Request',
        response: {
          status: 400,
          data: { error: 'Validation failed', details: ['field is required'] },
          headers: {},
        },
      });

      const result = await authFetch('data/validate', 'get');
      expect(result).toEqual({ error: 'Validation failed', details: ['field is required'] });
    });

    it('Network Errorの詳細情報をログ出力する', async () => {
      mockAxiosGet.mockRejectedValueOnce({
        message: 'Network Error',
        config: {
          url: 'https://api.test.com/data',
          method: 'get',
          headers: {},
          data: null,
          baseURL: '',
          withCredentials: true,
        },
      });

      await expect(authFetch('network-err-test', 'get')).rejects.toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Network Error詳細:',
        expect.objectContaining({
          url: 'https://api.test.com/data',
        })
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'CORSエラーの可能性があります。以下を確認してください:'
      );
    });

    it('configのheadersを正しくマージする', async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: { ok: true },
      });

      await authFetch('data/upload', 'post', { file: 'data' }, {
        headers: { 'X-Custom': 'value' },
      });

      const callArgs = mockAxiosPost.mock.calls[0];
      expect(callArgs[2].headers['X-Custom']).toBe('value');
      expect(callArgs[2].withCredentials).toBe(true);
    });

    it('GETリクエストでdataをparamsとして渡す', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: { result: 'ok' },
      });

      await authFetch('search', 'get', { q: 'test' });

      const callArgs = mockAxiosGet.mock.calls[0];
      expect(callArgs[1].params).toEqual({ q: 'test' });
    });

    it('DELETEリクエストでdataをリクエストボディとして渡す', async () => {
      mockAxiosDelete.mockResolvedValueOnce({
        data: { deleted: true },
      });

      await authFetch('items', 'delete', { ids: [1, 2, 3] });

      const callArgs = mockAxiosDelete.mock.calls[0];
      expect(callArgs[1].data).toEqual({ ids: [1, 2, 3] });
    });

    it('非400のエラーレスポンスはthrowする', async () => {
      mockAxiosGet.mockRejectedValueOnce({
        message: 'Internal Server Error',
        response: {
          status: 500,
          data: { error: 'Something went wrong' },
          headers: {},
        },
      });

      await expect(authFetch('server-error', 'get')).rejects.toBeDefined();
    });

    it('エラーレスポンスが無い場合もthrowする', async () => {
      mockAxiosGet.mockRejectedValueOnce({
        message: 'Connection refused',
      });

      await expect(authFetch('connection-fail', 'get')).rejects.toBeDefined();
    });

    it('大文字小文字に関わらずHTTPメソッドを正しく処理する', async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: { ok: true },
      });

      await authFetch('test', 'POST', { data: 1 });
      expect(mockAxiosPost).toHaveBeenCalled();
    });
  });

  // ─── CircuitBreaker state transitions ──────────────────

  describe('CircuitBreaker state transitions', () => {
    it('CLOSEDからOPENに遷移する', async () => {
      const endpoint = 'cb-closed-to-open';
      const mockDelay = vi.fn().mockResolvedValue(undefined);

      for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD; i++) {
        mockAxiosGet.mockRejectedValueOnce(new Error('fail'));
        try {
          await fetchWithRetry(endpoint, {}, 10000, 0, mockDelay);
        } catch (_) {}
      }

      await expect(
        fetchWithRetry(endpoint, {}, 10000, 0, mockDelay)
      ).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('OPENからHALF_OPENに遷移し成功でCLOSEDに戻る', async () => {
      const endpoint = 'cb-half-open-ok';
      const mockDelay = vi.fn().mockResolvedValue(undefined);

      // Open the circuit
      for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD; i++) {
        mockAxiosGet.mockRejectedValueOnce(new Error('fail'));
        try {
          await fetchWithRetry(endpoint, {}, 10000, 0, mockDelay);
        } catch (_) {}
      }

      // Advance time past the circuit breaker timeout
      vi.useFakeTimers();
      vi.advanceTimersByTime(RETRY.CIRCUIT_BREAKER_TIMEOUT + 1000);

      // Now a request should be allowed (HALF_OPEN state)
      mockAxiosGet.mockResolvedValueOnce({
        data: { recovered: true },
      });

      const result = await fetchWithRetry(endpoint, {}, 10000, 0, mockDelay);
      expect(result).toEqual({ recovered: true });

      vi.useRealTimers();

      // Verify it can now handle more requests (CLOSED again)
      mockAxiosGet.mockResolvedValueOnce({
        data: { working: true },
      });
      const result2 = await fetchWithRetry(endpoint, {}, 10000, 0, mockDelay);
      expect(result2).toEqual({ working: true });
    });

    it('resetCircuitBreakerでOPEN状態をリセットする', async () => {
      const endpoint = 'cb-reset-from-open';
      const mockDelay = vi.fn().mockResolvedValue(undefined);

      for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD; i++) {
        mockAxiosGet.mockRejectedValueOnce(new Error('fail'));
        try {
          await fetchWithRetry(endpoint, {}, 10000, 0, mockDelay);
        } catch (_) {}
      }

      await expect(
        fetchWithRetry(endpoint, {}, 10000, 0, mockDelay)
      ).rejects.toThrow('Circuit breaker is OPEN');

      resetCircuitBreaker(endpoint);

      mockAxiosGet.mockResolvedValueOnce({
        data: { price: 100 },
      });
      const result = await fetchWithRetry(endpoint, {}, 10000, 0, mockDelay);
      expect(result).toEqual({ price: 100 });
    });

    it('resetAllCircuitBreakersで全てのOPEN状態をリセットする', async () => {
      const endpoint1 = 'cb-all-1';
      const endpoint2 = 'cb-all-2';
      const mockDelay = vi.fn().mockResolvedValue(undefined);

      for (const ep of [endpoint1, endpoint2]) {
        for (let i = 0; i < RETRY.CIRCUIT_BREAKER_THRESHOLD; i++) {
          mockAxiosGet.mockRejectedValueOnce(new Error('fail'));
          try {
            await fetchWithRetry(ep, {}, 10000, 0, mockDelay);
          } catch (_) {}
        }
      }

      await expect(fetchWithRetry(endpoint1, {}, 10000, 0, mockDelay)).rejects.toThrow('Circuit breaker is OPEN');
      await expect(fetchWithRetry(endpoint2, {}, 10000, 0, mockDelay)).rejects.toThrow('Circuit breaker is OPEN');

      resetAllCircuitBreakers();

      mockAxiosGet.mockResolvedValueOnce({ data: { ok: 1 } });
      mockAxiosGet.mockResolvedValueOnce({ data: { ok: 2 } });

      const r1 = await fetchWithRetry(endpoint1, {}, 10000, 0, mockDelay);
      const r2 = await fetchWithRetry(endpoint2, {}, 10000, 0, mockDelay);
      expect(r1).toEqual({ ok: 1 });
      expect(r2).toEqual({ ok: 2 });
    });
  });

  // ─── wait helper ───────────────────────────────────────

  describe('wait', () => {
    it('指定したミリ秒後に解決する', async () => {
      vi.useFakeTimers();

      const promise = wait(1000);
      vi.advanceTimersByTime(1000);
      await promise;

      vi.useRealTimers();
    });
  });
});
