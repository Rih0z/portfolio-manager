/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/auth/LoginButton.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * - 2025-05-12 15:30:00 Koki Riho 認可コードフローに対応
 * 
 * 説明: 
 * Google OAuth認証を使用したログインボタンコンポーネント。
 * ユーザーのGoogle認証とドライブアクセス権限の取得を行う。
 */

import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';

const LoginButton = () => {
  const { handleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const onSuccess = async (response) => {
    try {
      setLoading(true);
      await handleLogin(response);
    } catch (error) {
      console.error('ログイン処理エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const onError = () => {
    console.error('ログインに失敗しました');
    setLoading(false);
  };

  return (
    <div>
      {loading ? (
        <div className="text-sm text-white">ログイン中...</div>
      ) : (
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          useOneTap
          flow="auth-code"  // 認可コードフローを使用
          theme="filled_blue"
          text="signin_with"
          shape="pill"
          locale="ja"
          // Google Drive APIへのアクセス権限を要求
          scope="email profile https://www.googleapis.com/auth/drive.file"
          // CORSエラー回避のためにredirect_uriは指定しない（サーバー側で処理）
        />
      )}
    </div>
  );
};

export default LoginButton;
