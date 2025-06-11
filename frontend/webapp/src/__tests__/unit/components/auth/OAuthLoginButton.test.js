/**
 * OAuthLoginButton.jsx のテストファイル
 * Google OAuth2.0を使用した統合ログインボタンコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OAuthLoginButton from '../../../../components/auth/OAuthLoginButton';

// React i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// useAuthフックのモック
const mockLoginWithGoogle = jest.fn();
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// usePortfolioContextフックのモック
const mockAddNotification = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// window.location のモック
const mockLocation = {
  origin: 'https://test.example.com',
  href: 'https://test.example.com/',
  protocol: 'https:',
  host: 'test.example.com',
  pathname: '/',
  search: ''
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// window.history のモック
const mockHistory = {
  replaceState: jest.fn()
};
Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true
});

describe('OAuthLoginButton Component', () => {
  const { useAuth } = require('../../../../hooks/useAuth');
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');

  const defaultAuthData = {
    loginWithGoogle: mockLoginWithGoogle,
    loading: false,
    error: null,
    isAuthenticated: false,
    googleClientId: 'test-google-client-id'
  };

  const defaultPortfolioData = {
    addNotification: mockAddNotification
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(defaultAuthData);
    usePortfolioContext.mockReturnValue(defaultPortfolioData);
    
    // Location searchをリセット
    mockLocation.search = '';
    
    // console.logのモック
    console.log = jest.fn();
    console.error = jest.fn();
    
    // setTimeout のクリア
    jest.clearAllTimers();
  });

  describe('レンダリング', () => {
    test('ログインボタンとコンテンツが正しく表示される', () => {
      render(<OAuthLoginButton />);
      
      expect(screen.getByText('ログインしてください')).toBeInTheDocument();
      expect(screen.getByText(/このアプリケーションはGoogle Driveを使用/)).toBeInTheDocument();
      expect(screen.getByText(/ログイン時にGoogle Driveへのアクセス許可が必要/)).toBeInTheDocument();
      expect(screen.getByText('Googleでログイン（Drive連携含む）')).toBeInTheDocument();
    });

    test('既にログイン済みの場合の表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        isAuthenticated: true
      });

      render(<OAuthLoginButton />);
      
      expect(screen.getByText('ログイン済みです')).toBeInTheDocument();
      expect(screen.queryByText('Googleでログイン（Drive連携含む）')).not.toBeInTheDocument();
    });

    test('googleClientIdが未設定の場合の表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        googleClientId: null
      });

      render(<OAuthLoginButton />);
      
      expect(screen.getByText('認証設定を読み込み中...')).toBeInTheDocument();
      expect(screen.queryByText('Googleでログイン（Drive連携含む）')).not.toBeInTheDocument();
    });

    test('googleClientIdがデフォルト値の場合の表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        googleClientId: 'your_google_client_id'
      });

      render(<OAuthLoginButton />);
      
      expect(screen.getByText('認証設定を読み込み中...')).toBeInTheDocument();
    });

    test('googleClientIdがダミー値の場合の表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        googleClientId: 'dummy-client-id'
      });

      render(<OAuthLoginButton />);
      
      expect(screen.getByText('認証設定を読み込み中...')).toBeInTheDocument();
    });
  });

  describe('ログインボタンクリック処理', () => {
    test('ログインボタンクリックでOAuth URLに遷移', () => {
      // window.location.href への代入をモック
      delete window.location;
      window.location = { ...mockLocation, href: '' };

      render(<OAuthLoginButton />);
      
      const loginButton = screen.getByText('Googleでログイン（Drive連携含む）');
      fireEvent.click(loginButton);

      expect(console.log).toHaveBeenCalledWith('OAuth login initiated');
      expect(console.log).toHaveBeenCalledWith('Redirecting to Google OAuth...');
      
      // OAuth URLが正しく生成されている
      expect(window.location.href).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(window.location.href).toContain('client_id=test-google-client-id');
      expect(window.location.href).toContain('redirect_uri=https%3A%2F%2Ftest.example.com%2Fauth%2Fgoogle%2Fcallback');
      expect(window.location.href).toContain('response_type=code');
      expect(window.location.href).toContain('scope=openid%20email%20profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.appdata');
      expect(window.location.href).toContain('access_type=offline');
      expect(window.location.href).toContain('prompt=consent');
    });

    test('loading状態でのボタン無効化', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        loading: true
      });

      render(<OAuthLoginButton />);
      
      const loginButton = screen.getByText('処理中...');
      expect(loginButton).toBeDisabled();
      expect(loginButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('OAuth Callbackの処理', () => {
    test('認証コードが含まれるURLでのログイン成功処理', async () => {
      mockLocation.search = '?code=test-auth-code&state=test-state';
      mockLoginWithGoogle.mockResolvedValue({
        success: true
      });

      render(<OAuthLoginButton />);

      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('OAuth code received:', 'test-auth-code...');
        expect(mockLoginWithGoogle).toHaveBeenCalledWith({
          code: 'test-auth-code',
          redirectUri: 'https://test.example.com/auth/google/callback'
        });
        expect(mockAddNotification).toHaveBeenCalledWith(
          'ログインが完了しました。Google Driveも利用可能です。',
          'success'
        );
        expect(mockHistory.replaceState).toHaveBeenCalledWith({}, document.title, '/');
      });
    });

    test('OAuth認証エラーの処理', () => {
      mockLocation.search = '?error=access_denied&error_description=User%20denied%20access';

      render(<OAuthLoginButton />);

      expect(console.error).toHaveBeenCalledWith('OAuth error:', 'access_denied');
      expect(screen.getByText('認証がキャンセルされました')).toBeInTheDocument();
      expect(mockHistory.replaceState).toHaveBeenCalledWith({}, document.title, '/');
    });

    test('ログイン処理でエラーが発生した場合', async () => {
      mockLocation.search = '?code=test-auth-code';
      mockLoginWithGoogle.mockRejectedValue(new Error('Backend error'));

      render(<OAuthLoginButton />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('ログイン処理エラー:', expect.any(Error));
        expect(screen.getByText('ログイン処理中にエラーが発生しました。')).toBeInTheDocument();
      });
    });

    test('MISSING_DRIVE_SCOPEエラーの処理', async () => {
      jest.useFakeTimers();
      mockLocation.search = '?code=test-auth-code';
      mockLoginWithGoogle.mockResolvedValue({
        success: false,
        error: {
          code: 'MISSING_DRIVE_SCOPE',
          message: 'Drive scope missing'
        }
      });

      // window.location.href への代入をモック
      delete window.location;
      window.location = { ...mockLocation, href: '' };

      render(<OAuthLoginButton />);

      await waitFor(() => {
        expect(screen.getByText('Google Driveへのアクセス許可が必要です。すべての権限を許可してください。')).toBeInTheDocument();
      });

      // 3秒後に再認証画面に遷移
      jest.advanceTimersByTime(3000);
      
      expect(window.location.href).toContain('https://accounts.google.com/o/oauth2/v2/auth');

      jest.useRealTimers();
    });

    test('ONE_TAP_NOT_SUPPORTEDエラーの処理', async () => {
      mockLocation.search = '?code=test-auth-code';
      mockLoginWithGoogle.mockResolvedValue({
        success: false,
        error: {
          code: 'ONE_TAP_NOT_SUPPORTED',
          message: 'One tap not supported'
        }
      });

      render(<OAuthLoginButton />);

      await waitFor(() => {
        expect(screen.getByText('クイックログインはサポートされていません。通常のログインボタンを使用してください。')).toBeInTheDocument();
      });
    });

    test('その他のログインエラーの処理', async () => {
      mockLocation.search = '?code=test-auth-code';
      mockLoginWithGoogle.mockResolvedValue({
        success: false,
        error: {
          message: 'Custom error message'
        }
      });

      render(<OAuthLoginButton />);

      await waitFor(() => {
        expect(screen.getByText('Custom error message')).toBeInTheDocument();
      });
    });

    test('認証コードの重複処理防止', async () => {
      mockLocation.search = '?code=test-auth-code';
      mockLoginWithGoogle.mockResolvedValue({ success: true });

      render(<OAuthLoginButton />);

      await waitFor(() => {
        expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith('Processing authentication code for the first time');
      });

      // 再レンダリングしても重複実行されない
      render(<OAuthLoginButton />);
      
      expect(console.log).toHaveBeenCalledWith('Authentication code already processed, skipping...');
      expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1); // 追加で呼ばれない
    });
  });

  describe('エラー表示', () => {
    test('useAuthからのエラー表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        error: 'Auth service error'
      });

      render(<OAuthLoginButton />);
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('Auth service error')).toBeInTheDocument();
    });

    test('処理中のローディング状態', () => {
      render(<OAuthLoginButton />);
      
      // isProcessing状態をシミュレート（内部状態なので直接テストは困難）
      // 代わりにloading状態をテスト
      useAuth.mockReturnValue({
        ...defaultAuthData,
        loading: true
      });

      const { rerender } = render(<OAuthLoginButton />);
      
      const loginButton = screen.getByText('処理中...');
      expect(loginButton).toBeDisabled();
    });
  });

  describe('getRedirectUri関数', () => {
    test('正しいredirect URIが生成される', () => {
      render(<OAuthLoginButton />);
      
      const loginButton = screen.getByText('Googleでログイン（Drive連携含む）');
      fireEvent.click(loginButton);

      expect(console.log).toHaveBeenCalledWith('Computed redirect_uri:', 'https://test.example.com/auth/google/callback');
    });

    test('異なるoriginでの正しいredirect URI生成', () => {
      // originを変更
      mockLocation.origin = 'https://portfolio-wise.com';
      
      render(<OAuthLoginButton />);
      
      const loginButton = screen.getByText('Googleでログイン（Drive連携含む）');
      fireEvent.click(loginButton);

      expect(console.log).toHaveBeenCalledWith('Computed redirect_uri:', 'https://portfolio-wise.com/auth/google/callback');
    });
  });

  describe('addNotificationが利用できない場合', () => {
    test('addNotificationがnullでもエラーにならない', async () => {
      usePortfolioContext.mockReturnValue({
        addNotification: null
      });
      mockLocation.search = '?code=test-auth-code';
      mockLoginWithGoogle.mockResolvedValue({ success: true });

      expect(() => {
        render(<OAuthLoginButton />);
      }).not.toThrow();
    });
  });

  describe('コンポーネントの構造とスタイル', () => {
    test('正しいCSSクラスが適用されている', () => {
      render(<OAuthLoginButton />);
      
      // メインコンテナ
      const container = screen.getByText('ログインしてください').closest('.login-container');
      expect(container).toBeInTheDocument();

      // ログインボタンのクラス
      const loginButton = screen.getByText('Googleでログイン（Drive連携含む）');
      expect(loginButton).toHaveClass(
        'inline-flex', 'items-center', 'px-6', 'py-3', 'border', 'border-gray-300',
        'shadow-sm', 'text-base', 'font-medium', 'rounded-md', 'text-gray-700',
        'bg-white', 'hover:bg-gray-50', 'focus:outline-none', 'focus:ring-2',
        'focus:ring-offset-2', 'focus:ring-indigo-500', 'disabled:opacity-50',
        'disabled:cursor-not-allowed'
      );
    });

    test('SVGアイコンが正しく表示される', () => {
      render(<OAuthLoginButton />);
      
      const loginButton = screen.getByText('Googleでログイン（Drive連携含む）');
      const svg = loginButton.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-5', 'h-5', 'mr-2');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    test('エラーメッセージのスタイル', async () => {
      mockLocation.search = '?error=access_denied';

      render(<OAuthLoginButton />);

      const errorContainer = screen.getByText('エラーが発生しました').parentElement;
      expect(errorContainer).toHaveClass(
        'error-message', 'bg-red-100', 'border', 'border-red-400',
        'text-red-700', 'px-4', 'py-3', 'rounded', 'relative', 'mt-4'
      );
    });
  });
});