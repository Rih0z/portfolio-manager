/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/common/ContextConnector.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * - 2025-05-08 16:45:00 修正者名 インポートパスを修正
 * 
 * 説明: 
 * AuthContextとPortfolioContextを連携させるコネクタコンポーネント。
 * 循環参照を防ぐためにuseRefを使用して一方向参照を実装する。
 */

import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const ContextConnector = () => {
  const auth = useAuth();
  const portfolio = usePortfolioContext();
  
  // AuthContextにPortfolioContextへの参照を設定
  useEffect(() => {
    if (auth.setPortfolioContextRef && portfolio) {
      auth.setPortfolioContextRef(portfolio);
    }
  }, [auth, portfolio]);
  
  return null; // このコンポーネントはUIをレンダリングしない
};

export default ContextConnector;
