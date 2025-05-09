/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/auth/UserProfile.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * ログインユーザーのプロフィール表示コンポーネント。
 * ユーザーの画像、名前およびログアウトボタンを表示する。
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const UserProfile = () => {
  const { user, handleLogout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center space-x-2">
      {user.picture && (
        <img 
          src={user.picture} 
          alt={user.name} 
          className="w-8 h-8 rounded-full" 
        />
      )}
      <div className="text-sm">
        <p className="font-medium">{user.name}</p>
        <button 
          onClick={handleLogout}
          className="text-xs text-blue-200 hover:text-white"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
