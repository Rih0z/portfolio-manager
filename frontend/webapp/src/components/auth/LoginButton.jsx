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

import React from 'react';
import OAuthLoginButton from './OAuthLoginButton';

const LoginButtonContent = () => {
  return <OAuthLoginButton />;
};

const LoginButton = () => {
  return <LoginButtonContent />;
};

export default LoginButton;