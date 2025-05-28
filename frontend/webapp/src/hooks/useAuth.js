/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/hooks/useAuth.js
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-15 13:45:22 
 * 更新日: 2025-05-19 13:00:00
 * 
 * 更新履歴: 
 * - 2025-03-15 13:45:22 Koki Riho 初回作成
 * - 2025-05-12 15:30:00 Koki Riho バックエンド連携型認証に対応
 * - 2025-05-19 13:00:00 System Admin AWS環境対応に修正
 * 
 * 説明: 
 * AuthContextから認証状態と認証関連機能を取得するためのカスタムフック。
 * このフックを使用することで、コンポーネントは認証情報にアクセスできる。
 */
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// AuthContextから値を取得するカスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// デフォルトエクスポートも提供
export default useAuth;
