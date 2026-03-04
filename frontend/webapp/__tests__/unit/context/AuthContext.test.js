import React, { useContext } from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, AuthContext } from '@/context/AuthContext';

// --- Mocks ---
jest.mock('@/utils/envUtils', () => ({
  getApiEndpoint: jest.fn((path) => Promise.resolve(`/api/${path}`)),
  getGoogleClientId: jest.fn(() => Promise.resolve('test-google-client-id')),
}));

jest.mock('@/utils/apiUtils', () => ({
  authFetch: jest.fn(),
  setAuthToken: jest.fn(),
  getAuthToken: jest.fn(() => null),
  clearAuthToken: jest.fn(),
}));

const { authFetch, setAuthToken, getAuthToken, clearAuthToken } = require('@/utils/apiUtils');

// localStorage mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
const useAuthContext = () => useContext(AuthContext);

// マウント時のcheckSession完了を待つユーティリティ
const waitForMount = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
};

describe('AuthContext', () => {
  beforeAll(() => {
    // jest.setup.jsでuseFakeTimersが設定されているが、
    // AuthContextはreal timersが必要（setInterval, setTimeout使用）
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    getAuthToken.mockReturnValue(null);
    // デフォルト: authFetchは未認証応答（checkSessionのAPI呼び出し用）
    // 注意: トークンもストレージもない場合、checkSessionはauthFetchを呼ばずにショートサーキットする
    authFetch.mockResolvedValue({ success: false, isAuthenticated: false });
  });

  describe('初期状態', () => {
    it('初期状態では未認証', async () => {
      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
      expect(result.current.hasDriveAccess).toBe(false);
    });

    it('コンテキスト値に全メソッドが含まれる', async () => {
      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      // Methods
      expect(result.current).toHaveProperty('loginWithGoogle');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('checkSession');
      expect(result.current).toHaveProperty('initiateDriveAuth');
      expect(result.current).toHaveProperty('setPortfolioContextRef');

      // Aliases（後方互換）
      expect(result.current).toHaveProperty('handleLogout');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('authorizeDrive');

      // State
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('hasDriveAccess');
      expect(result.current).toHaveProperty('googleClientId');
    });
  });

  describe('loginWithGoogle', () => {
    it('One Tap (credential) でログイン成功', async () => {
      // マウント時: getAuthToken=null, localStorage=empty → checkSessionはauthFetch呼ばずにショートサーキット
      // loginWithGoogle呼び出し時にauthFetchが呼ばれる
      authFetch.mockResolvedValue({
        success: true,
        user: { name: 'Test User', email: 'test@example.com' },
        token: 'jwt-token-123',
        hasDriveAccess: false,
      });

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      let loginResult;
      await act(async () => {
        loginResult = await result.current.loginWithGoogle({ credential: 'google-id-token' });
      });

      expect(loginResult).toEqual({ success: true, hasDriveAccess: false });
      expect(setAuthToken).toHaveBeenCalledWith('jwt-token-123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({ name: 'Test User', email: 'test@example.com' });
    });

    it('OAuth Code Flow (code) でログイン成功', async () => {
      authFetch.mockResolvedValue({
        success: true,
        user: { name: 'Code User' },
        token: 'code-token',
        hasDriveAccess: true,
      });

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      let loginResult;
      await act(async () => {
        loginResult = await result.current.loginWithGoogle({ code: 'auth-code-123' });
      });

      expect(loginResult).toEqual({ success: true, hasDriveAccess: true });
      expect(result.current.hasDriveAccess).toBe(true);
    });

    it('credential も code もない場合はエラー', async () => {
      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      let loginResult;
      await act(async () => {
        loginResult = await result.current.loginWithGoogle({});
      });

      expect(loginResult).toEqual({ success: false, hasDriveAccess: false });
      expect(result.current.error).toBe('認証情報が取得できませんでした');
    });

    it('サーバーエラー時はエラー状態を設定', async () => {
      authFetch.mockResolvedValue({
        error: { message: 'Invalid token' },
      });

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      await act(async () => {
        await result.current.loginWithGoogle({ credential: 'bad-token' });
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid token');
    });

    it('ネットワークエラー時はエラー状態を設定', async () => {
      authFetch.mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      await act(async () => {
        await result.current.loginWithGoogle({ credential: 'token' });
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Network Error');
    });
  });

  describe('logout', () => {
    it('ログアウトで状態とトークンをクリア', async () => {
      // loginWithGoogle と logout の両方で authFetch が呼ばれる
      authFetch
        .mockResolvedValueOnce({  // loginWithGoogle
          success: true,
          user: { name: 'Tester' },
          token: 'jwt123',
        })
        .mockResolvedValueOnce({ success: true }); // logout

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      await act(async () => {
        await result.current.loginWithGoogle({ code: 'abc' });
      });
      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(clearAuthToken).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });

    it('ログアウトAPIが失敗しても状態はクリアされる', async () => {
      authFetch
        .mockResolvedValueOnce({  // loginWithGoogle
          success: true,
          user: { name: 'Tester' },
          token: 'jwt123',
        })
        .mockRejectedValueOnce(new Error('API down')); // logout

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      await act(async () => {
        await result.current.loginWithGoogle({ code: 'abc' });
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(clearAuthToken).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('checkSession', () => {
    it('有効なセッションで認証状態を復元', async () => {
      // トークンがある場合、checkSessionはauthFetchでAPIを呼ぶ
      getAuthToken.mockReturnValue('stored-token');
      authFetch.mockResolvedValue({
        success: true,
        isAuthenticated: true,
        user: { name: 'Session User' },
        token: 'refreshed-token',
        hasDriveAccess: true,
      });

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({ name: 'Session User' });
      expect(result.current.hasDriveAccess).toBe(true);
    });

    it('無効なセッションで未認証状態に', async () => {
      getAuthToken.mockReturnValue('expired-token');
      authFetch.mockResolvedValue({
        success: true,
        isAuthenticated: false,
      });

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });

    it('トークンもストレージもない場合は未認証（APIは呼ばない）', async () => {
      getAuthToken.mockReturnValue(null);

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      expect(result.current.isAuthenticated).toBe(false);
      // authFetchはcheckSessionから呼ばれない（ショートサーキット）
    });
  });

  describe('セッション永続化（localStorage）', () => {
    it('ログイン時にセッションがlocalStorageに保存される', async () => {
      authFetch.mockResolvedValue({
        success: true,
        user: { name: 'Persistent User' },
        token: 'persist-token',
        hasDriveAccess: false,
      });

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      await act(async () => {
        await result.current.loginWithGoogle({ credential: 'google-token' });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pfwise_session',
        expect.stringContaining('Persistent User'),
      );
    });

    it('ログアウト時にlocalStorageからセッションが削除される', async () => {
      authFetch
        .mockResolvedValueOnce({ // loginWithGoogle
          success: true,
          user: { name: 'User' },
          token: 'token',
        })
        .mockResolvedValueOnce({ success: true }); // logout

      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      await act(async () => {
        await result.current.loginWithGoogle({ credential: 'token' });
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pfwise_session');
    });
  });

  describe('後方互換エイリアス', () => {
    it('handleLogout は logout と同一', async () => {
      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      expect(result.current.handleLogout).toBe(result.current.logout);
    });

    it('login は loginWithGoogle と同一', async () => {
      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      expect(result.current.login).toBe(result.current.loginWithGoogle);
    });

    it('authorizeDrive は initiateDriveAuth と同一', async () => {
      const { result } = renderHook(useAuthContext, { wrapper });
      await waitForMount();

      expect(result.current.authorizeDrive).toBe(result.current.initiateDriveAuth);
    });
  });
});
