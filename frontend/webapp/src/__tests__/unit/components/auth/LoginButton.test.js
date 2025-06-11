/**
 * LoginButton.jsx のテストファイル
 * Google OAuth認証を使用したログインボタンコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginButton from '../../../../components/auth/LoginButton';

// React i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// @react-oauth/googleのモック
const mockGoogleLogin = jest.fn();
jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children, clientId }) => (
    <div data-testid="google-oauth-provider" data-client-id={clientId}>
      {children}
    </div>
  ),
  GoogleLogin: ({ onSuccess, onError, ...props }) => (
    <button 
      data-testid="google-login-button"
      onClick={() => {
        const mockCredential = { credential: 'mock-credential' };
        onSuccess(mockCredential);
      }}
      {...props}
    >
      Googleでログイン
    </button>
  )
}));

// useAuthフックのモック
const mockLoginWithGoogle = jest.fn();
const mockInitiateDriveAuth = jest.fn();
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// usePortfolioContextフックのモック
const mockAddNotification = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

describe('LoginButton Component', () => {
  const { useAuth } = require('../../../../hooks/useAuth');
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');

  const defaultAuthData = {
    loginWithGoogle: mockLoginWithGoogle,
    loading: false,
    error: null,
    initiateDriveAuth: mockInitiateDriveAuth,
    googleClientId: 'test-client-id'
  };

  const defaultPortfolioData = {
    addNotification: mockAddNotification
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(defaultAuthData);
    usePortfolioContext.mockReturnValue(defaultPortfolioData);
    
    // console.logのモック
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('レンダリング', () => {
    test('ログインボタンが正しく表示される', () => {
      render(<LoginButton />);
      
      expect(screen.getByText('ログインしてください')).toBeInTheDocument();
      expect(screen.getByText(/Google認証でログインすると/)).toBeInTheDocument();
      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    });

    test('GoogleClientIdが読み込み中の場合のメッセージが表示される', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        googleClientId: null
      });

      render(<LoginButton />);
      
      expect(screen.getByText('認証設定を読み込み中...')).toBeInTheDocument();
      expect(screen.queryByTestId('google-login-button')).not.toBeInTheDocument();
    });

    test('無効なGoogleClientIdの場合のメッセージが表示される', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        googleClientId: 'your_google_client_id'
      });

      render(<LoginButton />);
      
      expect(screen.getByText('認証設定を読み込み中...')).toBeInTheDocument();
    });

    test('ダミーGoogleClientIdの場合のメッセージが表示される', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        googleClientId: 'dummy-client-id'
      });

      render(<LoginButton />);
      
      expect(screen.getByText('認証設定を読み込み中...')).toBeInTheDocument();
    });

    test('GoogleOAuthProviderに正しいclientIdが渡される', () => {
      render(<LoginButton />);
      
      const provider = screen.getByTestId('google-oauth-provider');
      expect(provider).toHaveAttribute('data-client-id', 'test-client-id');
    });
  });

  describe('ログイン処理', () => {
    test('ログイン成功時の処理 - Driveアクセス権限あり', async () => {
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        hasDriveAccess: true
      });

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLoginWithGoogle).toHaveBeenCalledWith({ credential: 'mock-credential' });
        expect(mockAddNotification).toHaveBeenCalledWith(
          'ログインが完了しました。Google Driveも利用可能です。',
          'success'
        );
      });
    });

    test('ログイン成功時の処理 - Driveアクセス権限なし', async () => {
      jest.useFakeTimers();
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        hasDriveAccess: false
      });
      mockInitiateDriveAuth.mockResolvedValue(true);

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          'Google Driveの連携を開始します...',
          'info'
        );
      });

      // setTimeout処理をトリガー
      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(mockInitiateDriveAuth).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    test('ログイン成功でDrive連携失敗時の処理', async () => {
      jest.useFakeTimers();
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        hasDriveAccess: false
      });
      mockInitiateDriveAuth.mockResolvedValue(false);

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          'Google Drive連携に失敗しました。設定画面から再度お試しください。',
          'warning'
        );
      });

      jest.useRealTimers();
    });

    test('Drive連携機能が利用できない場合の処理', async () => {
      jest.useFakeTimers();
      useAuth.mockReturnValue({
        ...defaultAuthData,
        initiateDriveAuth: null
      });
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        hasDriveAccess: false
      });

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith('Drive連携機能が利用できません');
      });

      jest.useRealTimers();
    });

    test('Drive連携でエラーが発生した場合の処理', async () => {
      jest.useFakeTimers();
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        hasDriveAccess: false
      });
      mockInitiateDriveAuth.mockRejectedValue(new Error('Drive error'));

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          'Google Drive連携でエラーが発生しました。後で再度お試しください。',
          'warning'
        );
      });

      jest.useRealTimers();
    });

    test('ログイン失敗時の処理', async () => {
      mockLoginWithGoogle.mockResolvedValue({
        success: false
      });

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('ログイン処理に失敗しました')).toBeInTheDocument();
      });
    });

    test('認証情報が不正な場合の処理', async () => {
      // Google Loginのモックを変更して不正なレスポンスを返すように
      jest.clearAllMocks();
      const { GoogleLogin } = require('@react-oauth/google');
      GoogleLogin.mockImplementation(({ onSuccess }) => (
        <button 
          data-testid="google-login-button"
          onClick={() => {
            onSuccess({}); // credential も code も含まない空のオブジェクト
          }}
        >
          Googleでログイン
        </button>
      ));

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('認証情報が取得できませんでした')).toBeInTheDocument();
      });
    });

    test('ログイン処理中のエラーハンドリング', async () => {
      mockLoginWithGoogle.mockRejectedValue(new Error('Network error'));

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('ログインエラー: Network error')).toBeInTheDocument();
      });
    });

    test('エラーメッセージがない場合のデフォルトエラー処理', async () => {
      mockLoginWithGoogle.mockRejectedValue({});

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('ログインエラー: 不明なエラー')).toBeInTheDocument();
      });
    });
  });

  describe('エラー表示', () => {
    test('loading状態の表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        loading: true
      });

      render(<LoginButton />);
      
      expect(screen.getByText('認証処理中...')).toBeInTheDocument();
    });

    test('useAuthからのエラー表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        error: 'Auth hook error'
      });

      render(<LoginButton />);
      
      expect(screen.getByText('Auth hook error')).toBeInTheDocument();
    });

    test('ローカルエラーとフックエラーの両方が存在する場合', async () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        error: 'Auth hook error'
      });
      mockLoginWithGoogle.mockRejectedValue(new Error('Local error'));

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('ログインエラー: Local error')).toBeInTheDocument();
      });
    });
  });

  describe('addNotificationが利用できない場合', () => {
    test('addNotificationがnullの場合でもエラーにならない', async () => {
      usePortfolioContext.mockReturnValue({
        addNotification: null
      });
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        hasDriveAccess: true
      });

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      
      expect(() => {
        fireEvent.click(loginButton);
      }).not.toThrow();
    });
  });

  describe('開発環境でのログ出力', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('開発環境でのログ出力', async () => {
      process.env.NODE_ENV = 'development';
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        hasDriveAccess: true
      });

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('Google認証レスポンス受信');
      });
    });

    test('非開発環境ではログ出力されない', async () => {
      process.env.NODE_ENV = 'production';
      mockLoginWithGoogle.mockResolvedValue({
        success: true,
        hasDriveAccess: true
      });

      render(<LoginButton />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(console.log).not.toHaveBeenCalledWith('Google認証レスポンス受信');
      });
    });
  });
});