/**
 * ポートフォリオアクション用カスタムフック — PortfolioStore セレクタ
 */
import { usePortfolioStore } from '../../stores/portfolioStore';

export const usePortfolioActions = () => {
  const store = usePortfolioStore();

  return {
    addTicker: store.addTicker,
    updateHolding: store.updateHoldings,
    removeAsset: store.removeTicker,
    updateTargetAllocation: store.updateTargetAllocation,
    setBaseCurrency: store.setBaseCurrency,
    setAdditionalBudget: store.setAdditionalBudget,
    setAiPromptTemplate: store.setAiPromptTemplate,
    refreshMarketData: store.refreshMarketPrices,
    updateExchangeRate: store.updateExchangeRate,
    importData: store.importData,
    exportData: store.exportData,
  };
};
