/**
 * ポートフォリオアクション用カスタムフック
 * 
 * Interface Segregation Principle: CRUD操作のみを公開
 */

import { useContext } from 'react';
import { PortfolioContext } from '../../context/PortfolioContext';

/**
 * ポートフォリオのCRUD操作にアクセスするフック
 * @returns {Object} ポートフォリオアクション
 */
export const usePortfolioActions = () => {
  const context = useContext(PortfolioContext);
  
  if (!context) {
    throw new Error('usePortfolioActions must be used within a PortfolioProvider');
  }
  
  return {
    // 資産の操作
    addTicker: context.addTicker,
    updateHolding: context.updateHolding,
    removeAsset: context.removeAsset,
    
    // 目標配分の操作
    updateTargetAllocation: context.updateTargetAllocation,
    
    // 基本設定
    setBaseCurrency: context.setBaseCurrency,
    setAdditionalBudget: context.setAdditionalBudget,
    setAiPromptTemplate: context.setAiPromptTemplate,
    
    // データの更新
    refreshMarketData: context.refreshMarketData,
    updateExchangeRate: context.updateExchangeRate,
    
    // インポート/エクスポート
    importData: context.importData,
    exportData: context.exportData
  };
};