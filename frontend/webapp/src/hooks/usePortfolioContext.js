/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/hooks/usePortfolioContext.js
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-15 14:30:22 
 * 
 * 更新履歴: 
 * - 2025-03-15 14:30:22 Koki Riho 初回作成
 * 
 * 説明: 
 * PortfolioContextからポートフォリオデータと関連機能を取得するためのカスタムフック。
 * このフックを使用することで、コンポーネントはポートフォリオ情報とその操作メソッドにアクセスできる。
 */

import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';

export const usePortfolioContext = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within a PortfolioProvider');
  }
  return context;
};

export default usePortfolioContext;
