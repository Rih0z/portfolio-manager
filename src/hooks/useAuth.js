import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

/**
 * 認証コンテキストを使用するためのカスタムフック
 * @returns {Object} 認証関連の状態と関数
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;