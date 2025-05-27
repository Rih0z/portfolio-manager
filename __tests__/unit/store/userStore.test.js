/**
 * ファイルパス: __test__/unit/store/userStore.test.js
 * 
 * ユーザーストアの単体テスト
 * 認証状態管理、ユーザープロファイル操作、Google認証統合のテスト
 * 
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

// テスト対象モジュールのインポート
import { AuthProvider, AuthContext } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';

// テスト用ライブラリ
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useContext, useEffect } from 'react';

// モックデータ
import { mockUserProfile } from '../../mocks/data';

// APIモジュールのモック
jest.mock('@/utils/apiUtils', () => ({
  authApiClient: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

// Googleログインモジュールのモック
jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => <div>{children}</div>,
  GoogleLogin: ({ onSuccess, onError, disabled }) => (
    <button
      onClick={() => onSuccess({ code: 'test-auth-code' })}
      disabled={disabled}
      data-testid="google-login-button"
    >
      Google Login
    </button>
  )
}));

// envUtilsのモック
jest.mock('@/utils/envUtils', () => ({
  getApiEndpoint: jest.fn().mockReturnValue('https://api.example.com/dev/auth/session'),
  getRedirectUri: jest.fn().mockReturnValue('https://example.com/auth/callback')
}));

// テスト用の認証コンテキストを消費するコンポーネント
const AuthConsumer = () => {
  const { user, isAuthenticated, loading, error, loginWithGoogle, logout } = useContext(AuthContext);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : isAuthenticated ? (
        <>
          <p data-testid="auth-status">Authenticated</p>
          <p data-testid="user-email">{user?.email}</p>
          <button onClick={logout} data-testid="logout-button">
            Logout
          </button>
        </>
      ) : (
        <>
          <p data-testid="auth-status">Not authenticated</p>
          <button onClick={() => loginWithGoogle({ code: 'test-auth-code' })} data-testid="login-button">
            Login
          </button>
        </>
      )}
      {error && <p data-testid="auth-error">{error}</p>}
    </div>
  );
};

describe('ユーザーストア', () => {
  // APIモジュールのインポート
  const apiUtils = require('@/utils/apiUtils');
  
  // 各テスト前の準備
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // デフォルトのセッション確認レスポンス（未認証）
    apiUtils.authApiClient.get.mockResolvedValue({
      data: {
        success: true,
        isAuthenticated: false,
        message: '認証されていません'
      }
    });
    
    // デフォルトのログインレスポンス（成功）
    apiUtils.authApiClient.post.mockResolvedValue({
      data: {
        success: true,
        isAuthenticated: true,
        user: mockUserProfile,
        session: {
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1時間後
        }
      }
    });
  });
  
  describe('初期状態', () => {
    it('初期状態では未認証状態', async () => {
      // テスト実行
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
      
      // ローディング状態が表示されることを検証
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // セッション確認APIが呼ばれたことを検証
      expect(apiUtils.authApiClient.get).toHaveBeenCalledTimes(1);
      
      // セッション確認後に未認証状態が表示されることを検証
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
      });
    });
    
    it('既存のセッションがある場合は認証済み状態', async () => {
      // 認証済みレスポンスのモック
      apiUtils.authApiClient.get.mockResolvedValue({
        data: {
          success: true,
          isAuthenticated: true,
          user: mockUserProfile,
          session: {
            expiresAt: new Date(Date.now() + 3600000).toISOString() // 1時間後
          }
        }
      });
      
      // テスト実行
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
      
      // セッション確認APIが呼ばれたことを検証
      expect(apiUtils.authApiClient.get).toHaveBeenCalledTimes(1);
      
      // セッション確認後に認証済み状態とユーザー情報が表示されることを検証
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
        expect(screen.getByTestId('user-email')).toHaveTextContent(mockUserProfile.email);
      });
    });
  });
  
  describe('ログイン処理', () => {
    it('ログインボタンクリックで認証処理が実行される', async () => {
      // テスト実行
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
      
      // ローディング状態の終了を待つ
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      // ログインボタンをクリック
      await userEvent.click(screen.getByTestId('login-button'));
      
      // ログインAPIが正しいパラメータで呼ばれたことを検証
      expect(apiUtils.authApiClient.post).toHaveBeenCalledTimes(1);
      expect(apiUtils.authApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        {
          code: 'test-auth-code',
          redirectUri: 'https://example.com/auth/callback'
        }
      );
      
      // ログイン成功後に認証済み状態とユーザー情報が表示されることを検証
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
        expect(screen.getByTestId('user-email')).toHaveTextContent(mockUserProfile.email);
      });
    });
    
    it('ログイン失敗時にエラーメッセージが表示される', async () => {
      // ログイン失敗レスポンスのモック
      apiUtils.authApiClient.post.mockResolvedValue({
        data: {
          success: false,
          message: '認証に失敗しました'
        }
      });
      
      // テスト実行
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
      
      // ローディング状態の終了を待つ
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      // ログインボタンをクリック
      await userEvent.click(screen.getByTestId('login-button'));
      
      // エラーメッセージが表示されることを検証
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument();
      });
      
      // 未認証状態のままであることを検証
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    });
    
    it('ネットワークエラー時も適切にエラーメッセージが表示される', async () => {
      // ネットワークエラーのモック
      apiUtils.authApiClient.post.mockRejectedValue(new Error('Network error'));
      
      // テスト実行
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
      
      // ローディング状態の終了を待つ
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      // ログインボタンをクリック
      await userEvent.click(screen.getByTestId('login-button'));
      
      // エラーメッセージが表示されることを検証
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument();
      });
    });
  });
  
  describe('ログアウト処理', () => {
    it('ログアウトボタンクリックでログアウト処理が実行される', async () => {
      // 認証済みレスポンスのモック
      apiUtils.authApiClient.get.mockResolvedValue({
        data: {
          success: true,
          isAuthenticated: true,
          user: mockUserProfile,
          session: {
            expiresAt: new Date(Date.now() + 3600000).toISOString() // 1時間後
          }
        }
      });
      
      // ログアウト成功レスポンスのモック
      apiUtils.authApiClient.post.mockResolvedValue({
        data: {
          success: true,
          message: 'ログアウトしました'
        }
      });
      
      // テスト実行
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
      
      // 認証済み状態になるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });
      
      // ログアウトボタンをクリック
      await userEvent.click(screen.getByTestId('logout-button'));
      
      // ログアウトAPIが呼ばれたことを検証
      expect(apiUtils.authApiClient.post).toHaveBeenCalledTimes(1);
      
      // ログアウト後に未認証状態になることを検証
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
      });
    });
    
    it('ログアウト失敗時も状態が正しく更新される', async () => {
      // 認証済みレスポンスのモック
      apiUtils.authApiClient.get.mockResolvedValue({
        data: {
          success: true,
          isAuthenticated: true,
          user: mockUserProfile,
          session: {
            expiresAt: new Date(Date.now() + 3600000).toISOString() // 1時間後
          }
        }
      });
      
      // ログアウト失敗のモック（ネットワークエラー）
      apiUtils.authApiClient.post.mockRejectedValue(new Error('Network error'));
      
      // テスト実行
      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );
      
      // 認証済み状態になるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });
      
      // ログアウトボタンをクリック
      await userEvent.click(screen.getByTestId('logout-button'));
      
      // エラーが表示されることを検証
      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toBeInTheDocument();
      });
      
      // それでもログアウト処理で未認証状態になることを検証
      // (クライアント側の状態は更新される)
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
      });
    });
  });
  
  describe('useAuthフック', () => {
    it('認証コンテキストの値を正しく取得できる', async () => {
      // 認証済みレスポンスのモック
      apiUtils.authApiClient.get.mockResolvedValue({
        data: {
          success: true,
          isAuthenticated: true,
          user: mockUserProfile,
          session: {
            expiresAt: new Date(Date.now() + 3600000).toISOString() // 1時間後
          }
        }
      });
      
      // レンダーフックを使用してカスタムフックをテスト
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      
      // テスト実行
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      
      // 初期状態ではローディング中
      expect(result.current.loading).toBe(true);
      
      // 状態更新を待つ
      await waitForNextUpdate();
      
      // 認証情報が正しく取得できることを検証
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUserProfile);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      
      // 関数が存在することを検証
      expect(typeof result.current.loginWithGoogle).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.checkSession).toBe('function');
    });
    
    it('セッション確認関数を呼び出すことができる', async () => {
      // レンダーフックを使用してカスタムフックをテスト
      const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
      
      // テスト実行
      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });
      
      // 初期状態の確認
      await waitForNextUpdate();
      expect(apiUtils.authApiClient.get).toHaveBeenCalledTimes(1);
      
      // セッション確認関数を呼び出し
      act(() => {
        result.current.checkSession();
      });
      
      // セッション確認APIが再度呼ばれたことを検証
      await waitForNextUpdate();
      expect(apiUtils.authApiClient.get).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('コンテキスト間連携', () => {
    // ポートフォリオコンテキストのモック
    const mockPortfolioContext = {
      handleAuthStateChange: jest.fn()
    };
    
    // 認証コンテキストからポートフォリオコンテキストへの参照を設定するテスト用コンポーネント
    const ContextConnector = () => {
      const { setPortfolioContextRef } = useContext(AuthContext);
      
      useEffect(() => {
        if (setPortfolioContextRef) {
          setPortfolioContextRef(mockPortfolioContext);
        }
      }, [setPortfolioContextRef]);
      
      return null;
    };
    
    it('認証状態変更時にポートフォリオコンテキストに通知される', async () => {
      // 認証済みレスポンスのモック
      apiUtils.authApiClient.get.mockResolvedValue({
        data: {
          success: true,
          isAuthenticated: true,
          user: mockUserProfile,
          session: {
            expiresAt: new Date(Date.now() + 3600000).toISOString() // 1時間後
          }
        }
      });
      
      // テスト実行
      render(
        <AuthProvider>
          <ContextConnector />
          <AuthConsumer />
        </AuthProvider>
      );
      
      // 認証状態になるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });
      
      // ポートフォリオコンテキストの認証状態変更ハンドラーが呼ばれたことを検証
      expect(mockPortfolioContext.handleAuthStateChange).toHaveBeenCalledWith(true, mockUserProfile);
      
      // ログアウト処理のモック
      apiUtils.authApiClient.post.mockResolvedValue({
        data: {
          success: true,
          message: 'ログアウトしました'
        }
      });
      
      // ログアウトボタンをクリック
      await userEvent.click(screen.getByTestId('logout-button'));
      
      // 未認証状態になるのを待つ
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
      });
      
      // ポートフォリオコンテキストの認証状態変更ハンドラーが再度呼ばれたことを検証
      expect(mockPortfolioContext.handleAuthStateChange).toHaveBeenCalledWith(false, null);
    });
  });
});
