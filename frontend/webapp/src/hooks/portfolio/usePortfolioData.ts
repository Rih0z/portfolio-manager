/**
 * ポートフォリオデータ用カスタムフック
 *
 * Interface Segregation Principle: 必要なデータのみを公開
 */

import { useContext } from 'react';
import { PortfolioContext } from '../../context/PortfolioContext';
import type { Asset, TargetAllocation, ExchangeRate, AdditionalBudget } from '../../types/portfolio.types';

interface PortfolioDataReturn {
  // 基本データ
  currentAssets: Asset[];
  targetPortfolio: TargetAllocation[];
  baseCurrency: string;
  exchangeRate: ExchangeRate;

  // 計算値
  totalAssets: number;
  totalAnnualFees: number;
  totalAnnualDividends: number;

  // 追加投資
  additionalBudget: AdditionalBudget;

  // AIプロンプト
  aiPromptTemplate: any;

  // ステータス
  isLoading: boolean;
  lastUpdated: string | null;
  initialized: boolean;
}

/**
 * ポートフォリオの基本データにアクセスするフック
 * @returns ポートフォリオデータ
 */
export const usePortfolioData = (): PortfolioDataReturn => {
  const context = useContext(PortfolioContext);

  if (!context) {
    throw new Error('usePortfolioData must be used within a PortfolioProvider');
  }

  // 必要なデータのみを公開
  return {
    // 基本データ
    currentAssets: context.currentAssets,
    targetPortfolio: context.targetPortfolio,
    baseCurrency: context.baseCurrency,
    exchangeRate: context.exchangeRate,

    // 計算値
    totalAssets: context.totalAssets,
    totalAnnualFees: context.totalAnnualFees,
    totalAnnualDividends: context.totalAnnualDividends,

    // 追加投資
    additionalBudget: context.additionalBudget,

    // AIプロンプト
    aiPromptTemplate: context.aiPromptTemplate,

    // ステータス
    isLoading: context.isLoading,
    lastUpdated: context.lastUpdated,
    initialized: context.initialized
  };
};
