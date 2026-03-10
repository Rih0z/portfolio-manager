/**
 * usePortfolioContext - ポートフォリオデータアクセスフック
 *
 * Zustand portfolioStore + uiStore のセレクタフック。
 * 旧 PortfolioContext (React Context API) は廃止済み。
 * 全コンポーネントはこのフック経由で portfolioStore / uiStore にアクセスする。
 */
import { usePortfolioStore, selectTotalAssets, selectAnnualFees, selectAnnualDividends } from '../stores/portfolioStore';
import { useUIStore } from '../stores/uiStore';
import type {
  CurrentAsset, TargetAllocation, UserData, ExchangeRate,
  OperationResult, PortfolioExport, SimulationItem, ValidateResult,
  SyncResult, Notification,
} from '../types/portfolio.types';

export interface PortfolioContextValue {
  // State
  baseCurrency: string;
  exchangeRate: ExchangeRate;
  lastUpdated: string | null;
  isLoading: boolean;
  currentAssets: CurrentAsset[];
  targetPortfolio: TargetAllocation[];
  additionalBudget: { amount: number; currency: string };
  totalAssets: number;
  annualFees: number;
  annualDividends: number;
  dataSource: string;
  lastSyncTime: string | null;
  aiPromptTemplate: string | null;
  initialized: boolean;
  currentUser: UserData | null;
  notifications: Notification[];
  serverVersion: number | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'conflict';
  lastServerSync: string | null;

  // Actions
  toggleCurrency: () => void;
  refreshMarketPrices: () => Promise<OperationResult>;
  addTicker: (ticker: string) => Promise<OperationResult>;
  updateTargetAllocation: (id: string, percentage: number | string) => void;
  updateHoldings: (id: string, holdings: number | string) => void;
  updatePurchasePrice: (id: string, price: number) => void;
  updateAnnualFee: (id: string, fee: number | string) => void;
  updateDividendInfo: (id: string, dividendYield: number | string, hasDividend?: boolean, frequency?: string) => void;
  removeTicker: (id: string) => void;
  setAdditionalBudget: (amount: number | string, currency?: string) => void;
  calculateSimulation: () => SimulationItem[];
  executePurchase: (tickerId: string, units: number | string) => void;
  executeBatchPurchase: (simulationResult: SimulationItem[]) => void;
  importData: (data: unknown) => OperationResult;
  exportData: () => PortfolioExport;
  addNotification: (message: string, type?: string) => string;
  removeNotification: (id: string) => void;
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string, exchangeRateObj?: ExchangeRate) => number;
  calculatePurchaseShares: (purchaseAmount: number, price: number) => number;
  updateExchangeRate: (forceUpdate?: boolean) => Promise<void>;
  resetExchangeRate: () => void;
  updateAiPromptTemplate: (template: string | null) => void;
  setBaseCurrency: (currency: string) => void;
  setAiPromptTemplate: (template: string | null) => void;

  // Cloud sync
  saveToLocalStorage: () => boolean;
  loadFromLocalStorage: () => PortfolioExport | null;
  clearLocalStorage: () => boolean;
  saveToGoogleDrive: (userData?: UserData) => Promise<SyncResult>;
  loadFromGoogleDrive: (userData?: UserData) => Promise<SyncResult>;
  handleAuthStateChange: (isAuthenticated: boolean, user: UserData | null) => void;
  initializeData: () => void;
  validateAssetTypes: (assets: CurrentAsset[]) => ValidateResult;
  syncToServer: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  resolveConflict: (strategy: 'server' | 'local') => Promise<void>;

  // Aliases
  totalAnnualFees: number;
  totalAnnualDividends: number;
  refreshMarketData: () => Promise<OperationResult>;
  updateHolding: (id: string, holdings: number | string) => void;
  removeAsset: (id: string) => void;
  simulationResult: null;
  includeCurrentHoldings: boolean;
  setIncludeCurrentHoldings: () => void;
  runSimulation: () => SimulationItem[];

  // Diagnostics
  debugLocalStorage: () => {
    hasData: boolean;
    canDecrypt: boolean;
    currentState: { initialized: boolean; baseCurrency: string; currentAssetsLength: number };
    error?: string;
  };
}

export const usePortfolioContext = (): PortfolioContextValue => {
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
    updatePurchasePrice: portfolio.updatePurchasePrice,
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

    // Diagnostics
    debugLocalStorage: () => {
      try {
        const rawData = localStorage.getItem('portfolioData');
        const hasData = rawData !== null;
        const loadedData = hasData ? portfolio.loadFromLocalStorage() : null;
        const canDecrypt = loadedData !== null;
        const state = usePortfolioStore.getState();
        return {
          hasData,
          canDecrypt,
          currentState: {
            initialized: state.initialized,
            baseCurrency: state.baseCurrency,
            currentAssetsLength: state.currentAssets.length,
          },
        };
      } catch (err: unknown) {
        return {
          hasData: false,
          canDecrypt: false,
          currentState: { initialized: false, baseCurrency: 'JPY', currentAssetsLength: 0 },
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
};

export default usePortfolioContext;
