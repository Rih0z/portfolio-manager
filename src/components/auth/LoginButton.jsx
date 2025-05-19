/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/auth/LoginButton.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 更新日: 2025-05-19 12:45:00
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * - 2025-05-12 15:30:00 Koki Riho 認可コードフローに対応
 * - 2025-05-19 12:45:00 System Admin AWS環境対応に修正
 * 
 * 説明: 
 * Google OAuth認証を使用したログインボタンコンポーネント。
 * ユーザーのGoogle認証とドライブアクセス権限の取得を行う。
 */

import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';

const LoginButton = () => {
  const { loginWithGoogle, loading, error } = useAuth();
  const [loginError, setLoginError] = useState(null);
  
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    if (!credentialResponse.code) {
      setLoginError('認証コードが取得できませんでした');
      return;
    }
    
    const success = await loginWithGoogle(credentialResponse);
    if (!success) {
      setLoginError('ログインに失敗しました');
    }
  };
  
  const handleGoogleLoginError = () => {
    setLoginError('Google認証中にエラーが発生しました');
  };
  
  return (
    <div className="login-container">
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
        <GoogleLogin
          flow="auth-code"
          onSuccess={handleGoogleLoginSuccess}
          onError={handleGoogleLoginError}
          useOneTap
          shape="pill"
          text="continue_with"
          disabled={loading}
        />
      </GoogleOAuthProvider>
      
      {(loginError || error) && (
        <p className="error-message">{loginError || error}</p>
      )}
      
      {loading && <p className="loading-text">認証処理中...</p>}
    </div>
  );
};

export default LoginButton;
