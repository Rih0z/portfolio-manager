/**
 * ファイルパス: __test__/unit/utils/apiUtils.test.js
 * 
 * APIユーティリティの単体テスト
 * Axiosクライアント生成、リトライ機能付きフェッチ、エラーレスポンス整形のテスト
 * 
 * @author プロジェクトチーム
 * @created 2025-05-21
 * @updated 2025-07-02
 */

// テスト対象モジュールのインポート
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
} from '@/utils/apiUtils';

// Axiosのモック
import axios from 'axios';
jest.mock('axios');

// 他の依存関係のモック
jest.mock('@/utils/envUtils', () => ({
  getApiEndpoint: jest.fn((type) => {
    if (type.startsWith('http') || type.startsWith('/')) return type;
    return Promise.resolve(`https://api.example.com/${type}`);
  }),
  isLocalDevelopment: jest.fn(() => false)
}));

jest.mock('@/utils/csrfManager', () => ({
  default: {
    addTokenToRequest: jest.fn()
  }
}));

jest.mock('@/utils/errorHandler', () => ({
  handleApiError: jest.fn((error) => ({
    ...error,
    sanitized: true
  }))
}));

jest.mock('@/utils/japaneseStockNames', () => ({
  getJapaneseStockName: jest.fn((ticker) => {
    const names = {
      '7203': 'トヨタ自動車',
      '9984': 'ソフトバンクグループ'
    };
    return names[ticker.replace('.T', '')] || ticker;
  })
}));

jest.mock('@/utils/fundUtils', () => ({
  guessFundType: jest.fn(() => 'BALANCED'),
  FUND_TYPES: {
    STOCK: 'STOCK',
    BOND: 'BOND',
    BALANCED: 'BALANCED',
    MONEY_MARKET: 'MONEY_MARKET',
    MUTUAL_FUND: 'MUTUAL_FUND'
  }
}));

