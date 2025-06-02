/**
 * csrfManager.js のユニットテスト
 * CSRF トークン管理のテスト
 */

// axiosのモック
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios;

// localStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('csrfManager', () => {
  let csrfManager;
  let originalEnv;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // 環境変数をバックアップ
    originalEnv = process.env.REACT_APP_API_BASE_URL;
    
    // コンソールメソッドをモック
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // モックをクリア
    jest.clearAllMocks();
    
    // csrfManagerをリセット
    jest.resetModules();
    csrfManager = require('../../../utils/csrfManager').default;
    
    // localStorageのデフォルトモック
    localStorageMock.getItem.mockReturnValue('test-session-id');
    
    // axiosのデフォルトモック
    mockedAxios.post.mockResolvedValue({
      data: {
        csrfToken: 'test-csrf-token',
        expiresIn: 3600 // 1時間
      }
    });
  });

  afterEach(() => {
    // 環境変数を復元
    process.env.REACT_APP_API_BASE_URL = originalEnv;
    
    // コンソールモックを復元
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    
    // csrfManagerの状態をクリア
    csrfManager.clearToken();
  });

  describe('getToken', () => {
    it('初回取得時に新しいトークンを取得する', async () => {
      const token = await csrfManager.getToken();
      
      expect(token).toBe('test-csrf-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4000/auth/csrf-token',
        {},
        {
          headers: {
            'X-Session-Id': 'test-session-id'
          },
          withCredentials: true
        }
      );
    });

    it('有効なトークンがある場合はキャッシュされたトークンを返す', async () => {
      // 最初の取得
      const token1 = await csrfManager.getToken();
      
      // 2回目の取得（キャッシュから）
      const token2 = await csrfManager.getToken();
      
      expect(token1).toBe('test-csrf-token');
      expect(token2).toBe('test-csrf-token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // 1回だけ呼ばれる
    });

    it('トークンが期限切れの場合は新しいトークンを取得する', async () => {
      // 最初の取得
      await csrfManager.getToken();
      
      // 時間を進める（期限切れにする）
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 4000000); // 4000秒後
      
      try {
        // 2回目の取得（期限切れのため新しいトークンを取得）
        const token = await csrfManager.getToken();
        
        expect(token).toBe('test-csrf-token');
        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      } finally {
        Date.now = originalNow;
      }
    });

    it('並行リクエストでも同じトークンを返す', async () => {
      const promises = [
        csrfManager.getToken(),
        csrfManager.getToken(),
        csrfManager.getToken()
      ];
      
      const tokens = await Promise.all(promises);
      
      expect(tokens).toEqual(['test-csrf-token', 'test-csrf-token', 'test-csrf-token']);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // 1回だけ呼ばれる
    });

    it('環境変数でAPIベースURLを設定できる', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      await csrfManager.getToken();
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.example.com/auth/csrf-token',
        {},
        expect.any(Object)
      );
    });

    it('セッションIDがない場合はエラーを投げる', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      await expect(csrfManager.getToken()).rejects.toThrow('No session found');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to refresh CSRF token:',
        expect.any(Error)
      );
    });

    it('APIエラー時は適切にエラーを処理する', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));
      
      await expect(csrfManager.getToken()).rejects.toThrow('Network error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to refresh CSRF token:',
        expect.any(Error)
      );
    });

    it('無効なレスポンス形式の場合はエラーを投げる', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          // csrfTokenがない無効なレスポンス
          message: 'success'
        }
      });
      
      await expect(csrfManager.getToken()).rejects.toThrow('Invalid CSRF token response');
    });
  });

  describe('refreshToken', () => {
    it('正常にトークンを更新する', async () => {
      const token = await csrfManager.refreshToken();
      
      expect(token).toBe('test-csrf-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4000/auth/csrf-token',
        {},
        {
          headers: {
            'X-Session-Id': 'test-session-id'
          },
          withCredentials: true
        }
      );
    });

    it('トークンの有効期限を正しく設定する', async () => {
      const originalNow = Date.now;
      const mockNow = 1000000;
      Date.now = jest.fn(() => mockNow);
      
      try {
        mockedAxios.post.mockResolvedValue({
          data: {
            csrfToken: 'new-token',
            expiresIn: 1800 // 30分
          }
        });
        
        await csrfManager.refreshToken();
        
        // 有効期限が正しく設定されているかテスト
        // expiresIn(1800) - 60秒のマージンを計算
        const expectedExpiry = mockNow + (1800 - 60) * 1000;
        
        // 期限前なのでキャッシュされたトークンが返される
        const cachedToken = await csrfManager.getToken();
        expect(cachedToken).toBe('new-token');
        expect(mockedAxios.post).toHaveBeenCalledTimes(1); // refreshTokenでの1回のみ
      } finally {
        Date.now = originalNow;
      }
    });

    it('expiresInが未定義の場合も処理する', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          csrfToken: 'token-without-expiry'
          // expiresInがない
        }
      });
      
      const token = await csrfManager.refreshToken();
      
      expect(token).toBe('token-without-expiry');
    });
  });

  describe('clearToken', () => {
    it('トークンとその他の状態をクリアする', async () => {
      // まずトークンを取得
      await csrfManager.getToken();
      
      // クリア実行
      csrfManager.clearToken();
      
      // 再度取得すると新しいAPIコールが発生する
      await csrfManager.getToken();
      
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('複数回呼び出してもエラーが発生しない', () => {
      expect(() => {
        csrfManager.clearToken();
        csrfManager.clearToken();
        csrfManager.clearToken();
      }).not.toThrow();
    });
  });

  describe('addTokenToRequest', () => {
    it('GETリクエストにはトークンを追加しない', async () => {
      const config = {
        method: 'get',
        url: '/api/test',
        headers: {}
      };
      
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers['X-CSRF-Token']).toBeUndefined();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('POSTリクエストにトークンを追加する', async () => {
      const config = {
        method: 'post',
        url: '/api/test',
        headers: {}
      };
      
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers['X-CSRF-Token']).toBe('test-csrf-token');
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('PUTリクエストにトークンを追加する', async () => {
      const config = {
        method: 'put',
        url: '/api/test',
        headers: {}
      };
      
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers['X-CSRF-Token']).toBe('test-csrf-token');
    });

    it('DELETEリクエストにトークンを追加する', async () => {
      const config = {
        method: 'delete',
        url: '/api/test',
        headers: {}
      };
      
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers['X-CSRF-Token']).toBe('test-csrf-token');
    });

    it('ヘッダーが未定義の場合は新しいヘッダーオブジェクトを作成する', async () => {
      const config = {
        method: 'post',
        url: '/api/test'
        // headersが未定義
      };
      
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers).toBeDefined();
      expect(result.headers['X-CSRF-Token']).toBe('test-csrf-token');
    });

    it('既存のヘッダーを保持してトークンを追加する', async () => {
      const config = {
        method: 'post',
        url: '/api/test',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer existing-token'
        }
      };
      
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Authorization']).toBe('Bearer existing-token');
      expect(result.headers['X-CSRF-Token']).toBe('test-csrf-token');
    });

    it('トークン取得に失敗した場合でもリクエスト設定を返す', async () => {
      // トークン取得を失敗させる
      localStorageMock.getItem.mockReturnValue(null);
      
      const config = {
        method: 'post',
        url: '/api/test',
        headers: {}
      };
      
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result).toBe(config);
      expect(result.headers['X-CSRF-Token']).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to add CSRF token:',
        expect.any(Error)
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーを適切に処理する', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));
      
      await expect(csrfManager.getToken()).rejects.toThrow('Network Error');
    });

    it('HTTPエラーレスポンスを適切に処理する', async () => {
      const error = new Error('Request failed with status code 401');
      error.response = { status: 401 };
      mockedAxios.post.mockRejectedValue(error);
      
      await expect(csrfManager.getToken()).rejects.toThrow('Request failed with status code 401');
    });

    it('タイムアウトエラーを適切に処理する', async () => {
      const error = new Error('timeout');
      error.code = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValue(error);
      
      await expect(csrfManager.getToken()).rejects.toThrow('timeout');
    });

    it('空のレスポンスを適切に処理する', async () => {
      mockedAxios.post.mockResolvedValue({});
      
      await expect(csrfManager.getToken()).rejects.toThrow('Invalid CSRF token response');
    });

    it('nullレスポンスを適切に処理する', async () => {
      mockedAxios.post.mockResolvedValue(null);
      
      await expect(csrfManager.getToken()).rejects.toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の並行リクエストを効率的に処理する', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 100 }, () => csrfManager.getToken());
      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // 1回だけ呼ばれる
      
      results.forEach(result => {
        expect(result).toBe('test-csrf-token');
      });
    });

    it('設定オブジェクトの処理が高速', async () => {
      const startTime = Date.now();
      
      const configs = Array.from({ length: 1000 }, (_, i) => ({
        method: i % 2 === 0 ? 'post' : 'get',
        url: `/api/test${i}`,
        headers: {}
      }));
      
      const results = await Promise.all(
        configs.map(config => csrfManager.addTokenToRequest(config))
      );
      
      const endTime = Date.now();
      
      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(500); // 500ms以内
    });
  });

  describe('統合テスト', () => {
    it('完全なライフサイクルテスト', async () => {
      // 1. トークン取得
      const token1 = await csrfManager.getToken();
      expect(token1).toBe('test-csrf-token');
      
      // 2. リクエスト設定にトークン追加
      const config = {
        method: 'post',
        url: '/api/test',
        headers: {}
      };
      const updatedConfig = await csrfManager.addTokenToRequest(config);
      expect(updatedConfig.headers['X-CSRF-Token']).toBe('test-csrf-token');
      
      // 3. トークンクリア
      csrfManager.clearToken();
      
      // 4. 新しいトークン取得
      const token2 = await csrfManager.getToken();
      expect(token2).toBe('test-csrf-token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // 初回 + クリア後
    });

    it('セッション管理との連携テスト', async () => {
      // セッションIDが変更される場合
      localStorageMock.getItem.mockReturnValueOnce('session-1');
      const token1 = await csrfManager.getToken();
      
      // セッションクリア
      csrfManager.clearToken();
      
      // 新しいセッション
      localStorageMock.getItem.mockReturnValueOnce('session-2');
      const token2 = await csrfManager.getToken();
      
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(mockedAxios.post).toHaveBeenNthCalledWith(1, 
        expect.any(String),
        {},
        expect.objectContaining({
          headers: { 'X-Session-Id': 'session-1' }
        })
      );
      expect(mockedAxios.post).toHaveBeenNthCalledWith(2,
        expect.any(String),
        {},
        expect.objectContaining({
          headers: { 'X-Session-Id': 'session-2' }
        })
      );
    });
  });

  describe('シングルトンパターン', () => {
    it('同じインスタンスを返す', () => {
      const instance1 = require('../../../utils/csrfManager').default;
      const instance2 = require('../../../utils/csrfManager').default;
      
      expect(instance1).toBe(instance2);
    });
  });
});