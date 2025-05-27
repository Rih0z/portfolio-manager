/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/auth/LoginButton.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 更新日: 2025-05-27 10:15:00
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * - 2025-05-12 15:30:00 Koki Riho 認可コードフローに対応
 * - 2025-05-19 12:45:00 System Admin AWS環境対応に修正
 * - 2025-05-21 16:00:00 System Admin Google認証エラー修正
 * - 2025-05-22 14:30:00 認証スコープを追加し認証フローを修正
 * - 2025-05-27 10:15:00 認証コード取得の修正
 * 
 * 説明: 
 * Google OAuth認証を使用したログインボタンコンポーネント。
 * ユーザーのGoogle認証とドライブアクセス権限の取得を行う。
 */

import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';
import { getRedirectUri } from '../../utils/envUtils';

const LoginButtonContent = () => {
  const { loginWithGoogle, loading, error } = useAuth();
  const [loginError, setLoginError] = useState(null);
  const [redirectUri, setRedirectUri] = useState('');
  
  useEffect(() => {
    // リダイレクトURIを動的に設定
    const uri = getRedirectUri();
    setRedirectUri(uri);
    console.log('リダイレクトURI設定:', uri);
  }, []);
  
  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      console.log('Google認証成功 - コードレスポンス:', codeResponse);
      
      if (!codeResponse.code) {
        console.error('認証コードがレスポンスに含まれていません', codeResponse);
        setLoginError('認証コードが取得できませんでした');
        return;
      }
      
      try {
        const success = await loginWithGoogle(codeResponse);
        if (!success) {
          console.error('バックエンドでの認証処理に失敗しました');
          setLoginError('ログイン処理に失敗しました');
        } else {
          console.log('ログイン成功');
          setLoginError(null);
        }
      } catch (err) {
        console.error('ログイン処理中にエラーが発生しました:', err);
        const message = err?.message || '不明なエラー';
        setLoginError(`ログインエラー: ${message}`);
      }
    },
    onError: (error) => {
      console.error('Google認証エラー:', error);
      setLoginError('Google認証中にエラーが発生しました');
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    redirect_uri: redirectUri,
  });
  
  return (
    <div className="login-container">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium mb-2">ログインしてください</h3>
        <p className="text-sm text-gray-600 mb-4">
          Google認証を利用してポートフォリオマネージャーにログインします
        </p>
      </div>
      
      <div className="flex justify-center mb-4">
        <button
          onClick={() => googleLogin()}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-full flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでログイン
        </button>
      </div>
      
      {(loginError || error) && (
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
          <p className="font-bold">エラーが発生しました</p>
          <p className="text-sm">{loginError || error}</p>
        </div>
      )}
      
      {loading && (
        <div className="loading-text text-center mt-4">
          <p className="text-gray-600">認証処理中...</p>
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

const LoginButton = () => {
  const { googleClientId } = useAuth();
  
  // GoogleOAuthProviderにクライアントIDがない場合はエラーメッセージを表示
  if (!googleClientId || googleClientId === 'your_google_client_id') {
    return (
      <div className="login-container">
        <div className="error-message">
          <p>Google Client IDが設定されていません。</p>
          <p>環境変数 REACT_APP_GOOGLE_CLIENT_ID を確認してください。</p>
        </div>
      </div>
    );
  }
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <LoginButtonContent />
    </GoogleOAuthProvider>
  );
};

export default LoginButton;