/**
 * 投資シミュレーション用カスタムフック
 * 
 * Interface Segregation Principle: シミュレーション機能のみを公開
 */

import { useContext } from 'react';
import { PortfolioContext } from '../../context/PortfolioContext';

/**
 * 投資シミュレーション機能にアクセスするフック
 * @returns {Object} シミュレーション機能
 */
export const useSimulation = () => {
  const context = useContext(PortfolioContext);
  
  if (!context) {
    throw new Error('useSimulation must be used within a PortfolioProvider');
  }
  
  return {
    // シミュレーション実行
    runSimulation: context.runSimulation,
    
    // 購入実行
    executePurchase: context.executePurchase,
    
    // シミュレーション結果
    simulationResult: context.simulationResult,
    
    // シミュレーション設定
    includeCurrentHoldings: context.includeCurrentHoldings,
    setIncludeCurrentHoldings: context.setIncludeCurrentHoldings
  };
};