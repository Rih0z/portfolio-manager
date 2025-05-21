/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/auth/LoginButton.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 更新日: 2025-05-21 16:00:00
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * - 2025-05-12 15:30:00 Koki Riho 認可コードフローに対応
 * - 2025-05-19 12:45:00 System Admin AWS環境対応に修正
 * - 2025-05-21 16:00:00 System Admin Google認証エラー修正
 * - 2025-05-22 14:30:00 認証スコープを追加し認証フローを修正
 * 
 * 説明: 
 * Google OAuth認証を使用したログインボタンコンポーネント。
 * ユーザーのGoogle認証とドライブアクセス権限の取得を行う。
 */

import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';
import { getRedirectUri } from '../../utils/envUtils';

const LoginButton = () => {
  const { loginWithGoogle, loading, error, googleClientId } = useAuth();
  const [loginError, setLoginError] = useState(null);
  const [redirectUri, setRedirectUri] = useState('');
  
  useEffect(() => {
    // リダイレクトURIを動的に設定
    const uri = getRedirectUri();
    setRedirectUri(uri);
    console.log('リダイレクトURI設定:', uri);
  }, []);
  
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    console.log('Google認証成功:', credentialResponse);
    
    if (!credentialResponse || !credentialResponse.code) {
      console.error('認証コードがレスポンスに含まれていません', credentialResponse);
      setLoginError('認証コードが取得できませんでした');
      return;
    }
    
    try {
      const success = await loginWithGoogle(credentialResponse);
      if (!success) {
        console.error('バックエンドでの認証処理に失敗しました');
        setLoginError('ログイン処理に失敗しました');
      } else {
        console.log('ログイン成功');
        setLoginError(null);
      }
    } catch (err) {
      console.error('ログイン処理中にエラーが発生しました:', err);
      setLoginError(`ログインエラー: ${err.message}`);
    }
  };
  
  const handleGoogleLoginError = (error) => {
    console.error('Google認証エラー:', error);
    setLoginError('Google認証中にエラーが発生しました');
  };
  
  // GoogleOAuthProviderにクライアントIDがない場合はエラーメッセージを表示
  if (!googleClientId) {
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
    <div className="login-container">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium mb-2">ログインしてください</h3>
        <p className="text-sm text-gray-600 mb-4">
          Google認証を利用してポートフォリオマネージャーにログインします
        </p>
      </div>
      
      <GoogleOAuthProvider clientId={googleClientId}>
        <div className="flex justify-center mb-4">
          <GoogleLogin
            flow="auth-code"
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
            useOneTap
            shape="pill"
            text="continue_with"
            disabled={loading}
            theme="filled_blue"
            width="280"
            locale="ja"
            context="signin"
            ux_mode="popup"
            scope="https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
            select_account="true"
            redirect_uri={redirectUri}
          />
        </div>
      </GoogleOAuthProvider>
      
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

export default LoginButton;
