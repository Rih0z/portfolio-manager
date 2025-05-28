/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/auth/OAuthLoginButton.jsx 
 * 
 * 作成者: System 
 * 作成日: 2025-05-27
 * 
 * 説明: 
 * Google OAuth2.0を使用した統合ログインボタンコンポーネント。
 * Google Drive権限を必須として、One Tapを使用せずに実装。
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

// 必須スコープ（Drive権限を含む）
const REQUIRED_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',      // 必須：アプリが作成・開いたファイルへのアクセス
  'https://www.googleapis.com/auth/drive.appdata'    // 必須：アプリ専用フォルダへのアクセス
].join(' ');

// エラーメッセージ
const ERROR_MESSAGES = {
  MISSING_DRIVE_SCOPE: 'Google Driveへのアクセス許可が必要です。すべての権限を許可してください。',
  ONE_TAP_NOT_SUPPORTED: 'クイックログインはサポートされていません。通常のログインボタンを使用してください。',
  DRIVE_ACCESS_REQUIRED: 'このアプリケーションを使用するにはGoogle Driveアクセスが必要です。',
  GENERAL_ERROR: 'ログイン処理中にエラーが発生しました。'
};

const OAuthLoginButton = () => {
  const { loginWithGoogle, loading, error, isAuthenticated, googleClientId } = useAuth();
  const { addNotification } = usePortfolioContext();
  const [loginError, setLoginError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [codeProcessed, setCodeProcessed] = useState(false); // 認証コードの処理済みフラグ

  // redirect_uriを動的に生成（環境に応じて）
  const getRedirectUri = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth/google/callback`;
  };

  // OAuth URLを生成
  const generateOAuthUrl = () => {
    const redirectUri = getRedirectUri();
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: REQUIRED_SCOPES,
      access_type: 'offline',
      prompt: 'consent'  // 必ず同意画面を表示
    });
    
    console.log('Generated redirect_uri:', redirectUri); // デバッグ用
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  // OAuth callbackの処理
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      if (error) {
        console.error('OAuth error:', error);
        setLoginError('認証がキャンセルされました');
        // URLパラメータをクリア
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      if (code && !codeProcessed) {
        // URLパラメータを即座にクリア（重複処理を防ぐ）
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 認証コードの処理を開始（二重実行を防ぐ）
        setCodeProcessed(true);
        setIsProcessing(true);
        console.log('OAuth code received:', code.substring(0, 20) + '...');
        console.log('Processing authentication code for the first time');
        
        try {
          // redirectUriを含めてバックエンドに送信（動的に生成）
          const redirectUri = getRedirectUri();
          console.log('Sending to backend with redirect_uri:', redirectUri); // デバッグ用
          const result = await loginWithGoogle({ code, redirectUri });
          
          if (result && result.success) {
            console.log('ログイン成功（Drive権限付き）');
            if (addNotification) {
              addNotification('ログインが完了しました。Google Driveも利用可能です。', 'success');
            }
            // URLパラメータをクリア
            window.history.replaceState({}, document.title, '/');
          } else {
            handleLoginError(result);
          }
        } catch (err) {
          console.error('ログイン処理エラー:', err);
          setLoginError(ERROR_MESSAGES.GENERAL_ERROR);
        } finally {
          setIsProcessing(false);
        }
      } else if (code && codeProcessed) {
        console.log('Authentication code already processed, skipping...');
      }
    };
    
    handleCallback();
  }, [loginWithGoogle, addNotification, codeProcessed, getRedirectUri]);

  // エラーハンドリング
  const handleLoginError = (result) => {
    if (result?.error?.code === 'MISSING_DRIVE_SCOPE') {
      setLoginError(ERROR_MESSAGES.MISSING_DRIVE_SCOPE);
      // 3秒後に再度認証画面へ
      setTimeout(() => {
        window.location.href = generateOAuthUrl();
      }, 3000);
    } else if (result?.error?.code === 'ONE_TAP_NOT_SUPPORTED') {
      setLoginError(ERROR_MESSAGES.ONE_TAP_NOT_SUPPORTED);
    } else {
      setLoginError(result?.error?.message || ERROR_MESSAGES.GENERAL_ERROR);
    }
  };

  // ログインボタンクリック
  const handleLogin = () => {
    console.log('OAuth login initiated');
    console.log('Current location:', {
      origin: window.location.origin,
      href: window.location.href,
      protocol: window.location.protocol,
      host: window.location.host,
      pathname: window.location.pathname
    });
    
    const redirectUri = getRedirectUri();
    console.log('Computed redirect_uri:', redirectUri);
    console.log('Google Client ID:', googleClientId);
    
    const authUrl = generateOAuthUrl();
    console.log('Full OAuth URL:', authUrl);
    
    // URLをパースして確認
    try {
      const url = new URL(authUrl);
      const params = new URLSearchParams(url.search);
      console.log('OAuth URL params:', {
        client_id: params.get('client_id'),
        redirect_uri: params.get('redirect_uri'),
        response_type: params.get('response_type'),
        scope: params.get('scope')
      });
    } catch (e) {
      console.error('Failed to parse OAuth URL:', e);
    }
    
    console.log('Redirecting to Google OAuth...');
    window.location.href = authUrl;
  };

  // 既にログイン済みの場合
  if (isAuthenticated) {
    return (
      <div className="text-center">
        <p className="text-green-600">ログイン済みです</p>
      </div>
    );
  }

  // クライアントIDが設定されていない場合は、設定を取得中として表示
  if (!googleClientId || googleClientId === 'your_google_client_id' || googleClientId === 'dummy-client-id') {
    return (
      <div className="login-container">
        <div className="text-gray-500 px-4 py-3 rounded">
          <p>認証設定を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium mb-2">ログインしてください</h3>
        <div className="text-sm text-gray-600 mb-4">
          <p>このアプリケーションはGoogle Driveを使用してデータを保存します。</p>
          <p>ログイン時にGoogle Driveへのアクセス許可が必要です。</p>
        </div>
      </div>
      
      <div className="flex justify-center mb-4">
        <button
          onClick={handleLogin}
          disabled={loading || isProcessing}
          className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading || isProcessing ? '処理中...' : 'Googleでログイン（Drive連携含む）'}
        </button>
      </div>
      
      {(loginError || error) && (
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
          <p className="font-bold">エラーが発生しました</p>
          <p className="text-sm">{loginError || error}</p>
        </div>
      )}
      
      <div className="text-center mt-6">
        <p className="text-xs text-gray-500">
          ログインに問題がある場合は、ブラウザのキャッシュとCookieをクリアして再試行してください。
        </p>
      </div>
    </div>
  );
};

export default OAuthLoginButton;