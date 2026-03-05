/**
 * usePortfolioContext フックのテスト
 *
 * Zustand移行後: PortfolioProvider不要。フックは直接Zustand storeから読み取る。
 */
import { renderHook, act } from '@testing-library/react';
import usePortfolioContext from '@/hooks/usePortfolioContext';

// Zustand storesをモック
vi.mock('@/stores/portfolioStore', () => ({
  usePortfolioStore: vi.fn(() => ({
    baseCurrency: 'JPY',
    exchangeRate: { rate: 150, source: 'Test' },
    lastUpdated: null,
    currentAssets: [],
    targetPortfolio: [],
    additionalBudget: { amount: 300000, currency: 'JPY' },
    dataSource: null,
    lastSyncTime: null,
    aiPromptTemplate: null,
    initialized: false,
    currentUser: null,
    toggleCurrency: vi.fn(),
    refreshMarketPrices: vi.fn(),
    addTicker: vi.fn(),
    updateTargetAllocation: vi.fn(),
    updateHoldings: vi.fn(),
    updateAnnualFee: vi.fn(),
    updateDividendInfo: vi.fn(),
    removeTicker: vi.fn(),
    setAdditionalBudget: vi.fn(),
    calculateSimulation: vi.fn(),
    executePurchase: vi.fn(),
    executeBatchPurchase: vi.fn(),
    importData: vi.fn(),
    exportData: vi.fn(),
    convertCurrency: vi.fn(),
    calculatePurchaseShares: vi.fn(),
    updateExchangeRate: vi.fn(),
    resetExchangeRate: vi.fn(),
    updateAiPromptTemplate: vi.fn(),
    setBaseCurrency: vi.fn(),
    setAiPromptTemplate: vi.fn(),
    saveToLocalStorage: vi.fn(),
    loadFromLocalStorage: vi.fn(),
    clearLocalStorage: vi.fn(),
    saveToGoogleDrive: vi.fn(),
    loadFromGoogleDrive: vi.fn(),
    handleAuthStateChange: vi.fn(),
    initializeData: vi.fn(),
    validateAssetTypes: vi.fn(),
  })),
  selectTotalAssets: vi.fn(() => 0),
  selectAnnualFees: vi.fn(() => 0),
  selectAnnualDividends: vi.fn(() => 0),
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(() => ({
    isLoading: false,
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
  })),
}));

// Providerなしでも動作する（Zustandはグローバルストア）
it('provides context values without any Provider wrapper', () => {
  const { result } = renderHook(() => usePortfolioContext());

  expect(result.current.baseCurrency).toBe('JPY');
  expect(typeof result.current.toggleCurrency).toBe('function');
  expect(typeof result.current.updateHoldings).toBe('function');
  expect(typeof result.current.updateTargetAllocation).toBe('function');
  expect(typeof result.current.setAdditionalBudget).toBe('function');
  expect(typeof result.current.refreshMarketPrices).toBe('function');
  expect(typeof result.current.totalAssets).toBe('number');
  expect(typeof result.current.annualFees).toBe('number');
});
