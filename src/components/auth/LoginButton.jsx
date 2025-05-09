/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/auth/LoginButton.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * Google OAuth認証を使用したログインボタンコンポーネント。
 * ユーザーのGoogle認証とドライブアクセス権限の取得を行う。
 */

import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';

const LoginButton = () => {
  const { handleLogin } = useAuth();

  return (
    <div>
      <GoogleLogin
        onSuccess={handleLogin}
        onError={() => console.error('ログインに失敗しました')}
        useOneTap
        theme="filled_blue"
        text="signin_with"
        shape="pill"
        locale="ja"
        // 以下のスコープ設定を追加
        scope="email profile https://www.googleapis.com/auth/drive.file"
      />
    </div>
  );
};

export default LoginButton;
