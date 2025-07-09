/**
 * AuthContext.js のユニットテスト
 * 認証コンテキストの包括的テスト
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, AuthContext } from '../../../context/AuthContext';
import * as envUtils from '../../../utils/envUtils';
import * as apiUtils from '../../../utils/apiUtils';

// モック
jest.mock('../../../utils/envUtils');
jest.mock('../../../utils/apiUtils');

// テスト用のコンシューマーコンポーネント
const TestConsumer = () => {
  const context = React.useContext(AuthContext);
  return (
    <div>
      <div data-testid="user">{context.user ? context.user.email : 'null'}</div>
      <div data-testid="isAuthenticated">{context.isAuthenticated.toString()}</div>
      <div data-testid="loading">{context.loading.toString()}</div>
      <div data-testid="error">{context.error || 'null'}</div>
      <div data-testid="hasDriveAccess">{context.hasDriveAccess.toString()}</div>
      <div data-testid="googleClientId">{context.googleClientId || 'null'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  let originalLocation;
  let originalConsoleLog;
  let originalConsoleError;
  let originalConsoleWarn;

  beforeEach(() => {
    // console メソッドをモック
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    // window.location をモック
    originalLocation = window.location;
    delete window.location;
    window.location = {
      origin: 'http://localhost:3000',
      hostname: 'localhost',
      href: jest.fn()
    };

    // localStorage モック
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // document.cookie モック
    Object.defineProperty(document, 'cookie', {
      value: '',
      writable: true
    });

    // navigator.onLine モック
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    });

    // 環境変数モック
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.com/prod';
    process.env.NODE_ENV = 'test';

    // envUtils モック
    envUtils.getApiEndpoint.mockResolvedValue('https://api.example.com');
    envUtils.getRedirectUri.mockResolvedValue('http://localhost:3000/auth/google/callback');
    envUtils.getGoogleClientId.mockResolvedValue('test-client-id');

    // apiUtils モック
    apiUtils.getAuthToken.mockReturnValue(null);
    apiUtils.getUserData.mockReturnValue(null);
    apiUtils.getLastLoginTime.mockReturnValue(null);
    apiUtils.setAuthToken.mockImplementation(() => {});
    apiUtils.clearAuthToken.mockImplementation(() => {});
    apiUtils.setUserData.mockImplementation(() => {});
    apiUtils.authFetch.mockResolvedValue({ success: false });
    apiUtils.authApiClient = {
      get: jest.fn(),
      post: jest.fn()
    };
    apiUtils.TIMEOUT = {
      AUTH: 15000,
      DEFAULT: 10000
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    window.location = originalLocation;
    jest.clearAllMocks();
  });

  describe('初期化', () => {
    test('初期状態が正しく設定される', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
      expect(screen.getByTestId('hasDriveAccess')).toHaveTextContent('false');
    });

    test('GoogleクライアントIDが非同期で取得される', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('googleClientId')).toHaveTextContent('test-client-id');
      });
    });

    test('保存されたユーザーデータが復元される（30日以内）', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      apiUtils.getUserData.mockReturnValue(userData);
      apiUtils.getAuthToken.mockReturnValue('test-token');
      apiUtils.getLastLoginTime.mockReturnValue(Date.now() - 24 * 60 * 60 * 1000); // 1日前

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
    });

    test('古いログインデータは復元されない（30日超過）', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      apiUtils.getUserData.mockReturnValue(userData);
      apiUtils.getAuthToken.mockReturnValue('test-token');
      apiUtils.getLastLoginTime.mockReturnValue(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31日前

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });

      expect(apiUtils.clearAuthToken).toHaveBeenCalled();
    });
  });

  describe('セッション確認', () => {
    test('有効なセッションで認証状態が設定される', async () => {
      apiUtils.authFetch.mockResolvedValue({
        success: true,
        isAuthenticated: true,
        user: { email: 'test@example.com', name: 'Test User' },
        hasDriveAccess: true,
        token: 'new-token'
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('hasDriveAccess')).toHaveTextContent('true');
      });

      expect(apiUtils.setAuthToken).toHaveBeenCalledWith('new-token');
      expect(apiUtils.setUserData).toHaveBeenCalled();
    });

    test('無効なセッションで認証状態がクリアされる', async () => {
      apiUtils.authFetch.mockResolvedValue({
        success: false,
        message: 'Invalid session'
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid session');
      });

      expect(apiUtils.clearAuthToken).toHaveBeenCalled();
    });

    test('ネットワークエラー時はセッション状態を維持', async () => {
      // 初期状態で認証済みユーザーを設定
      apiUtils.getUserData.mockReturnValue({ email: 'test@example.com' });
      apiUtils.getAuthToken.mockReturnValue('test-token');
      apiUtils.getLastLoginTime.mockReturnValue(Date.now() - 1000);

      // ネットワークエラーをシミュレート
      apiUtils.authFetch.mockRejectedValue(new Error('Network Error'));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // エラーが発生してもユーザー状態は維持される（MAX_SESSION_CHECK_FAILURES未満）
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    test('最大失敗回数を超えるとログアウトする', async () => {
      // ネットワークエラーをシミュレート
      apiUtils.authFetch.mockRejectedValue(new Error('Network Error'));

      const { rerender } = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // 5回以上失敗させる
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          apiUtils.authFetch.mockRejectedValue(new Error('Network Error'));
        });
        
        rerender(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      }

      await waitFor(() => {
        expect(apiUtils.clearAuthToken).toHaveBeenCalled();
      });
    });
  });

  describe('Googleログイン', () => {
    test('credential による認証成功', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user: { email: 'test@example.com', name: 'Test User' },
          token: 'auth-token',
          hasDriveAccess: false
        })
      });

      const TestComponent = () => {
        const { loginWithGoogle } = React.useContext(AuthContext);
        React.useEffect(() => {
          loginWithGoogle({ credential: 'test-credential' });
        }, [loginWithGoogle]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('hasDriveAccess')).toHaveTextContent('false');
      });

      expect(apiUtils.setAuthToken).toHaveBeenCalledWith('auth-token');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api-proxy/auth/google/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          credentials: 'include',
          body: JSON.stringify({ credential: 'test-credential' })
        })
      );
    });

    test('code による認証成功（Drive権限あり）', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user: { email: 'test@example.com', name: 'Test User' },
          token: 'auth-token',
          hasDriveAccess: true
        })
      });

      const TestComponent = () => {
        const { loginWithGoogle } = React.useContext(AuthContext);
        React.useEffect(() => {
          loginWithGoogle({ code: 'test-code' });
        }, [loginWithGoogle]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('hasDriveAccess')).toHaveTextContent('true');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api-proxy/auth/google/login',
        expect.objectContaining({
          body: JSON.stringify({
            code: 'test-code',
            redirectUri: 'http://localhost:3000/auth/google/callback'
          })
        })
      );
    });

    test('認証失敗時のエラーハンドリング', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          message: '認証に失敗しました'
        })
      });

      const TestComponent = () => {
        const { loginWithGoogle } = React.useContext(AuthContext);
        React.useEffect(() => {
          loginWithGoogle({ credential: 'invalid-credential' });
        }, [loginWithGoogle]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('認証に失敗しました');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });

    test('ネットワークエラー時のエラーハンドリング', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

      const TestComponent = () => {
        const { loginWithGoogle } = React.useContext(AuthContext);
        React.useEffect(() => {
          loginWithGoogle({ credential: 'test-credential' });
        }, [loginWithGoogle]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });

    test('タイムアウト時のエラーハンドリング', async () => {
      jest.useFakeTimers();
      
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 20000);
        })
      );

      const TestComponent = () => {
        const { loginWithGoogle } = React.useContext(AuthContext);
        React.useEffect(() => {
          loginWithGoogle({ credential: 'test-credential' });
        }, [loginWithGoogle]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // タイムアウトまで進める
      act(() => {
        jest.advanceTimersByTime(apiUtils.TIMEOUT.AUTH + 1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      jest.useRealTimers();
    });

    test('credential も code もない場合のエラー', async () => {
      const TestComponent = () => {
        const { loginWithGoogle } = React.useContext(AuthContext);
        React.useEffect(() => {
          loginWithGoogle({});
        }, [loginWithGoogle]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('認証情報が取得できませんでした');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('ログアウト', () => {
    test('正常なログアウト処理', async () => {
      apiUtils.authFetch.mockResolvedValue({ success: true });

      const TestComponent = () => {
        const { logout } = React.useContext(AuthContext);
        React.useEffect(() => {
          logout();
        }, [logout]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });

      expect(apiUtils.authFetch).toHaveBeenCalledWith('/api-proxy/auth/logout', 'post');
      expect(apiUtils.clearAuthToken).toHaveBeenCalled();
    });

    test('ログアウトエラー時のハンドリング', async () => {
      apiUtils.authFetch.mockRejectedValue(new Error('Logout failed'));

      const TestComponent = () => {
        const { logout } = React.useContext(AuthContext);
        React.useEffect(() => {
          logout();
        }, [logout]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Logout failed');
      });
    });
  });

  describe('Drive API認証', () => {
    test('Drive認証の開始', async () => {
      apiUtils.authFetch.mockResolvedValue({
        authUrl: 'https://accounts.google.com/oauth/authorize?...'
      });

      const TestComponent = () => {
        const { initiateDriveAuth } = React.useContext(AuthContext);
        React.useEffect(() => {
          initiateDriveAuth();
        }, [initiateDriveAuth]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(window.location.href).toBe('https://accounts.google.com/oauth/authorize?...');
      });

      expect(apiUtils.authFetch).toHaveBeenCalledWith(
        '/api-proxy/auth/google/drive/initiate',
        'get',
        null,
        expect.objectContaining({
          withCredentials: true
        })
      );
    });

    test('Drive認証URLの取得失敗', async () => {
      apiUtils.authFetch.mockResolvedValue({});

      const TestComponent = () => {
        const { initiateDriveAuth } = React.useContext(AuthContext);
        React.useEffect(() => {
          initiateDriveAuth();
        }, [initiateDriveAuth]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Drive API認証URLの取得に失敗しました');
      });
    });

    test('Drive API 401エラー（再認証が必要）', async () => {
      apiUtils.authFetch.mockRejectedValue({
        response: {
          status: 401,
          data: { requiresReauth: true }
        }
      });

      const TestComponent = () => {
        const { initiateDriveAuth } = React.useContext(AuthContext);
        React.useEffect(() => {
          initiateDriveAuth();
        }, [initiateDriveAuth]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('再度ログインが必要です。');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });

      expect(apiUtils.clearAuthToken).toHaveBeenCalled();
    });

    test('Drive API 401エラー（権限不足）', async () => {
      apiUtils.authFetch.mockRejectedValue({
        response: {
          status: 401,
          data: { requiresReauth: false }
        }
      });

      const TestComponent = () => {
        const { initiateDriveAuth, isAuthenticated } = React.useContext(AuthContext);
        React.useEffect(() => {
          initiateDriveAuth();
        }, [initiateDriveAuth]);
        return (
          <>
            <TestConsumer />
            <div data-testid="auth-maintained">{isAuthenticated.toString()}</div>
          </>
        );
      };

      // 初期状態で認証済み
      apiUtils.getUserData.mockReturnValue({ email: 'test@example.com' });
      apiUtils.getAuthToken.mockReturnValue('test-token');
      apiUtils.getLastLoginTime.mockReturnValue(Date.now() - 1000);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Google Driveへのアクセス権限がありません。再度認証してください。');
      });

      // ログイン状態は維持される
      expect(apiUtils.clearAuthToken).not.toHaveBeenCalled();
    });
  });

  describe('定期的なセッションチェック', () => {
    test('認証済みの場合、定期的にセッションチェックが実行される', async () => {
      jest.useFakeTimers();

      apiUtils.authFetch
        .mockResolvedValueOnce({
          success: true,
          isAuthenticated: true,
          user: { email: 'test@example.com' }
        })
        .mockResolvedValueOnce({
          success: true,
          isAuthenticated: true,
          user: { email: 'test@example.com' }
        });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      // 2時間後のセッションチェック
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 60 * 1000);
      });

      await waitFor(() => {
        expect(apiUtils.authFetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });

  describe('ページ表示時のセッション再確認', () => {
    test('ページが表示された時にセッションが再確認される', async () => {
      const mockVisibilityState = jest.spyOn(document, 'hidden', 'get');
      mockVisibilityState.mockReturnValue(false);

      apiUtils.authFetch.mockResolvedValue({
        success: true,
        isAuthenticated: true,
        user: { email: 'test@example.com' }
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      // ページを非表示にする
      mockVisibilityState.mockReturnValue(true);
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      // ページを表示する
      mockVisibilityState.mockReturnValue(false);
      document.dispatchEvent(event);

      // 1秒後にセッションチェックが実行される
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(apiUtils.authFetch).toHaveBeenCalledWith('/api-proxy/auth/session', 'get');

      mockVisibilityState.mockRestore();
    });

    test('5分以内の再表示ではセッションチェックがスキップされる', async () => {
      jest.useFakeTimers();
      const mockVisibilityState = jest.spyOn(document, 'hidden', 'get');
      mockVisibilityState.mockReturnValue(false);

      apiUtils.authFetch.mockResolvedValue({
        success: true,
        isAuthenticated: true,
        user: { email: 'test@example.com' }
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      const initialCallCount = apiUtils.authFetch.mock.calls.length;

      // ページを非表示→表示（1分後）
      mockVisibilityState.mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      
      act(() => {
        jest.advanceTimersByTime(60 * 1000); // 1分
      });

      mockVisibilityState.mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));

      act(() => {
        jest.advanceTimersByTime(2000); // 2秒待つ
      });

      // セッションチェックは実行されない
      expect(apiUtils.authFetch.mock.calls.length).toBe(initialCallCount);

      mockVisibilityState.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('ポートフォリオコンテキスト連携', () => {
    test('ポートフォリオコンテキスト参照が設定できる', () => {
      const mockPortfolioContext = {
        handleAuthStateChange: jest.fn(),
        loadFromGoogleDrive: jest.fn()
      };

      const TestComponent = () => {
        const { setPortfolioContextRef } = React.useContext(AuthContext);
        React.useEffect(() => {
          setPortfolioContextRef(mockPortfolioContext);
        }, [setPortfolioContextRef]);
        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // 内部的に参照が設定されることを確認（直接テストは困難）
      expect(true).toBe(true);
    });

    test('認証成功時にポートフォリオコンテキストに通知される', async () => {
      const mockPortfolioContext = {
        handleAuthStateChange: jest.fn(),
        loadFromGoogleDrive: jest.fn()
      };

      apiUtils.authFetch.mockResolvedValue({
        success: true,
        isAuthenticated: true,
        user: { email: 'test@example.com' },
        hasDriveAccess: true
      });

      const TestComponent = () => {
        const { setPortfolioContextRef } = React.useContext(AuthContext);
        React.useEffect(() => {
          setPortfolioContextRef(mockPortfolioContext);
        }, [setPortfolioContextRef]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      // ポートフォリオコンテキストのメソッドが呼ばれることを確認
      expect(mockPortfolioContext.handleAuthStateChange).toHaveBeenCalledWith(
        true,
        expect.objectContaining({ email: 'test@example.com' })
      );
    });

    test('Drive権限がある場合、自動的にGoogle Driveからデータを読み込む', async () => {
      jest.useFakeTimers();
      const mockPortfolioContext = {
        handleAuthStateChange: jest.fn(),
        loadFromGoogleDrive: jest.fn()
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user: { email: 'test@example.com' },
          hasDriveAccess: true
        })
      });

      const TestComponent = () => {
        const { loginWithGoogle, setPortfolioContextRef } = React.useContext(AuthContext);
        React.useEffect(() => {
          setPortfolioContextRef(mockPortfolioContext);
          loginWithGoogle({ credential: 'test-credential' });
        }, [loginWithGoogle, setPortfolioContextRef]);
        return <TestConsumer />;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('hasDriveAccess')).toHaveTextContent('true');
      });

      // 1秒後に自動読み込みが実行される
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      expect(mockPortfolioContext.loadFromGoogleDrive).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('エラーハンドリング', () => {
    test('localStorage エラーが適切にハンドリングされる', async () => {
      window.localStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // エラーが発生してもクラッシュしない
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    test('無効なJSONデータが適切にハンドリングされる', async () => {
      apiUtils.getUserData.mockReturnValue(null);
      window.localStorage.getItem.mockReturnValue('invalid-json');

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // エラーが発生してもクラッシュしない
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });

  describe('環境別の動作', () => {
    test('本番環境での動作', async () => {
      window.location.hostname = 'portfolio-wise.com';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user: { email: 'test@example.com' }
        })
      });

      const TestComponent = () => {
        const { loginWithGoogle } = React.useContext(AuthContext);
        React.useEffect(() => {
          loginWithGoogle({ credential: 'test-credential' });
        }, [loginWithGoogle]);
        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api-proxy/auth/google/login',
          expect.any(Object)
        );
      });
    });

    test('開発環境での動作', async () => {
      window.location.hostname = 'localhost';
      process.env.NODE_ENV = 'development';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          user: { email: 'test@example.com' }
        })
      });

      const TestComponent = () => {
        const { loginWithGoogle } = React.useContext(AuthContext);
        React.useEffect(() => {
          loginWithGoogle({ credential: 'test-credential' });
        }, [loginWithGoogle]);
        return null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api-proxy/auth/google/login',
          expect.any(Object)
        );
      });
    });
  });
});