describe('APIユーティリティ', () => {
  const originalEnv = process.env;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // 各テスト前の準備
  beforeEach(() => {
    jest.clearAllMocks();
    clearAuthToken();
    resetAllCircuitBreakers();
    
    // コンソール出力の抑制
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    
    // 環境変数の設定
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    
    // 正常なレスポンスのデフォルトモック
    axios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: { success: true } }),
      post: jest.fn().mockResolvedValue({ data: { success: true } }),
      put: jest.fn().mockResolvedValue({ data: { success: true } }),
      delete: jest.fn().mockResolvedValue({ data: { success: true } }),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    });
  });
  
  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    process.env = originalEnv;
  });
  
  describe('createApiClient', () => {
    it('認証なしのAPIクライアントを正しく生成する', () => {
      const client = createApiClient(false);
      
      // Axiosのcreateが呼ばれたことを検証
      expect(axios.create).toHaveBeenCalledTimes(1);
      
      // パラメータを検証 - withCredentialsは常にtrue
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: TIMEOUT.DEFAULT,
          withCredentials: true, // 常にtrue
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
      );
      
      // クライアントのインターセプターが設定されていることを検証
      expect(client.interceptors.request.use).toHaveBeenCalled();
      expect(client.interceptors.response.use).toHaveBeenCalled();
    });
    
    it('認証ありのAPIクライアントを正しく生成する', () => {
      const client = createApiClient(true);
      
      // Axiosのcreateが呼ばれたことを検証
      expect(axios.create).toHaveBeenCalledTimes(1);
      
      // パラメータを検証 - 認証用は短いタイムアウト
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: TIMEOUT.AUTH,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
      );
      
      // クライアントのインターセプターが設定されていることを検証
      expect(client.interceptors.request.use).toHaveBeenCalled();
      expect(client.interceptors.response.use).toHaveBeenCalled();
    });
    
    it('インターセプターが未定義の場合でもクラッシュしない', () => {
      axios.create.mockReturnValue({
        get: jest.fn(),
        interceptors: undefined
      });
      
      expect(() => createApiClient(false)).not.toThrow();
    });
  });
  
  describe('トークン管理', () => {
    it('setAuthToken でトークンを設定できる', () => {
      const token = 'test-token-123';
      setAuthToken(token);
      expect(getAuthToken()).toBe(token);
    });
    
    it('clearAuthToken でトークンをクリアできる', () => {
      setAuthToken('test-token');
      clearAuthToken();
      expect(getAuthToken()).toBeNull();
    });
    
    it('初期状態ではトークンはnull', () => {
      expect(getAuthToken()).toBeNull();
    });
  });
  
  describe('サーキットブレーカー', () => {
    it('resetCircuitBreaker で特定のサーキットブレーカーをリセット', async () => {
      const mockClient = { 
        get: jest.fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockRejectedValueOnce(new Error('fail'))
          .mockRejectedValueOnce(new Error('fail'))
          .mockRejectedValueOnce(new Error('fail'))
          .mockRejectedValueOnce(new Error('fail'))
          .mockRejectedValueOnce(new Error('fail'))
      };
      jest.spyOn(marketDataClient, 'get').mockImplementation(mockClient.get);
      
      // サーキットブレーカーをオープンにする
      for (let i = 0; i < 6; i++) {
        try {
          await fetchWithRetry('test-endpoint', {}, 1000, 0);
        } catch (e) {
          // エラーは無視
        }
      }
      
      // サーキットブレーカーがオープンになったため次の呼び出しは即座に失敗
      await expect(fetchWithRetry('test-endpoint', {}, 1000, 0))
        .rejects.toThrow('Circuit breaker is OPEN');
      
      // リセット
      resetCircuitBreaker('test-endpoint');
      
      // リセット後は呼び出し可能
      mockClient.get.mockResolvedValueOnce({ data: { success: true } });
      const result = await fetchWithRetry('test-endpoint', {}, 1000, 0);
      expect(result).toEqual({ success: true });
    });
    
    it('resetAllCircuitBreakers で全てのサーキットブレーカーをリセット', () => {
      // この関数は内部のMapをクリアするだけなので、
      // エラーが発生しないことを確認
      expect(() => resetAllCircuitBreakers()).not.toThrow();
    });
  });
  
  describe('fetchWithRetry', () => {
    // 正常なレスポンスのテスト用モックデータ
    const mockSuccessResponse = { data: { success: true, data: { test: 'value' } } };
    
    // エラーレスポンスのテスト用モックデータ
    const mockErrorResponse = {
      response: {
        status: 500,
        data: { success: false, message: 'Internal server error' }
      }
    };
    
    // リトライ後成功のテスト用モック
    const mockRetrySuccess = jest.fn()
      .mockRejectedValueOnce(mockErrorResponse)
      .mockResolvedValueOnce(mockSuccessResponse);
    
    // タイムアウトエラー
    const mockTimeoutError = {
      code: 'ECONNABORTED',
      message: 'timeout of 10000ms exceeded'
    };
    
    // ネットワークエラー
    const mockNetworkError = {
      message: 'Network Error'
    };
    
    it('正常にレスポンスを取得できる場合は成功結果を返す', async () => {
      // モックの設定
      const mockClient = {
        get: jest.fn().mockResolvedValue(mockSuccessResponse)
      };
      
      // モジュールをモックして独自のクライアントを注入
      jest.spyOn(marketDataClient, 'get').mockImplementation(mockClient.get);
      
      // テスト実行
      const url = 'https://api.example.com/test';
      const params = { test: 'param' };
      const result = await fetchWithRetry(url, params);
      
      // 関数が正しく呼ばれたことを検証
      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(mockClient.get).toHaveBeenCalledWith(url, {
        params,
        timeout: TIMEOUT.DEFAULT
      });
      
      // 結果を検証
      expect(result).toEqual(mockSuccessResponse.data);
    });
    
    it('一時的なエラーの場合はリトライして成功結果を返す', async () => {
      const mockClient = { get: mockRetrySuccess };
      jest.spyOn(marketDataClient, 'get').mockImplementation(mockClient.get);

      const immediateDelay = jest.fn().mockResolvedValue();
      const url = 'https://api.example.com/test';
      const result = await fetchWithRetry(url, {}, TIMEOUT.DEFAULT, 1, immediateDelay);

      expect(mockClient.get).toHaveBeenCalledTimes(2);
      expect(immediateDelay).toHaveBeenCalled();
      expect(result).toEqual(mockSuccessResponse.data);
    });
    
    it('リトライ時にタイムアウトが増加する', async () => {
      const mockClient = { 
        get: jest.fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValueOnce(mockSuccessResponse)
      };
      jest.spyOn(marketDataClient, 'get').mockImplementation(mockClient.get);

      const immediateDelay = jest.fn().mockResolvedValue();
      await fetchWithRetry('test', {}, 5000, 1, immediateDelay);

      expect(mockClient.get).toHaveBeenNthCalledWith(1, expect.any(String), 
        expect.objectContaining({ timeout: 5000 }));
      expect(mockClient.get).toHaveBeenNthCalledWith(2, expect.any(String), 
        expect.objectContaining({ timeout: 7000 })); // 5000 + 2000
    });
    
    it('エンドポイントがURLでない場合はgetApiEndpointを使用', async () => {
      const mockClient = { get: jest.fn().mockResolvedValue(mockSuccessResponse) };
      jest.spyOn(marketDataClient, 'get').mockImplementation(mockClient.get);
      
      await fetchWithRetry('market-data', { ticker: 'AAPL' });
      
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.example.com/market-data',
        expect.any(Object)
      );
    });
    
    it('サーキットブレーカーが動作し、閾値を超えるとオープンになる', async () => {
      const mockClient = { get: jest.fn().mockRejectedValue(new Error('Server Error')) };
      jest.spyOn(marketDataClient, 'get').mockImplementation(mockClient.get);
      
      // 閾値（5回）まで失敗させる
      for (let i = 0; i < 5; i++) {
        try {
          await fetchWithRetry('circuit-test', {}, 1000, 0);
        } catch (e) {
          // エラーは無視
        }
      }
      
      // 6回目でサーキットブレーカーがオープン
      try {
        await fetchWithRetry('circuit-test', {}, 1000, 0);
      } catch (e) {
        // エラーは無視
      }
      
      // 次の呼び出しは即座に失敗
      await expect(fetchWithRetry('circuit-test', {}, 1000, 0))
        .rejects.toThrow('Circuit breaker is OPEN');
    });
    
    it('最大リトライ回数を超えてもエラーの場合は例外をスローする', async () => {
      const mockClient = { get: jest.fn().mockRejectedValue(mockErrorResponse) };
      jest.spyOn(marketDataClient, 'get').mockImplementation(mockClient.get);

      const immediateDelay = jest.fn().mockResolvedValue();
      const url = 'https://api.example.com/test';

      await expect(
        fetchWithRetry(url, {}, TIMEOUT.DEFAULT, 2, immediateDelay)
      ).rejects.toEqual(mockErrorResponse);

      expect(mockClient.get).toHaveBeenCalledTimes(3);
      expect(immediateDelay).toHaveBeenCalled();
    });
    
    it('タイムアウトエラーを正しく処理する', async () => {
      const mockClient = { get: jest.fn().mockRejectedValue(mockTimeoutError) };
      jest.spyOn(marketDataClient, 'get').mockImplementation(mockClient.get);

      const immediateDelay = jest.fn().mockResolvedValue();
      const url = 'https://api.example.com/test';

      await expect(
        fetchWithRetry(url, {}, TIMEOUT.DEFAULT, 0, immediateDelay)
      ).rejects.toEqual(mockTimeoutError);

      expect(immediateDelay).not.toHaveBeenCalled();
    });
  });

  describe('authFetch', () => {
    it('GETリクエストを正しく処理する', async () => {
      const mockClient = { get: jest.fn().mockResolvedValue({ data: { ok: true } }) };
      jest.spyOn(authApiClient, 'get').mockImplementation(mockClient.get);

      const result = await authFetch('https://api.example.com/auth', 'get', { q: 'test' });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.example.com/auth', 
        expect.objectContaining({
          params: { q: 'test' },
          withCredentials: true
        })
      );
      expect(result).toEqual({ ok: true });
    });

    it('POST, PUT, DELETE リクエストを正しく処理する', async () => {
      const mockClient = {
        post: jest.fn().mockResolvedValue({ data: { ok: 'post' } }),
        put: jest.fn().mockResolvedValue({ data: { ok: 'put' } }),
        delete: jest.fn().mockResolvedValue({ data: { ok: 'del' } })
      };
      jest.spyOn(authApiClient, 'post').mockImplementation(mockClient.post);
      jest.spyOn(authApiClient, 'put').mockImplementation(mockClient.put);
      jest.spyOn(authApiClient, 'delete').mockImplementation(mockClient.delete);

      const postRes = await authFetch('/p', 'post', { a: 1 });
      const putRes = await authFetch('/p', 'put', { b: 2 });
      const delRes = await authFetch('/p', 'delete', { c: 3 });

      expect(mockClient.post).toHaveBeenCalledWith(expect.any(String), { a: 1 }, 
        expect.objectContaining({ withCredentials: true }));
      expect(mockClient.put).toHaveBeenCalledWith(expect.any(String), { b: 2 }, 
        expect.objectContaining({ withCredentials: true }));
      expect(mockClient.delete).toHaveBeenCalledWith(expect.any(String), 
        expect.objectContaining({ data: { c: 3 }, withCredentials: true }));
      expect(postRes).toEqual({ ok: 'post' });
      expect(putRes).toEqual({ ok: 'put' });
      expect(delRes).toEqual({ ok: 'del' });
    });

    it('未対応メソッドの場合はエラーを投げる', async () => {
      await expect(authFetch('/path', 'patch')).rejects.toThrow('未対応のHTTPメソッド');
    });
    
    it('configパラメータが正しくマージされる', async () => {
      const mockClient = { get: jest.fn().mockResolvedValue({ data: {} }) };
      jest.spyOn(authApiClient, 'get').mockImplementation(mockClient.get);

      const customConfig = {
        headers: { 'X-Custom': 'value' },
        timeout: 5000
      };
      
      await authFetch('/test', 'get', null, customConfig);

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Custom': 'value' }),
          timeout: 5000,
          withCredentials: true
        })
      );
    });
    
    it('400エラーの場合はレスポンスデータを返す', async () => {
      const errorData = { error: 'Bad Request', message: 'Invalid input' };
      const mockClient = { 
        post: jest.fn().mockRejectedValue({
          response: { status: 400, data: errorData }
        }) 
      };
      jest.spyOn(authApiClient, 'post').mockImplementation(mockClient.post);

      const result = await authFetch('/test', 'post', { bad: 'data' });
      
      expect(result).toEqual(errorData);
    });
    
    it('Network Errorの詳細情報を出力', async () => {
      const networkError = new Error('Network Error');
      networkError.message = 'Network Error';
      networkError.config = {
        url: '/test',
        method: 'get',
        headers: {},
        withCredentials: true
      };
      
      const mockClient = { get: jest.fn().mockRejectedValue(networkError) };
      jest.spyOn(authApiClient, 'get').mockImplementation(mockClient.get);

      await expect(authFetch('/test', 'get')).rejects.toThrow();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Network Error詳細'),
        expect.any(Object)
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CORSエラーの可能性')
      );
    });
    
    it('サーキットブレーカーが認証リクエストでも動作', async () => {
      const mockClient = { post: jest.fn().mockRejectedValue(new Error('Auth Error')) };
      jest.spyOn(authApiClient, 'post').mockImplementation(mockClient.post);
      
      // 閾値まで失敗させる
      for (let i = 0; i < 6; i++) {
        try {
          await authFetch('auth-circuit-test', 'post', {});
        } catch (e) {
          // エラーは無視
        }
      }
      
      // 次の呼び出しは即座に失敗
      await expect(authFetch('auth-circuit-test', 'post', {}))
        .rejects.toThrow('Circuit breaker is OPEN');
    });
  });

  describe('formatErrorResponse', () => {
    it('APIエラーレスポンスを正しく整形する', () => {
      // APIエラー
      const apiError = {
        response: {
          status: 400,
          data: { message: 'Bad request' }
        },
        message: 'Request failed with status code 400'
      };
      
      const result = formatErrorResponse(apiError, 'AAPL');
      
      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: true,
        message: expect.any(String),
        errorType: 'API_ERROR',
        status: 400,
        ticker: 'AAPL'
      }));
    });
    
    it('レート制限エラーを正しく処理する', () => {
      // レート制限エラー
      const rateLimitError = {
        response: {
          status: 429,
          data: { message: 'Too many requests' }
        },
        message: 'Request failed with status code 429'
      };
      
      const result = formatErrorResponse(rateLimitError);
      
      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: true,
        message: expect.any(String),
        errorType: 'RATE_LIMIT',
        status: 429
      }));
    });
    
    it('タイムアウトエラーを正しく処理する', () => {
      // タイムアウトエラー
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      };
      
      const result = formatErrorResponse(timeoutError);
      
      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: true,
        message: expect.any(String),
        errorType: 'TIMEOUT'
      }));
    });
    
    it('ネットワークエラーを正しく処理する', () => {
      // ネットワークエラー
      const networkError = {
        message: 'Network Error'
      };
      
      const result = formatErrorResponse(networkError);
      
      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: true,
        message: expect.any(String),
        errorType: 'NETWORK'
      }));
    });
    
    it('未知のエラーを正しく処理する', () => {
      // 未知のエラー
      const unknownError = {
        message: 'Unknown error'
      };
      
      const result = formatErrorResponse(unknownError);
      
      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: true,
        message: expect.any(String),
        errorType: 'UNKNOWN'
      }));
    });
  });
  
  describe('generateFallbackData', () => {
    it('米国株のフォールバックデータを正しく生成する', () => {
      const ticker = 'AAPL';
      const result = generateFallbackData(ticker);
      
      expect(result).toEqual({
        ticker: 'AAPL',
        price: 100,
        name: 'AAPL (フォールバック)',
        currency: 'USD',
        lastUpdated: expect.any(String),
        source: 'Fallback',
        isStock: true,
        isMutualFund: false,
        fundType: 'BALANCED'
      });
    });
    
    it('日本株のフォールバックデータを正しく生成する', () => {
      const ticker = '7203.T';
      const result = generateFallbackData(ticker);
      
      expect(result).toEqual(expect.objectContaining({
        ticker: '7203.T',
        price: 1000,
        name: 'トヨタ自動車',
        currency: 'JPY',
        source: 'Fallback',
        isStock: true,
        isMutualFund: false,
        fundType: 'STOCK'
      }));
    });
    
    it('日本株（コード番号のみ）のフォールバックデータを正しく生成する', () => {
      const ticker = '9984';
      const result = generateFallbackData(ticker);
      
      expect(result).toEqual(expect.objectContaining({
        ticker: '9984',
        price: 1000,
        name: 'ソフトバンクグループ',
        currency: 'JPY',
        source: 'Fallback',
        isStock: true,
        isMutualFund: false,
        fundType: 'STOCK'
      }));
    });
    
    it('投資信託のフォールバックデータを正しく生成する', () => {
      const ticker = '2521133C';
      const result = generateFallbackData(ticker);
      
      expect(result).toEqual(expect.objectContaining({
        ticker: '2521133C',
        price: 10000,
        name: '2521133C (フォールバック)',
        currency: 'JPY',
        source: 'Fallback',
        isStock: false,
        isMutualFund: true,
        fundType: 'MUTUAL_FUND'
      }));
    });
    
    it('8桁数字のミューチュアルファンド', () => {
      const ticker = '12345678';
      const result = generateFallbackData(ticker);
      
      expect(result).toEqual(expect.objectContaining({
        ticker: '12345678',
        price: 10000,
        currency: 'JPY',
        isStock: false,
        isMutualFund: true,
        fundType: 'MUTUAL_FUND'
      }));
    });
    
    it('7桁数字+アルファベットのミューチュアルファンド', () => {
      const ticker = '1234567A';
      const result = generateFallbackData(ticker);
      
      expect(result).toEqual(expect.objectContaining({
        ticker: '1234567A',
        price: 10000,
        currency: 'JPY',
        isStock: false,
        isMutualFund: true,
        fundType: 'MUTUAL_FUND'
      }));
    });
  });
  
  describe('wait ヘルパー関数', () => {
    it('指定されたミリ秒待機する', async () => {
      const start = Date.now();
      await wait(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90); // タイマーの精度を考慮
      expect(end - start).toBeLessThan(150);
    });
  });
  
  describe('インターセプター', () => {
    let mockClient;
    let requestInterceptor;
    let responseInterceptor;
    
    beforeEach(() => {
      requestInterceptor = null;
      responseInterceptor = null;
      
      mockClient = {
        get: jest.fn().mockResolvedValue({ data: {} }),
        post: jest.fn().mockResolvedValue({ data: {} }),
        put: jest.fn().mockResolvedValue({ data: {} }),
        delete: jest.fn().mockResolvedValue({ data: {} }),
        interceptors: {
          request: { 
            use: jest.fn((onFulfilled) => {
              requestInterceptor = onFulfilled;
            }) 
          },
          response: { 
            use: jest.fn((onFulfilled, onRejected) => {
              responseInterceptor = { onFulfilled, onRejected };
            }) 
          }
        }
      };
      
      axios.create.mockReturnValue(mockClient);
    });
    
    describe('リクエストインターセプター', () => {
      it('開発環境でAPIリクエストをログ出力', async () => {
        process.env.NODE_ENV = 'development';
        createApiClient(false);
        
        const config = {
          method: 'get',
          url: '/test',
          headers: {}
        };
        
        await requestInterceptor(config);
        
        expect(console.log).toHaveBeenCalledWith('API Request: GET /test');
      });
      
      it('POSTリクエストのボディを開発環境でログ出力', async () => {
        process.env.NODE_ENV = 'development';
        createApiClient(false);
        
        const config = {
          method: 'post',
          url: '/test',
          data: { test: 'data' },
          headers: {}
        };
        
        await requestInterceptor(config);
        
        expect(console.log).toHaveBeenCalledWith(
          'POST Request Body:',
          expect.stringContaining('"test": "data"')
        );
      });
      
      it('認証クライアントでトークンがある場合はAuthorizationヘッダーを追加', async () => {
        setAuthToken('test-token');
        createApiClient(true);
        
        const config = {
          method: 'get',
          url: '/test',
          headers: {}
        };
        
        const result = await requestInterceptor(config);
        
        expect(result.headers.Authorization).toBe('Bearer test-token');
      });
      
      it('認証クライアントでトークンがない場合でもリクエストを続行', async () => {
        clearAuthToken();
        createApiClient(true);
        
        const config = {
          method: 'get',
          url: '/test',
          headers: {}
        };
        
        const result = await requestInterceptor(config);
        
        expect(result.headers.Authorization).toBeUndefined();
        expect(result.withCredentials).toBe(true);
      });
      
      it('リクエストエラーをそのまま投げる', async () => {
        createApiClient(false);
        
        const error = new Error('Request setup failed');
        
        await expect(requestInterceptor(null, error)).rejects.toThrow(error);
      });
    });
    
    describe('レスポンスインターセプター', () => {
      beforeEach(() => {
        createApiClient(false);
      });
      
      it('成功レスポンスをログ出力（開発環境）', () => {
        process.env.NODE_ENV = 'development';
        
        const response = {
          status: 200,
          data: { success: true },
          config: { method: 'get', url: '/test' }
        };
        
        responseInterceptor.onFulfilled(response);
        
        expect(console.log).toHaveBeenCalledWith('API Response: GET /test -> 200');
      });
      
      it('レスポンスからトークンを抽出して保存（token）', () => {
        const response = {
          data: { token: 'new-token' },
          config: {}
        };
        
        responseInterceptor.onFulfilled(response);
        
        expect(getAuthToken()).toBe('new-token');
      });
      
      it('レスポンスからトークンを抽出して保存（accessToken）', () => {
        const response = {
          data: { accessToken: 'access-token' },
          config: {}
        };
        
        responseInterceptor.onFulfilled(response);
        
        expect(getAuthToken()).toBe('access-token');
      });
      
      it('レスポンスからトークンを抽出して保存（access_token）', () => {
        const response = {
          data: { access_token: 'access_token' },
          config: {}
        };
        
        responseInterceptor.onFulfilled(response);
        
        expect(getAuthToken()).toBe('access_token');
      });
      
      it('レスポンスからトークンを抽出して保存（jwt）', () => {
        const response = {
          data: { jwt: 'jwt-token' },
          config: {}
        };
        
        responseInterceptor.onFulfilled(response);
        
        expect(getAuthToken()).toBe('jwt-token');
      });
      
      it('401エラーでセッションエンドポイントの場合はトークンをクリア', async () => {
        setAuthToken('old-token');
        
        const error = {
          response: {
            status: 401,
            data: { message: 'Unauthorized' }
          },
          config: { url: '/auth/session' }
        };
        
        await expect(responseInterceptor.onRejected(error)).rejects.toBeTruthy();
        
        expect(getAuthToken()).toBeNull();
      });
      
      it('401エラーでDriveエンドポイントの場合はトークンを保持', async () => {
        setAuthToken('old-token');
        
        const error = {
          response: {
            status: 401,
            data: { message: 'Drive permission required' }
          },
          config: { url: '/drive/files' }
        };
        
        await expect(responseInterceptor.onRejected(error)).rejects.toBeTruthy();
        
        expect(getAuthToken()).toBe('old-token');
      });
      
      it('401エラーでInvalid tokenメッセージの場合はトークンをクリア', async () => {
        setAuthToken('old-token');
        
        const error = {
          response: {
            status: 401,
            data: { message: 'Invalid token' }
          },
          config: { url: '/api/data' }
        };
        
        await expect(responseInterceptor.onRejected(error)).rejects.toBeTruthy();
        
        expect(getAuthToken()).toBeNull();
      });
      
      it('エラーレスポンスをhandleApiErrorで処理', async () => {
        const error = {
          response: { status: 500 },
          message: 'Server error'
        };
        
        await expect(responseInterceptor.onRejected(error)).rejects.toEqual({
          ...error,
          sanitized: true
        });
      });
    });
  });
});
