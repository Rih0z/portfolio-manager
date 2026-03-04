/**
 * ポートフォリオアクション用カスタムフック
 *
 * Interface Segregation Principle: CRUD操作のみを公開
 */

import { useContext } from 'react';
import { PortfolioContext } from '../../context/PortfolioContext';
import type { ImportResult } from '../../types/portfolio.types';

interface PortfolioActionsReturn {
  // 資産の操作
  addTicker: (ticker: string, holdings?: number) => Promise<any>;
  updateHolding: (ticker: string, newHoldings: number) => void;
  removeAsset: (ticker: string) => void;

  // 目標配分の操作
  updateTargetAllocation: (ticker: string, percentage: number) => void;

  // 基本設定
  setBaseCurrency: (currency: string) => void;
  setAdditionalBudget: (amount: number, currency?: string) => void;
  setAiPromptTemplate: (template: any) => void;

  // データの更新
  refreshMarketData: () => Promise<any>;
  updateExchangeRate: (forceUpdate?: boolean) => Promise<void>;

  // インポート/エクスポート
  importData: (data: any) => ImportResult;
  exportData: () => any;
}

/**
 * ポートフォリオのCRUD操作にアクセスするフック
 * @returns ポートフォリオアクション
 */
export const usePortfolioActions = (): PortfolioActionsReturn => {
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
