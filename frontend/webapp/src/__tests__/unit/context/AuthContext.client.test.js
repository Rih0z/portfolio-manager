import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../../../context/AuthContext.client';
import * as jwtDecodeModule from 'jwt-decode';

const { jwtDecode } = jwtDecodeModule;

// Mock dependencies
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn()
}));

// Mock localStorage
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

// Mock console
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  jest.clearAllMocks();
  localStorageMock.clear();
});

// Test component to access context
const TestComponent = ({ onMount }) => {
  const context = React.useContext(AuthContext);
  React.useEffect(() => {
    if (onMount) onMount(context);
  }, [context, onMount]);
  
  return (
    <div>
      <div data-testid="user-email">{context.user?.email || 'No user'}</div>
      <div data-testid="is-authenticated">{context.isAuthenticated ? 'Yes' : 'No'}</div>
      <div data-testid="loading">{context.loading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="error">{context.error || 'No error'}</div>
    </div>
  );
};

describe('AuthContext.client', () => {
  describe('初期化とローカルストレージ復元', () => {
    test('初期状態が正しく設定される', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('No');
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
        expect(screen.getByTestId('error')).toHaveTextContent('No error');
      });
    });

    test('保存されたユーザー情報を復元する', async () => {
      const savedUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg',
        googleId: 'test-google-id'
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedUser));
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('Yes');
      });
    });

    test('無効なJSON形式の保存データを処理する', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          '保存されたユーザー情報の復元に失敗:',
          expect.any(Error)
        );
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('No');
      });
    });
  });

  describe('loginWithGoogle', () => {
    test('有効な認証情報でログインに成功する', async () => {
      const decodedToken = {
        sub: 'google-user-id',
        email: 'user@gmail.com',
        name: 'Google User',
        picture: 'https://example.com/photo.jpg'
      };
      
      jwtDecode.mockReturnValue(decodedToken);
      localStorageMock.getItem.mockReturnValue(null);
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      const credentialResponse = {
        credential: 'valid-jwt-token'
      };
      
      let result;
      await act(async () => {
        result = await authContext.loginWithGoogle(credentialResponse);
      });
      
      expect(result).toBe(true);
      expect(jwtDecode).toHaveBeenCalledWith('valid-jwt-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'portfolio_user',
        JSON.stringify({
          id: 'google-user-id',
          email: 'user@gmail.com',
          name: 'Google User',
          picture: 'https://example.com/photo.jpg',
          googleId: 'google-user-id'
        })
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('user@gmail.com');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('Yes');
      });
    });

    test('認証情報がない場合エラーを返す', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      const credentialResponse = {};
      
      let result;
      await act(async () => {
        result = await authContext.loginWithGoogle(credentialResponse);
      });
      
      expect(result).toBe(false);
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('認証情報が取得できませんでした');
      });
    });

    test('JWTデコードエラーを処理する', async () => {
      jwtDecode.mockImplementation(() => {
        throw new Error('Invalid JWT');
      });
      
      localStorageMock.getItem.mockReturnValue(null);
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      const credentialResponse = {
        credential: 'invalid-jwt-token'
      };
      
      let result;
      await act(async () => {
        result = await authContext.loginWithGoogle(credentialResponse);
      });
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Google認証エラー:', expect.any(Error));
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('ログイン処理中にエラーが発生しました');
      });
    });

    test('ポートフォリオコンテキストに認証状態変更を通知する', async () => {
      const mockPortfolioContext = {
        handleAuthStateChange: jest.fn()
      };
      
      const decodedToken = {
        sub: 'google-user-id',
        email: 'user@gmail.com',
        name: 'Google User',
        picture: 'https://example.com/photo.jpg'
      };
      
      jwtDecode.mockReturnValue(decodedToken);
      localStorageMock.getItem.mockReturnValue(null);
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      // ポートフォリオコンテキストを設定
      act(() => {
        authContext.setPortfolioContextRef(mockPortfolioContext);
      });
      
      const credentialResponse = {
        credential: 'valid-jwt-token'
      };
      
      await act(async () => {
        await authContext.loginWithGoogle(credentialResponse);
      });
      
      expect(mockPortfolioContext.handleAuthStateChange).toHaveBeenCalledWith(
        true,
        {
          id: 'google-user-id',
          email: 'user@gmail.com',
          name: 'Google User',
          picture: 'https://example.com/photo.jpg',
          googleId: 'google-user-id'
        }
      );
    });
  });

  describe('logout', () => {
    test('ログアウトに成功する', async () => {
      const savedUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg',
        googleId: 'test-google-id'
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedUser));
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('Yes');
      });
      
      let result;
      await act(async () => {
        result = await authContext.logout();
      });
      
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('portfolio_user');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('No');
        expect(screen.getByTestId('error')).toHaveTextContent('No error');
      });
    });

    test('ポートフォリオコンテキストにログアウトを通知する', async () => {
      const mockPortfolioContext = {
        handleAuthStateChange: jest.fn()
      };
      
      const savedUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedUser));
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      // ポートフォリオコンテキストを設定
      act(() => {
        authContext.setPortfolioContextRef(mockPortfolioContext);
      });
      
      await act(async () => {
        await authContext.logout();
      });
      
      expect(mockPortfolioContext.handleAuthStateChange).toHaveBeenCalledWith(false, null);
    });

    test('ログアウトエラーを処理する', async () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      let result;
      await act(async () => {
        result = await authContext.logout();
      });
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('ログアウトエラー:', expect.any(Error));
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('ログアウト処理中にエラーが発生しました');
      });
    });
  });

  describe('checkSession', () => {
    test('保存されたセッションを確認する', async () => {
      const savedUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      localStorageMock.getItem
        .mockReturnValueOnce(null) // 初期化時
        .mockReturnValueOnce(JSON.stringify(savedUser)); // checkSession時
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      await act(async () => {
        await authContext.checkSession();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('Yes');
      });
    });

    test('セッションがない場合', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      await act(async () => {
        await authContext.checkSession();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('No');
      });
    });

    test('無効なセッションデータを処理する', async () => {
      localStorageMock.getItem
        .mockReturnValueOnce(null) // 初期化時
        .mockReturnValueOnce('invalid json'); // checkSession時
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      await act(async () => {
        await authContext.checkSession();
      });
      
      expect(console.error).toHaveBeenCalledWith('セッション確認エラー:', expect.any(Error));
    });
  });

  describe('その他の機能', () => {
    test('setPortfolioContextRefが正しく動作する', async () => {
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      const mockContext = { test: 'context' };
      
      act(() => {
        authContext.setPortfolioContextRef(mockContext);
      });
      
      // 内部の ref が設定されることを間接的に確認
      // （loginWithGoogle や logout のテストで確認済み）
      expect(authContext.setPortfolioContextRef).toBeDefined();
    });

    test('googleClientIdが環境変数から取得される', async () => {
      process.env.REACT_APP_GOOGLE_CLIENT_ID = 'test-client-id';
      
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      expect(authContext.googleClientId).toBe('test-client-id');
      
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
    });

    test('handleLogoutがlogoutのエイリアスである', async () => {
      let authContext;
      render(
        <AuthProvider>
          <TestComponent onMount={(ctx) => { authContext = ctx; }} />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      expect(authContext.handleLogout).toBe(authContext.logout);
    });
  });

  describe('ローディング状態の管理', () => {
    test('ログイン中のローディング状態', async () => {
      const decodedToken = {
        sub: 'google-user-id',
        email: 'user@gmail.com',
        name: 'Google User',
        picture: 'https://example.com/photo.jpg'
      };
      
      jwtDecode.mockReturnValue(decodedToken);
      localStorageMock.getItem.mockReturnValue(null);
      
      let authContext;
      const loadingStates = [];
      
      const TestComponentWithLoading = () => {
        const context = React.useContext(AuthContext);
        React.useEffect(() => {
          loadingStates.push(context.loading);
        }, [context.loading]);
        
        if (!authContext) authContext = context;
        
        return <div data-testid="loading">{context.loading ? 'Loading' : 'Not loading'}</div>;
      };
      
      render(
        <AuthProvider>
          <TestComponentWithLoading />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(authContext).toBeDefined();
      });
      
      const credentialResponse = {
        credential: 'valid-jwt-token'
      };
      
      await act(async () => {
        await authContext.loginWithGoogle(credentialResponse);
      });
      
      // ローディング状態が適切に変化することを確認
      expect(loadingStates).toContain(true);
      expect(loadingStates[loadingStates.length - 1]).toBe(false);
    });
  });
});