/**
 * クライアント側完結のGoogleログインボタン
 * credentialフローを使用（auth-codeフローではない）
 */

import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';

const LoginButton = () => {
  const { loginWithGoogle, loading, error, googleClientId } = useAuth();
  const [loginError, setLoginError] = useState(null);
  
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    console.log('Google認証成功:', credentialResponse);
    
    try {
      const success = await loginWithGoogle(credentialResponse);
      if (!success) {
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
  };
  
  const handleGoogleLoginError = (error) => {
    console.error('Google認証エラー:', error);
    setLoginError('Google認証中にエラーが発生しました');
  };
  
  // GoogleOAuthProviderにクライアントIDがない場合はエラーメッセージを表示
  if (!googleClientId || googleClientId === 'your_google_client_id') {
    return (
      <div className="login-container">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
          <p className="font-bold">設定が必要です</p>
          <p className="text-sm">Google Client IDを設定してください。</p>
          <p className="text-xs mt-2">環境変数 REACT_APP_GOOGLE_CLIENT_ID に実際のClient IDを設定してください。</p>
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
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
            useOneTap
            shape="pill"
            text="continue_with"
            theme="filled_blue"
            width="280"
            locale="ja"
            context="signin"
            select_account
          />
        </div>
      </GoogleOAuthProvider>
      
      {(loginError || error) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
          <p className="font-bold">エラーが発生しました</p>
          <p className="text-sm">{loginError || error}</p>
        </div>
      )}
      
      {loading && (
        <div className="text-center mt-4">
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