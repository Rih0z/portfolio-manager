/**
 * ポートフォリオデータ用カスタムフック — PortfolioStore セレクタ
 */
import { usePortfolioStore, selectTotalAssets, selectAnnualFees, selectAnnualDividends } from '../../stores/portfolioStore';
import { useUIStore } from '../../stores/uiStore';

export const usePortfolioData = () => {
  const store = usePortfolioStore();
  const isLoading = useUIStore(s => s.isLoading);

  return {
    currentAssets: store.currentAssets,
    targetPortfolio: store.targetPortfolio,
    baseCurrency: store.baseCurrency,
    exchangeRate: store.exchangeRate,
    totalAssets: selectTotalAssets(store),
    totalAnnualFees: selectAnnualFees(store),
    totalAnnualDividends: selectAnnualDividends(store),
    additionalBudget: store.additionalBudget,
    aiPromptTemplate: store.aiPromptTemplate,
    isLoading,
    lastUpdated: store.lastUpdated,
    initialized: store.initialized,
  };
};
