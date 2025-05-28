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

import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const LoginButtonContent = () => {
  const { loginWithGoogle, loading, error, initiateDriveAuth } = useAuth();
  const { addNotification } = usePortfolioContext();
  const [loginError, setLoginError] = useState(null);
  
  const handleGoogleLogin = async (credentialResponse) => {
    console.log('Google Credential Response:', credentialResponse);
    console.log('Response keys:', Object.keys(credentialResponse));
    console.log('Has credential:', !!credentialResponse.credential);
    console.log('Has code:', !!credentialResponse.code);
    
    // 認証情報の確認
    if (!credentialResponse.credential && !credentialResponse.code) {
      console.error('認証情報がレスポンスに含まれていません', credentialResponse);
      setLoginError('認証情報が取得できませんでした');
      return;
    }
    
    try {
      console.log('loginWithGoogleを呼び出します...');
      const result = await loginWithGoogle(credentialResponse);
      console.log('loginWithGoogleの結果:', result);
      
      if (!result || !result.success) {
        console.error('バックエンドでの認証処理に失敗しました');
        setLoginError('ログイン処理に失敗しました');
      } else {
        console.log('ログイン成功');
        setLoginError(null);
        
        // hasDriveAccessフラグをチェック
        if (result.hasDriveAccess) {
          console.log('既にDriveアクセス権限を持っています');
          if (addNotification) {
            addNotification('ログインが完了しました。Google Driveも利用可能です。', 'success');
          }
        } else {
          console.log('Driveアクセス権限がありません。追加認証が必要です。');
          
          // Google One Tapの制限により、Drive連携は別途必要
          console.log('Google Drive連携を自動的に開始します...');
          
          // ユーザーに通知
          if (addNotification) {
            addNotification('Google Driveの連携を開始します...', 'info');
          }
          
          setTimeout(async () => {
            try {
              if (initiateDriveAuth) {
                console.log('Drive連携を開始します...');
                const driveSuccess = await initiateDriveAuth();
                if (driveSuccess) {
                  console.log('Drive連携処理が開始されました');
                  // Drive連携が成功した場合の通知は、リダイレクト先で行われるため不要
                } else {
                  console.warn('Drive連携の開始に失敗しました');
                  if (addNotification) {
                    addNotification('Google Drive連携に失敗しました。設定画面から再度お試しください。', 'warning');
                  }
                }
              } else {
                console.warn('Drive連携機能が利用できません');
              }
            } catch (driveError) {
              console.error('Drive連携の開始に失敗しました:', driveError);
              // Drive連携のエラーは通知のみで、ログイン自体は成功とする
              if (addNotification) {
                addNotification('Google Drive連携でエラーが発生しました。後で再度お試しください。', 'warning');
              }
            }
          }, 1500); // 1.5秒待ってからDrive連携を開始（ログイン処理の完了を確実にするため）
        }
      }
    } catch (err) {
      console.error('ログイン処理中にエラーが発生しました:', err);
      const message = err?.message || '不明なエラー';
      setLoginError(`ログインエラー: ${message}`);
    }
  };
  
  return (
    <div className="login-container">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium mb-2">ログインしてください</h3>
        <p className="text-sm text-gray-600 mb-4">
          Google認証でログインすると、Google Driveでのデータバックアップも自動的に有効になります
        </p>
      </div>
      
      <div className="flex justify-center mb-4">
        <GoogleLogin
          onSuccess={handleGoogleLogin}
          onError={() => {
            console.log('Google Login Failed');
            setLoginError('Googleログインに失敗しました');
          }}
          useOneTap
          theme="outline"
          size="large"
          text="signin_with"
          locale="ja"
        />
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
  
  // GoogleOAuthProviderにクライアントIDがない場合は読み込み中を表示
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
    <GoogleOAuthProvider clientId={googleClientId}>
      <LoginButtonContent />
    </GoogleOAuthProvider>
  );
};

export default LoginButton;