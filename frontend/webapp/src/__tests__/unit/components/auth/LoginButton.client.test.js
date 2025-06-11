/**
 * LoginButton.client.jsx のテストファイル
 * クライアント側完結のGoogleログインボタンコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginButtonClient from '../../../../components/auth/LoginButton.client';

// React i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// @react-oauth/googleのモック
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
        const mockCredential = { credential: 'mock-credential-token' };
        onSuccess(mockCredential);
      }}
      data-props={JSON.stringify(props)}
    >
      Google Login
    </button>
  )
}));

// useAuthフックのモック
const mockLoginWithGoogle = jest.fn();
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

describe('LoginButton.client Component', () => {
  const { useAuth } = require('../../../../hooks/useAuth');

  const defaultAuthData = {
    loginWithGoogle: mockLoginWithGoogle,
    loading: false,
    error: null,
    googleClientId: 'test-client-id-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(defaultAuthData);
    
    // console.logとconsole.errorのモック
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('レンダリング', () => {
    test('ログインボタンとコンテンツが正しく表示される', () => {
      render(<LoginButtonClient />);
      
      expect(screen.getByText('ログインしてください')).toBeInTheDocument();
      expect(screen.getByText(/Google認証を利用してポートフォリオマネージャーにログイン/)).toBeInTheDocument();
      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
      expect(screen.getByText(/ログインに問題がある場合は/)).toBeInTheDocument();
    });

    test('GoogleOAuthProviderに正しいclientIdが渡される', () => {
      render(<LoginButtonClient />);
      
      const provider = screen.getByTestId('google-oauth-provider');
      expect(provider).toHaveAttribute('data-client-id', 'test-client-id-123');
    });

    test('GoogleLoginに正しいpropsが渡される', () => {
      render(<LoginButtonClient />);
      
      const loginButton = screen.getByTestId('google-login-button');
      const propsData = JSON.parse(loginButton.getAttribute('data-props'));
      
      expect(propsData).toEqual({
        useOneTap: true,
        shape: 'pill',
        text: 'continue_with',
        theme: 'filled_blue',
        width: '280',
        locale: 'ja',
        context: 'signin',
        select_account: true
      });
    });
  });

  describe('ClientID設定チェック', () => {
    test('googleClientIdが未設定の場合の警告表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        googleClientId: null
      });

      render(<LoginButtonClient />);
      
      expect(screen.getByText('設定が必要です')).toBeInTheDocument();
      expect(screen.getByText('Google Client IDを設定してください。')).toBeInTheDocument();
      expect(screen.getByText(/環境変数 REACT_APP_GOOGLE_CLIENT_ID/)).toBeInTheDocument();
      expect(screen.queryByTestId('google-login-button')).not.toBeInTheDocument();
    });

    test('googleClientIdがデフォルト値の場合の警告表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        googleClientId: 'your_google_client_id'
      });

      render(<LoginButtonClient />);
      
      expect(screen.getByText('設定が必要です')).toBeInTheDocument();
      expect(screen.getByText('Google Client IDを設定してください。')).toBeInTheDocument();
    });

    test('正しいClientIDが設定されている場合のログインUI表示', () => {
      render(<LoginButtonClient />);
      
      expect(screen.queryByText('設定が必要です')).not.toBeInTheDocument();
      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    });
  });

  describe('ログイン成功処理', () => {
    test('ログイン成功時の処理', async () => {
      mockLoginWithGoogle.mockResolvedValue(true);

      render(<LoginButtonClient />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('Google認証成功:', { credential: 'mock-credential-token' });
        expect(mockLoginWithGoogle).toHaveBeenCalledWith({ credential: 'mock-credential-token' });
        expect(console.log).toHaveBeenCalledWith('ログイン成功');
      });
      
      // エラーメッセージが表示されていない
      expect(screen.queryByText(/エラーが発生しました/)).not.toBeInTheDocument();
    });

    test('ログインが失敗した場合（loginWithGoogleがfalseを返す）', async () => {
      mockLoginWithGoogle.mockResolvedValue(false);

      render(<LoginButtonClient />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('ログイン処理に失敗しました')).toBeInTheDocument();
      });
    });

    test('ログイン処理中のエラー処理', async () => {
      const errorMessage = 'Network connection failed';
      mockLoginWithGoogle.mockRejectedValue(new Error(errorMessage));

      render(<LoginButtonClient />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('ログイン処理中にエラーが発生しました:', expect.any(Error));
        expect(screen.getByText(`ログインエラー: ${errorMessage}`)).toBeInTheDocument();
      });
    });

    test('エラーオブジェクトにmessageがない場合のデフォルトエラー', async () => {
      mockLoginWithGoogle.mockRejectedValue({});

      render(<LoginButtonClient />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('ログインエラー: 不明なエラー')).toBeInTheDocument();
      });
    });

    test('nullまたはundefinedエラーの場合', async () => {
      mockLoginWithGoogle.mockRejectedValue(null);

      render(<LoginButtonClient />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('ログインエラー: 不明なエラー')).toBeInTheDocument();
      });
    });
  });

  describe('Google認証エラー処理', () => {
    test('GoogleLogin onErrorコールバックの処理', () => {
      // GoogleLoginのモックを再定義してonErrorを呼ぶように
      const { GoogleLogin } = require('@react-oauth/google');
      GoogleLogin.mockImplementation(({ onError, ...props }) => (
        <button 
          data-testid="google-login-error-button"
          onClick={() => {
            onError({ error: 'access_denied' });
          }}
          data-props={JSON.stringify(props)}
        >
          Google Login Error
        </button>
      ));

      render(<LoginButtonClient />);
      
      const errorButton = screen.getByTestId('google-login-error-button');
      fireEvent.click(errorButton);

      expect(console.error).toHaveBeenCalledWith('Google認証エラー:', { error: 'access_denied' });
      expect(screen.getByText('Google認証中にエラーが発生しました')).toBeInTheDocument();
    });
  });

  describe('エラー表示', () => {
    test('useAuthからのエラー表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        error: 'Auth service unavailable'
      });

      render(<LoginButtonClient />);
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('Auth service unavailable')).toBeInTheDocument();
    });

    test('loading状態の表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        loading: true
      });

      render(<LoginButtonClient />);
      
      expect(screen.getByText('認証処理中...')).toBeInTheDocument();
    });

    test('ローカルエラーとフックエラーの両方がある場合', async () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        error: 'Auth hook error'
      });
      mockLoginWithGoogle.mockRejectedValue(new Error('Local error'));

      render(<LoginButtonClient />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        // ローカルエラーが優先される
        expect(screen.getByText('ログインエラー: Local error')).toBeInTheDocument();
      });
    });
  });

  describe('エラーの状態管理', () => {
    test('ログイン成功後にエラーがクリアされる', async () => {
      mockLoginWithGoogle
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(true);

      render(<LoginButtonClient />);
      
      const loginButton = screen.getByTestId('google-login-button');
      
      // 最初のログイン試行でエラー
      fireEvent.click(loginButton);
      await waitFor(() => {
        expect(screen.getByText('ログインエラー: First error')).toBeInTheDocument();
      });

      // 2回目のログイン試行で成功
      fireEvent.click(loginButton);
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('ログイン成功');
      });

      // エラーメッセージがクリアされる
      expect(screen.queryByText('ログインエラー: First error')).not.toBeInTheDocument();
    });
  });

  describe('コンポーネントの構造とスタイル', () => {
    test('正しいCSSクラスが適用されている', () => {
      render(<LoginButtonClient />);
      
      // メインコンテナ
      const container = screen.getByText('ログインしてください').closest('.login-container');
      expect(container).toBeInTheDocument();

      // タイトルのクラス
      const title = screen.getByText('ログインしてください');
      expect(title).toHaveClass('text-lg', 'font-medium', 'mb-2');

      // 説明文のクラス
      const description = screen.getByText(/Google認証を利用して/);
      expect(description).toHaveClass('text-sm', 'text-gray-600', 'mb-4');
    });

    test('エラーメッセージのスタイル', async () => {
      mockLoginWithGoogle.mockRejectedValue(new Error('Test error'));

      render(<LoginButtonClient />);
      
      const loginButton = screen.getByTestId('google-login-button');
      fireEvent.click(loginButton);

      await waitFor(() => {
        const errorContainer = screen.getByText('エラーが発生しました').parentElement;
        expect(errorContainer).toHaveClass('bg-red-100', 'border', 'border-red-400', 'text-red-700', 'px-4', 'py-3', 'rounded', 'relative', 'mt-4');
      });
    });

    test('loading状態のスタイル', () => {
      useAuth.mockReturnValue({
        ...defaultAuthData,
        loading: true
      });

      render(<LoginButtonClient />);
      
      const loadingContainer = screen.getByText('認証処理中...').parentElement;
      expect(loadingContainer).toHaveClass('text-center', 'mt-4');
      
      const loadingText = screen.getByText('認証処理中...');
      expect(loadingText).toHaveClass('text-gray-600');
    });
  });
});