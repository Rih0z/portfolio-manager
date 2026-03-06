/**
 * usePortfolioContext - ポートフォリオデータアクセスフック
 *
 * Zustand portfolioStore + uiStore のセレクタフック。
 * 旧 PortfolioContext (React Context API) は廃止済み。
 * 全コンポーネントはこのフック経由で portfolioStore / uiStore にアクセスする。
 */
import { usePortfolioStore, selectTotalAssets, selectAnnualFees, selectAnnualDividends } from '../stores/portfolioStore';
import { useUIStore } from '../stores/uiStore';

export const usePortfolioContext = (): any => {
  const portfolio = usePortfolioStore();
  const ui = useUIStore();

  const totalAssets = selectTotalAssets(portfolio);
  const annualFees = selectAnnualFees(portfolio);
  const annualDividends = selectAnnualDividends(portfolio);

  return {
    // State
    baseCurrency: portfolio.baseCurrency,
    exchangeRate: portfolio.exchangeRate,
    lastUpdated: portfolio.lastUpdated,
    isLoading: ui.isLoading,
    currentAssets: portfolio.currentAssets,
    targetPortfolio: portfolio.targetPortfolio,
    additionalBudget: portfolio.additionalBudget,
    totalAssets,
    annualFees,
    annualDividends,
    dataSource: portfolio.dataSource,
    lastSyncTime: portfolio.lastSyncTime,
    aiPromptTemplate: portfolio.aiPromptTemplate,
    initialized: portfolio.initialized,
    currentUser: portfolio.currentUser,
    notifications: ui.notifications,

    // Actions
    toggleCurrency: portfolio.toggleCurrency,
    refreshMarketPrices: portfolio.refreshMarketPrices,
    addTicker: portfolio.addTicker,
    updateTargetAllocation: portfolio.updateTargetAllocation,
    updateHoldings: portfolio.updateHoldings,
    updateAnnualFee: portfolio.updateAnnualFee,
    updateDividendInfo: portfolio.updateDividendInfo,
    removeTicker: portfolio.removeTicker,
    setAdditionalBudget: portfolio.setAdditionalBudget,
    calculateSimulation: portfolio.calculateSimulation,
    executePurchase: portfolio.executePurchase,
    executeBatchPurchase: portfolio.executeBatchPurchase,
    importData: portfolio.importData,
    exportData: portfolio.exportData,
    addNotification: ui.addNotification,
    removeNotification: ui.removeNotification,
    convertCurrency: portfolio.convertCurrency,
    calculatePurchaseShares: portfolio.calculatePurchaseShares,
    updateExchangeRate: portfolio.updateExchangeRate,
    resetExchangeRate: portfolio.resetExchangeRate,
    updateAiPromptTemplate: portfolio.updateAiPromptTemplate,
    setBaseCurrency: portfolio.setBaseCurrency,
    setAiPromptTemplate: portfolio.setAiPromptTemplate,

    // Cloud sync
    saveToLocalStorage: portfolio.saveToLocalStorage,
    loadFromLocalStorage: portfolio.loadFromLocalStorage,
    clearLocalStorage: portfolio.clearLocalStorage,
    saveToGoogleDrive: portfolio.saveToGoogleDrive,
    loadFromGoogleDrive: portfolio.loadFromGoogleDrive,
    handleAuthStateChange: portfolio.handleAuthStateChange,
    initializeData: portfolio.initializeData,
    validateAssetTypes: portfolio.validateAssetTypes,

    // Server sync
    serverVersion: portfolio.serverVersion,
    syncStatus: portfolio.syncStatus,
    lastServerSync: portfolio.lastServerSync,
    syncToServer: portfolio.syncToServer,
    syncFromServer: portfolio.syncFromServer,
    resolveConflict: portfolio.resolveConflict,

    // Aliases
    totalAnnualFees: annualFees,
    totalAnnualDividends: annualDividends,
    refreshMarketData: portfolio.refreshMarketPrices,
    updateHolding: portfolio.updateHoldings,
    removeAsset: portfolio.removeTicker,
    simulationResult: null,
    includeCurrentHoldings: true,
    setIncludeCurrentHoldings: () => {},
    runSimulation: portfolio.calculateSimulation,
  };
};

export default usePortfolioContext;
