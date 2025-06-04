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
  let consoleDebugSpy;

  beforeEach(() => {
    // 環境変数をバックアップ
    originalEnv = process.env.REACT_APP_API_BASE_URL;
    
    // コンソールメソッドをモック
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    
    // モックをクリア
    jest.clearAllMocks();
    
    // csrfManagerをリセット
    jest.resetModules();
    csrfManager = require('../../../utils/csrfManager').default;
    
    // localStorageのデフォルトモック
    localStorageMock.getItem.mockReturnValue('test-session-id');
    
    // axiosのデフォルトモック（使用されないが念のため）
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
    consoleDebugSpy.mockRestore();
    
    // csrfManagerの状態をクリア
    csrfManager.clearToken();
  });

  describe('getToken', () => {
    it('セッションベース認証でダミートークンを返す', async () => {
      const token = await csrfManager.getToken();
      
      expect(token).toBe('dummy-csrf-token');
      // セッションベース認証では実際のAPI呼び出しは行わない
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('キャッシュされたダミートークンを返す', async () => {
      const token1 = await csrfManager.getToken();
      const token2 = await csrfManager.getToken();
      
      expect(token1).toBe('dummy-csrf-token');
      expect(token2).toBe('dummy-csrf-token');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('並行リクエストでも同じダミートークンを返す', async () => {
      const promises = [
        csrfManager.getToken(),
        csrfManager.getToken(),
        csrfManager.getToken()
      ];
      
      const tokens = await Promise.all(promises);
      
      expect(tokens).toEqual(['dummy-csrf-token', 'dummy-csrf-token', 'dummy-csrf-token']);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('環境変数に関係なくダミートークンを返す', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      const token = await csrfManager.getToken();
      
      expect(token).toBe('dummy-csrf-token');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('セッションIDがなくてもダミートークンを返す', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const token = await csrfManager.getToken();
      expect(token).toBe('dummy-csrf-token');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('clearToken', () => {
    it('トークンとキャッシュをクリアする', () => {
      csrfManager.clearToken();
      
      // プライベートプロパティのテストは困難だが、エラーが出ないことを確認
      expect(() => csrfManager.clearToken()).not.toThrow();
    });
  });

  describe('addTokenToRequest', () => {
    it('GETリクエストには何も追加しない', async () => {
      const config = { method: 'get', headers: {} };
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result).toEqual(config);
      expect(result.headers['X-CSRF-Token']).toBeUndefined();
    });

    it('POSTリクエストにCSRFトークンを追加する', async () => {
      const config = { method: 'post', headers: {} };
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers['X-CSRF-Token']).toBe('dummy-csrf-token');
    });

    it('PUTリクエストにCSRFトークンを追加する', async () => {
      const config = { method: 'put', headers: {} };
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers['X-CSRF-Token']).toBe('dummy-csrf-token');
    });

    it('DELETEリクエストにCSRFトークンを追加する', async () => {
      const config = { method: 'delete', headers: {} };
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers['X-CSRF-Token']).toBe('dummy-csrf-token');
    });

    it('既存のヘッダーがない場合はヘッダーオブジェクトを作成する', async () => {
      const config = { method: 'post' };
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers).toBeDefined();
      expect(result.headers['X-CSRF-Token']).toBe('dummy-csrf-token');
    });

    it('既存のヘッダーを保持する', async () => {
      const config = { 
        method: 'post', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        }
      };
      const result = await csrfManager.addTokenToRequest(config);
      
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Authorization']).toBe('Bearer token');
      expect(result.headers['X-CSRF-Token']).toBe('dummy-csrf-token');
    });

    it('開発環境でデバッグメッセージを出力する（トークン取得エラー時）', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        // トークン取得を強制的に失敗させる
        const originalRefreshToken = csrfManager.refreshToken;
        csrfManager.refreshToken = jest.fn().mockRejectedValue(new Error('Test error'));
        
        const config = { method: 'post', headers: {} };
        const result = await csrfManager.addTokenToRequest(config);
        
        expect(result).toEqual(config);
        expect(consoleDebugSpy).toHaveBeenCalledWith('CSRF token not required for this request');
        
        // 元の関数を復元
        csrfManager.refreshToken = originalRefreshToken;
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('refreshToken', () => {
    it('常にダミートークンを返す', async () => {
      const token = await csrfManager.refreshToken();
      expect(token).toBe('dummy-csrf-token');
    });
  });
});