/**
 * ファイルパス: __test__/unit/utils/apiUtils.test.js
 * 
 * APIユーティリティの単体テスト
 * Axiosクライアント生成、リトライ機能付きフェッチ、エラーレスポンス整形のテスト
 * 
 * @author プロジェクトチーム
 * @created 2025-05-21
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
  TIMEOUT,
  RETRY
} from '@/utils/apiUtils';

// Axiosのモック
import axios from 'axios';
jest.mock('axios');

describe('APIユーティリティ', () => {
  // 各テスト前の準備
  beforeEach(() => {
    // Axiosモックのリセット
    axios.create.mockClear();
    axios.get.mockClear();
    axios.post.mockClear();
    
    // 正常なレスポンスのデフォルトモック
    axios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: { success: true } }),
      post: jest.fn().mockResolvedValue({ data: { success: true } }),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    });
  });
  
  describe('createApiClient', () => {
    it('認証なしのAPIクライアントを正しく生成する', () => {
      const client = createApiClient(false);
      
      // Axiosのcreateが呼ばれたことを検証
      expect(axios.create).toHaveBeenCalledTimes(1);
      
      // パラメータを検証
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: TIMEOUT.DEFAULT,
          withCredentials: false // 認証なし
        })
      );
      
      // クライアントのインターセプターが設定されていることを検証
      expect(client.interceptors.request.use).toHaveBeenCalled();
    });
    
    it('認証ありのAPIクライアントを正しく生成する', () => {
      const client = createApiClient(true);
      
      // Axiosのcreateが呼ばれたことを検証
      expect(axios.create).toHaveBeenCalledTimes(1);
      
      // パラメータを検証
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: TIMEOUT.DEFAULT,
          withCredentials: true // 認証あり
        })
      );
      
      // クライアントのインターセプターが設定されていることを検証
      expect(client.interceptors.request.use).toHaveBeenCalled();
    });
  });
  
  describe('クライアントインスタンス', () => {
    it('marketDataClientとauthApiClientが正しく初期化されている', () => {
      // marketDataClientとauthApiClientはモジュールのインポート時に初期化されるため、
      // axios.createの呼び出し回数を検証することはできませんが、
      // オブジェクトとして存在することは検証できます
      
      expect(marketDataClient).toBeDefined();
      expect(authApiClient).toBeDefined();
      
      // モックしているので実際のメソッドは呼び出せませんが、
      // 型としてはgetメソッドなどが存在するはずです
      expect(typeof marketDataClient.get).toBe('function');
      expect(typeof authApiClient.get).toBe('function');
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

      expect(mockClient.get).toHaveBeenCalledWith('https://api.example.com/auth', {
        params: { q: 'test' }
      });
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

      expect(mockClient.post).toHaveBeenCalledWith(expect.any(String), { a: 1 }, undefined);
      expect(mockClient.put).toHaveBeenCalledWith(expect.any(String), { b: 2 }, undefined);
      expect(mockClient.delete).toHaveBeenCalledWith(expect.any(String), { data: { c: 3 } });
      expect(postRes).toEqual({ ok: 'post' });
      expect(putRes).toEqual({ ok: 'put' });
      expect(delRes).toEqual({ ok: 'del' });
    });

    it('未対応メソッドの場合はエラーを投げる', async () => {
      await expect(authFetch('/path', 'patch')).rejects.toThrow('未対応のHTTPメソッド');
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
        price: expect.any(Number),
        name: expect.stringContaining(ticker),
        currency: 'USD',
        lastUpdated: expect.any(String),
        source: 'Fallback',
        isStock: expect.any(Boolean),
        isMutualFund: expect.any(Boolean)
      });
    });
    
    it('日本株のフォールバックデータを正しく生成する', () => {
      const ticker = '7203.T';
      const result = generateFallbackData(ticker);
      
      expect(result).toEqual(expect.objectContaining({
        ticker: '7203.T',
        currency: 'JPY',
        source: 'Fallback'
      }));
    });
    
    it('投資信託のフォールバックデータを正しく生成する', () => {
      const ticker = '2521133C.T';
      const result = generateFallbackData(ticker);
      
      expect(result).toEqual(expect.objectContaining({
        ticker: '2521133C.T',
        currency: 'JPY',
        source: 'Fallback'
      }));
    });
  });
});
