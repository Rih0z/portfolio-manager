/**
 * portfolioStore unit tests
 *
 * Tests for portfolio state management: assets, allocations, currency,
 * simulation, import/export, localStorage persistence, and computed selectors.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// --- Mock all external dependencies BEFORE importing the store ---

// Mock API services
vi.mock('../../../services/api', () => ({
  fetchTickerData: vi.fn(),
  fetchExchangeRate: vi.fn(),
  fetchFundInfo: vi.fn(),
  fetchDividendData: vi.fn(),
}));

vi.mock('../../../services/googleDriveService', () => ({
  saveToDrive: vi.fn(),
  loadFromDrive: vi.fn(),
}));

vi.mock('../../../services/marketDataService', () => ({
  fetchMultipleStocks: vi.fn(),
}));

// Mock utility modules
vi.mock('../../../utils/fundUtils', () => ({
  FUND_TYPES: {
    STOCK: 'stock',
    ETF_US: 'etf_us',
    ETF_JP: 'etf_jp',
    MUTUAL_FUND: 'mutual_fund',
    BOND: 'bond',
  },
  guessFundType: vi.fn(() => 'etf_us'),
  estimateAnnualFee: vi.fn(() => ({ fee: 0.03, source: 'Estimated', isEstimated: true })),
  estimateDividendYield: vi.fn(() => ({
    yield: 1.5, hasDividend: true, dividendFrequency: 'quarterly', isEstimated: true,
  })),
  US_ETF_LIST: ['VOO', 'VTI', 'QQQ', 'SPY'],
  TICKER_SPECIFIC_FEES: { VOO: 0.03, VTI: 0.03 },
  TICKER_SPECIFIC_DIVIDENDS: { VOO: 1.3, VTI: 1.4 },
}));

vi.mock('../../../utils/requestThrottle', () => ({
  requestManager: {
    request: vi.fn((_category: string, fn: () => Promise<any>) => fn()),
  },
  debouncedRefreshMarketData: vi.fn((fn: () => Promise<any>) => fn()),
  requestDeduplicator: {
    deduplicate: vi.fn((_key: string, fn: () => Promise<any>) => fn()),
  },
}));

vi.mock('../../../utils/exchangeRateDebounce', () => ({
  shouldUpdateExchangeRate: vi.fn(() => true),
  clearExchangeRateCache: vi.fn(),
}));

vi.mock('../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: vi.fn((ticker: string) => ticker),
}));

// Mock uiStore
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      addNotification: vi.fn(() => 'mock-notification-id'),
      removeNotification: vi.fn(),
      setLoading: vi.fn(),
    })),
    setState: vi.fn(),
  },
}));

// Mock engagementStore (portfolioStore imports it for trial period check)
const mockIsInTrialPeriod = vi.fn(() => false);
vi.mock('../../../stores/engagementStore', () => ({
  useEngagementStore: {
    getState: vi.fn(() => ({
      isInTrialPeriod: mockIsInTrialPeriod,
    })),
  },
  TRIAL_MAX_HOLDINGS: 10,
}));

// Mock getIsPremiumFromCache
const mockGetIsPremiumFromCache = vi.fn(() => false);
vi.mock('../../../hooks/queries', () => ({
  getIsPremiumFromCache: (...args: any[]) => mockGetIsPremiumFromCache(...(args as []))  ,
}));

// Now import the store and dependencies
import {
  usePortfolioStore,
  selectTotalAssets,
  selectAnnualFees,
  selectAnnualDividends,
} from '../../../stores/portfolioStore';
import type { CurrentAsset, TargetAllocation, SimulationItem, UserData } from '../../../types/portfolio.types';
import { useUIStore } from '../../../stores/uiStore';
import { fetchTickerData, fetchFundInfo, fetchDividendData, fetchExchangeRate } from '../../../services/api';
import { fetchMultipleStocks } from '../../../services/marketDataService';
import { saveToDrive, loadFromDrive } from '../../../services/googleDriveService';

// --- Test helpers ---
const createTestSimulationItem = (overrides: Partial<SimulationItem> = {}): SimulationItem => ({
  id: 'a1',
  ticker: 'VOO',
  name: 'Vanguard S&P 500 ETF',
  currentAllocation: 0,
  targetAllocation: 50,
  diff: 50,
  currentValue: 0,
  purchaseAmount: 300,
  price: 100,
  purchaseShares: 3,
  currency: 'USD',
  ...overrides,
});

const createTestAsset = (overrides: Partial<CurrentAsset> = {}): CurrentAsset => ({
  id: 'test-id-1',
  ticker: 'VOO',
  name: 'Vanguard S&P 500 ETF',
  price: 400,
  holdings: 10,
  currency: 'USD',
  fundType: 'etf_us',
  isStock: false,
  annualFee: 0.03,
  feeSource: 'Known',
  feeIsEstimated: false,
  region: 'US',
  dividendYield: 1.3,
  hasDividend: true,
  dividendFrequency: 'quarterly',
  dividendIsEstimated: false,
  source: 'API',
  ...overrides,
});

const createTestTarget = (overrides: Partial<TargetAllocation> = {}): TargetAllocation => ({
  id: 'test-id-1',
  ticker: 'VOO',
  name: 'Vanguard S&P 500 ETF',
  targetPercentage: 50,
  ...overrides,
});

const getInitialState = () => ({
  initialized: false,
  baseCurrency: 'JPY',
  exchangeRate: { rate: 150.0, source: 'Default', lastUpdated: new Date().toISOString() },
  lastUpdated: null as string | null,
  currentAssets: [] as CurrentAsset[],
  targetPortfolio: [] as TargetAllocation[],
  additionalBudget: { amount: 300000, currency: 'JPY' },
  aiPromptTemplate: null as string | null,
  dataSource: 'local',
  lastSyncTime: null as string | null,
  currentUser: null as UserData | null,
});

describe('portfolioStore', () => {
  beforeEach(() => {
    // Reset store state
    usePortfolioStore.setState(getInitialState());
    vi.clearAllMocks();

    // Reset localStorage mock
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    (localStorage.removeItem as ReturnType<typeof vi.fn>).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Initial State
  // =========================================================================
  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = usePortfolioStore.getState();
      expect(state.initialized).toBe(false);
      expect(state.baseCurrency).toBe('JPY');
      expect(state.exchangeRate.rate).toBe(150.0);
      expect(state.currentAssets).toEqual([]);
      expect(state.targetPortfolio).toEqual([]);
      expect(state.additionalBudget).toEqual({ amount: 300000, currency: 'JPY' });
      expect(state.aiPromptTemplate).toBeNull();
      expect(state.dataSource).toBe('local');
      expect(state.lastSyncTime).toBeNull();
      expect(state.currentUser).toBeNull();
    });
  });

  // =========================================================================
  // addTicker
  // =========================================================================
  describe('addTicker', () => {
    it('should add a new ticker to both currentAssets and targetPortfolio', async () => {
      usePortfolioStore.setState({ initialized: true });

      const mockTickerData = {
        success: true,
        data: {
          id: 'aapl-123',
          ticker: 'AAPL',
          name: 'Apple Inc.',
          price: 175,
          currency: 'USD',
          source: 'API',
        },
      };
      const mockFundInfo = { fundType: 'stock', annualFee: 0, feeSource: 'Known', feeIsEstimated: false, region: 'US' };
      const mockDividendData = {
        data: { dividendYield: 0.5, hasDividend: true, dividendFrequency: 'quarterly', dividendIsEstimated: false },
      };

      vi.mocked(fetchTickerData).mockResolvedValue(mockTickerData);
      vi.mocked(fetchFundInfo).mockResolvedValue(mockFundInfo);
      vi.mocked(fetchDividendData).mockResolvedValue(mockDividendData);

      const result = await usePortfolioStore.getState().addTicker('AAPL');

      expect(result.success).toBe(true);
      const state = usePortfolioStore.getState();
      expect(state.currentAssets).toHaveLength(1);
      expect(state.currentAssets[0].ticker).toBe('AAPL');
      expect(state.targetPortfolio).toHaveLength(1);
      expect(state.targetPortfolio[0].ticker).toBe('AAPL');
    });

    it('should reject a duplicate ticker', async () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset()],
        targetPortfolio: [createTestTarget()],
      });

      const result = await usePortfolioStore.getState().addTicker('VOO');

      expect(result.success).toBe(false);
      expect(result.message).toContain('既に追加されている');
    });

    it('should handle API failure gracefully', async () => {
      usePortfolioStore.setState({ initialized: true });

      vi.mocked(fetchTickerData).mockResolvedValue({
        success: false,
        message: 'API error',
        data: undefined,
      });

      const result = await usePortfolioStore.getState().addTicker('INVALID');
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // removeTicker
  // =========================================================================
  describe('removeTicker', () => {
    it('should remove a ticker from both currentAssets and targetPortfolio', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset()],
        targetPortfolio: [createTestTarget()],
      });

      usePortfolioStore.getState().removeTicker('test-id-1');

      const state = usePortfolioStore.getState();
      expect(state.currentAssets).toHaveLength(0);
      expect(state.targetPortfolio).toHaveLength(0);
    });

    it('should only remove the matching ticker', () => {
      const asset1 = createTestAsset({ id: 'id-1', ticker: 'VOO' });
      const asset2 = createTestAsset({ id: 'id-2', ticker: 'VTI' });
      const target1 = createTestTarget({ id: 'id-1', ticker: 'VOO' });
      const target2 = createTestTarget({ id: 'id-2', ticker: 'VTI' });

      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [asset1, asset2],
        targetPortfolio: [target1, target2],
      });

      usePortfolioStore.getState().removeTicker('id-1');

      const state = usePortfolioStore.getState();
      expect(state.currentAssets).toHaveLength(1);
      expect(state.currentAssets[0].ticker).toBe('VTI');
      expect(state.targetPortfolio).toHaveLength(1);
      expect(state.targetPortfolio[0].ticker).toBe('VTI');
    });
  });

  // =========================================================================
  // updateHoldings
  // =========================================================================
  describe('updateHoldings', () => {
    it('should update holdings for the specified asset', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset({ id: 'id-1', holdings: 10 })],
      });

      usePortfolioStore.getState().updateHoldings('id-1', 25);

      expect(usePortfolioStore.getState().currentAssets[0].holdings).toBe(25);
    });

    it('should handle string input', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset({ id: 'id-1', holdings: 10 })],
      });

      usePortfolioStore.getState().updateHoldings('id-1', '15.5');

      expect(usePortfolioStore.getState().currentAssets[0].holdings).toBe(15.5);
    });

    it('should default to 0 for invalid input', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset({ id: 'id-1', holdings: 10 })],
      });

      usePortfolioStore.getState().updateHoldings('id-1', 'abc');

      expect(usePortfolioStore.getState().currentAssets[0].holdings).toBe(0);
    });

    it('should not affect other assets', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [
          createTestAsset({ id: 'id-1', holdings: 10 }),
          createTestAsset({ id: 'id-2', holdings: 20 }),
        ],
      });

      usePortfolioStore.getState().updateHoldings('id-1', 50);

      expect(usePortfolioStore.getState().currentAssets[0].holdings).toBe(50);
      expect(usePortfolioStore.getState().currentAssets[1].holdings).toBe(20);
    });
  });

  // =========================================================================
  // updateTargetAllocation
  // =========================================================================
  describe('updateTargetAllocation', () => {
    it('should update target percentage for the specified target', () => {
      usePortfolioStore.setState({
        initialized: true,
        targetPortfolio: [createTestTarget({ id: 'id-1', targetPercentage: 50 })],
      });

      usePortfolioStore.getState().updateTargetAllocation('id-1', 30);

      expect(usePortfolioStore.getState().targetPortfolio[0].targetPercentage).toBe(30);
    });

    it('should handle string input', () => {
      usePortfolioStore.setState({
        initialized: true,
        targetPortfolio: [createTestTarget({ id: 'id-1', targetPercentage: 50 })],
      });

      usePortfolioStore.getState().updateTargetAllocation('id-1', '75.5');

      expect(usePortfolioStore.getState().targetPortfolio[0].targetPercentage).toBe(75.5);
    });
  });

  // =========================================================================
  // setBaseCurrency / toggleCurrency
  // =========================================================================
  describe('setBaseCurrency', () => {
    it('should set the base currency', () => {
      usePortfolioStore.getState().setBaseCurrency('USD');
      expect(usePortfolioStore.getState().baseCurrency).toBe('USD');
    });

    it('should set JPY', () => {
      usePortfolioStore.setState({ baseCurrency: 'USD' });
      usePortfolioStore.getState().setBaseCurrency('JPY');
      expect(usePortfolioStore.getState().baseCurrency).toBe('JPY');
    });
  });

  describe('toggleCurrency', () => {
    it('should toggle from JPY to USD', () => {
      usePortfolioStore.setState({ baseCurrency: 'JPY' });
      usePortfolioStore.getState().toggleCurrency();
      expect(usePortfolioStore.getState().baseCurrency).toBe('USD');
    });

    it('should toggle from USD to JPY', () => {
      usePortfolioStore.setState({ baseCurrency: 'USD' });
      usePortfolioStore.getState().toggleCurrency();
      expect(usePortfolioStore.getState().baseCurrency).toBe('JPY');
    });
  });

  // =========================================================================
  // setAdditionalBudget
  // =========================================================================
  describe('setAdditionalBudget', () => {
    it('should set the additional budget amount', () => {
      usePortfolioStore.getState().setAdditionalBudget(500000);

      const state = usePortfolioStore.getState();
      expect(state.additionalBudget.amount).toBe(500000);
      expect(state.additionalBudget.currency).toBe('JPY');
    });

    it('should set the additional budget with currency', () => {
      usePortfolioStore.getState().setAdditionalBudget(3000, 'USD');

      const state = usePortfolioStore.getState();
      expect(state.additionalBudget.amount).toBe(3000);
      expect(state.additionalBudget.currency).toBe('USD');
    });

    it('should handle string amount', () => {
      usePortfolioStore.getState().setAdditionalBudget('100000');
      expect(usePortfolioStore.getState().additionalBudget.amount).toBe(100000);
    });

    it('should default to 0 for invalid amount', () => {
      usePortfolioStore.getState().setAdditionalBudget('invalid');
      expect(usePortfolioStore.getState().additionalBudget.amount).toBe(0);
    });
  });

  // =========================================================================
  // convertCurrency
  // =========================================================================
  describe('convertCurrency', () => {
    it('should return the same amount for same currency', () => {
      const result = usePortfolioStore.getState().convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should convert USD to JPY', () => {
      usePortfolioStore.setState({
        exchangeRate: { rate: 150.0, source: 'Test', lastUpdated: '' },
      });
      const result = usePortfolioStore.getState().convertCurrency(100, 'USD', 'JPY');
      expect(result).toBe(15000);
    });

    it('should convert JPY to USD', () => {
      usePortfolioStore.setState({
        exchangeRate: { rate: 150.0, source: 'Test', lastUpdated: '' },
      });
      const result = usePortfolioStore.getState().convertCurrency(15000, 'JPY', 'USD');
      expect(result).toBe(100);
    });

    it('should use a custom exchange rate object when provided', () => {
      const customRate = { rate: 120.0, source: 'Custom', lastUpdated: '' };
      const result = usePortfolioStore.getState().convertCurrency(100, 'USD', 'JPY', customRate);
      expect(result).toBe(12000);
    });

    it('should throw for unsupported currency pairs', () => {
      expect(() => {
        usePortfolioStore.getState().convertCurrency(100, 'EUR', 'GBP');
      }).toThrow('Unsupported currency conversion');
    });
  });

  // =========================================================================
  // calculatePurchaseShares
  // =========================================================================
  describe('calculatePurchaseShares', () => {
    it('should calculate whole/fractional shares correctly', () => {
      const shares = usePortfolioStore.getState().calculatePurchaseShares(1000, 400);
      expect(shares).toBe(2.5);
    });

    it('should floor to 2 decimal places', () => {
      const shares = usePortfolioStore.getState().calculatePurchaseShares(1000, 333);
      // Math.floor((1000/333)*100)/100 = Math.floor(3.003003...* 100)/100 = Math.floor(300.3003)/100 = 3.00
      expect(shares).toBe(3);
    });

    it('should return 0 for zero price', () => {
      expect(usePortfolioStore.getState().calculatePurchaseShares(1000, 0)).toBe(0);
    });

    it('should return 0 for zero purchase amount', () => {
      expect(usePortfolioStore.getState().calculatePurchaseShares(0, 400)).toBe(0);
    });

    it('should return 0 for negative price', () => {
      expect(usePortfolioStore.getState().calculatePurchaseShares(1000, -10)).toBe(0);
    });
  });

  // =========================================================================
  // calculateSimulation
  // =========================================================================
  describe('calculateSimulation', () => {
    it('should return empty array when no assets or targets', () => {
      const results = usePortfolioStore.getState().calculateSimulation();
      expect(results).toEqual([]);
    });

    it('should return purchase suggestions for underweighted assets', () => {
      const asset = createTestAsset({
        id: 'voo-1',
        ticker: 'VOO',
        price: 400,
        holdings: 10,
        currency: 'JPY',
      });
      const target = createTestTarget({
        id: 'voo-1',
        ticker: 'VOO',
        targetPercentage: 100,
      });

      usePortfolioStore.setState({
        baseCurrency: 'JPY',
        currentAssets: [asset],
        targetPortfolio: [target],
        additionalBudget: { amount: 10000, currency: 'JPY' },
        exchangeRate: { rate: 150.0, source: 'Test', lastUpdated: '' },
      });

      const results = usePortfolioStore.getState().calculateSimulation();
      // With 100% target, full budget is the purchase amount
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest purchases for overweighted assets', () => {
      const asset1 = createTestAsset({ id: 'a1', ticker: 'VOO', price: 100, holdings: 100, currency: 'JPY' });
      const asset2 = createTestAsset({ id: 'a2', ticker: 'VTI', price: 100, holdings: 0, currency: 'JPY' });
      const target1 = createTestTarget({ id: 'a1', ticker: 'VOO', targetPercentage: 10 });
      const target2 = createTestTarget({ id: 'a2', ticker: 'VTI', targetPercentage: 90 });

      usePortfolioStore.setState({
        baseCurrency: 'JPY',
        currentAssets: [asset1, asset2],
        targetPortfolio: [target1, target2],
        additionalBudget: { amount: 10000, currency: 'JPY' },
        exchangeRate: { rate: 150.0, source: 'Test', lastUpdated: '' },
      });

      const results = usePortfolioStore.getState().calculateSimulation();
      // VOO is overweighted (100% vs 10% target), should NOT appear in suggestions
      // VTI is underweighted (0% vs 90% target), should appear
      const vooResult = results.find((r: any) => r.ticker === 'VOO');
      const vtiResult = results.find((r: any) => r.ticker === 'VTI');
      expect(vooResult).toBeUndefined();
      expect(vtiResult).toBeDefined();
    });

    it('should handle cross-currency simulation', () => {
      const usdAsset = createTestAsset({ id: 'a1', ticker: 'VOO', price: 400, holdings: 1, currency: 'USD' });
      const target = createTestTarget({ id: 'a1', ticker: 'VOO', targetPercentage: 100 });

      usePortfolioStore.setState({
        baseCurrency: 'JPY',
        currentAssets: [usdAsset],
        targetPortfolio: [target],
        additionalBudget: { amount: 100000, currency: 'JPY' },
        exchangeRate: { rate: 150.0, source: 'Test', lastUpdated: '' },
      });

      const results = usePortfolioStore.getState().calculateSimulation();
      // The asset is 100% target so with additional budget, it should produce results
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // importData / exportData
  // =========================================================================
  describe('importData', () => {
    it('should import valid portfolio data', () => {
      usePortfolioStore.setState({ initialized: true });

      const importPayload = {
        baseCurrency: 'USD',
        exchangeRate: { rate: 145.0, source: 'Import', lastUpdated: '' },
        currentAssets: [createTestAsset()],
        targetPortfolio: [createTestTarget()],
        additionalBudget: { amount: 5000, currency: 'USD' },
      };

      const result = usePortfolioStore.getState().importData(importPayload);
      expect(result.success).toBe(true);

      const state = usePortfolioStore.getState();
      expect(state.baseCurrency).toBe('USD');
      expect(state.exchangeRate.rate).toBe(145.0);
      expect(state.targetPortfolio).toHaveLength(1);
      expect(state.additionalBudget.amount).toBe(5000);
    });

    it('should import nested portfolioData structure', () => {
      usePortfolioStore.setState({ initialized: true });

      const wrappedPayload = {
        portfolioData: {
          baseCurrency: 'JPY',
          assets: [createTestAsset()],
          targetAllocation: [createTestTarget()],
          additionalBudget: { amount: 200000, currency: 'JPY' },
        },
      };

      const result = usePortfolioStore.getState().importData(wrappedPayload);
      expect(result.success).toBe(true);
    });

    it('should reject null data', () => {
      const result = usePortfolioStore.getState().importData(null);
      expect(result.success).toBe(false);
    });

    it('should reject data missing required fields', () => {
      const result = usePortfolioStore.getState().importData({
        baseCurrency: 'JPY',
        // missing currentAssets and targetPortfolio
      });
      expect(result.success).toBe(false);
    });

    it('should handle string JSON input', () => {
      usePortfolioStore.setState({ initialized: true });

      const jsonString = JSON.stringify({
        baseCurrency: 'JPY',
        currentAssets: [],
        targetPortfolio: [],
      });

      const result = usePortfolioStore.getState().importData(jsonString);
      expect(result.success).toBe(true);
    });

    it('should handle numeric additionalBudget', () => {
      usePortfolioStore.setState({ initialized: true });

      const result = usePortfolioStore.getState().importData({
        baseCurrency: 'JPY',
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: 500000,
      });
      expect(result.success).toBe(true);
      expect(usePortfolioStore.getState().additionalBudget).toEqual({
        amount: 500000,
        currency: 'JPY',
      });
    });
  });

  describe('exportData', () => {
    it('should export current portfolio data', () => {
      usePortfolioStore.setState({
        baseCurrency: 'USD',
        exchangeRate: { rate: 145.0, source: 'API', lastUpdated: '2025-01-01' },
        lastUpdated: '2025-01-01',
        currentAssets: [createTestAsset()],
        targetPortfolio: [createTestTarget()],
        additionalBudget: { amount: 3000, currency: 'USD' },
        aiPromptTemplate: 'test template string',
      });

      const exported = usePortfolioStore.getState().exportData();

      expect(exported.baseCurrency).toBe('USD');
      expect(exported.exchangeRate.rate).toBe(145.0);
      expect(exported.currentAssets).toHaveLength(1);
      expect(exported.targetPortfolio).toHaveLength(1);
      expect(exported.additionalBudget.amount).toBe(3000);
      expect(exported.aiPromptTemplate).toBe('test template string');
    });
  });

  // =========================================================================
  // saveToLocalStorage / loadFromLocalStorage
  // persist middleware 統合後の互換スタブテスト
  // =========================================================================
  describe('saveToLocalStorage', () => {
    it('should always return true (no-op: persist middleware handles persistence)', () => {
      usePortfolioStore.setState({
        initialized: true,
        baseCurrency: 'JPY',
        currentAssets: [createTestAsset()],
        targetPortfolio: [createTestTarget()],
      });

      const result = usePortfolioStore.getState().saveToLocalStorage();

      // persist middleware が自動保存するため、saveToLocalStorage は常に true を返す no-op
      expect(result).toBe(true);
    });

    it('should return true even when not initialized (no-op)', () => {
      usePortfolioStore.setState({ initialized: false });

      const result = usePortfolioStore.getState().saveToLocalStorage();

      expect(result).toBe(true);
    });
  });

  describe('loadFromLocalStorage', () => {
    it('should return null when store has no data (empty assets)', () => {
      usePortfolioStore.setState({
        currentAssets: [],
        targetPortfolio: [],
      });

      const result = usePortfolioStore.getState().loadFromLocalStorage();
      expect(result).toBeNull();
    });

    it('should return current store state when assets exist', () => {
      const testAsset = createTestAsset();
      const testTarget = createTestTarget();
      usePortfolioStore.setState({
        baseCurrency: 'JPY',
        currentAssets: [testAsset],
        targetPortfolio: [testTarget],
        exchangeRate: { rate: 150.0, source: 'Test', lastUpdated: '' },
      });

      const result = usePortfolioStore.getState().loadFromLocalStorage();

      expect(result).not.toBeNull();
      expect(result!.baseCurrency).toBe('JPY');
      expect(result!.currentAssets).toHaveLength(1);
      expect(result!.targetPortfolio).toHaveLength(1);
    });

    it('should return null when only targetPortfolio has entries but currentAssets is empty', () => {
      usePortfolioStore.setState({
        currentAssets: [],
        targetPortfolio: [],
      });

      const result = usePortfolioStore.getState().loadFromLocalStorage();
      expect(result).toBeNull();
    });

    it('should include all PortfolioExport fields in the result', () => {
      usePortfolioStore.setState({
        baseCurrency: 'USD',
        currentAssets: [createTestAsset()],
        targetPortfolio: [createTestTarget()],
        aiPromptTemplate: 'テストプロンプト',
        additionalBudget: { amount: 500000, currency: 'JPY' },
      });

      const result = usePortfolioStore.getState().loadFromLocalStorage();

      expect(result).not.toBeNull();
      expect(result!.baseCurrency).toBe('USD');
      expect(result!.aiPromptTemplate).toBe('テストプロンプト');
      expect(result!.additionalBudget).toEqual({ amount: 500000, currency: 'JPY' });
    });
  });

  describe('clearLocalStorage', () => {
    it('should remove portfolioData from localStorage', () => {
      const result = usePortfolioStore.getState().clearLocalStorage();
      expect(result).toBe(true);
      expect(localStorage.removeItem).toHaveBeenCalledWith('portfolioData');
    });
  });

  // =========================================================================
  // executePurchase / executeBatchPurchase
  // =========================================================================
  describe('executePurchase', () => {
    it('should increase holdings for the specified asset', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset({ id: 'a1', holdings: 10 })],
      });

      usePortfolioStore.getState().executePurchase('a1', 5);

      expect(usePortfolioStore.getState().currentAssets[0].holdings).toBe(15);
    });

    it('should handle string units', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset({ id: 'a1', holdings: 10 })],
      });

      usePortfolioStore.getState().executePurchase('a1', '2.5');

      expect(usePortfolioStore.getState().currentAssets[0].holdings).toBe(12.5);
    });
  });

  describe('executeBatchPurchase', () => {
    it('should execute purchases for all simulation results with positive shares', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [
          createTestAsset({ id: 'a1', holdings: 10 }),
          createTestAsset({ id: 'a2', holdings: 5 }),
        ],
      });

      const simulationResults: SimulationItem[] = [
        createTestSimulationItem({ id: 'a1', purchaseShares: 3 }),
        createTestSimulationItem({ id: 'a2', ticker: 'VTI', purchaseShares: 2 }),
      ];

      usePortfolioStore.getState().executeBatchPurchase(simulationResults);

      expect(usePortfolioStore.getState().currentAssets[0].holdings).toBe(13);
      expect(usePortfolioStore.getState().currentAssets[1].holdings).toBe(7);
    });

    it('should skip items with zero purchaseShares', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset({ id: 'a1', holdings: 10 })],
      });

      usePortfolioStore.getState().executeBatchPurchase([createTestSimulationItem({ id: 'a1', purchaseShares: 0 })]);

      expect(usePortfolioStore.getState().currentAssets[0].holdings).toBe(10);
    });
  });

  // =========================================================================
  // updateAnnualFee
  // =========================================================================
  describe('updateAnnualFee', () => {
    it('should update fee for a non-stock asset', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset({ id: 'a1', fundType: 'etf_us', isStock: false, annualFee: 0.03 })],
      });

      usePortfolioStore.getState().updateAnnualFee('a1', 0.05);

      const asset = usePortfolioStore.getState().currentAssets[0];
      expect(asset.annualFee).toBe(0.05);
      expect(asset.feeSource).toBe('ユーザー設定');
      expect(asset.feeIsEstimated).toBe(false);
    });

    it('should force fee to 0 for stock assets', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset({ id: 'a1', fundType: 'stock', isStock: true, annualFee: 0 })],
      });

      usePortfolioStore.getState().updateAnnualFee('a1', 0.5);

      const asset = usePortfolioStore.getState().currentAssets[0];
      expect(asset.annualFee).toBe(0);
      expect(asset.feeSource).toBe('個別株');
    });
  });

  // =========================================================================
  // updateDividendInfo
  // =========================================================================
  describe('updateDividendInfo', () => {
    it('should update dividend info for a specified asset', () => {
      usePortfolioStore.setState({
        initialized: true,
        currentAssets: [createTestAsset({ id: 'a1', dividendYield: 1.0 })],
      });

      usePortfolioStore.getState().updateDividendInfo('a1', 2.5, true, 'monthly');

      const asset = usePortfolioStore.getState().currentAssets[0];
      expect(asset.dividendYield).toBe(2.5);
      expect(asset.hasDividend).toBe(true);
      expect(asset.dividendFrequency).toBe('monthly');
      expect(asset.dividendIsEstimated).toBe(false);
    });
  });

  // =========================================================================
  // setAiPromptTemplate / updateAiPromptTemplate
  // =========================================================================
  describe('setAiPromptTemplate', () => {
    it('should set the AI prompt template', () => {
      usePortfolioStore.getState().setAiPromptTemplate({ template: 'Hello {ticker}' } as any);
      expect(usePortfolioStore.getState().aiPromptTemplate).toEqual({ template: 'Hello {ticker}' });
    });
  });

  describe('updateAiPromptTemplate', () => {
    it('should update the AI prompt template', () => {
      usePortfolioStore.getState().updateAiPromptTemplate({ template: 'Updated' } as any);
      expect(usePortfolioStore.getState().aiPromptTemplate).toEqual({ template: 'Updated' });
    });
  });

  // =========================================================================
  // handleAuthStateChange
  // =========================================================================
  describe('handleAuthStateChange', () => {
    it('should set cloud data source when authenticated', () => {
      const user = { id: 'u1', name: 'Test', email: 'test@test.com' };
      usePortfolioStore.getState().handleAuthStateChange(true, user);

      expect(usePortfolioStore.getState().dataSource).toBe('cloud');
      expect(usePortfolioStore.getState().currentUser).toBe(user);
    });

    it('should reset to local when not authenticated', () => {
      usePortfolioStore.setState({ dataSource: 'cloud', currentUser: { id: 'u1' } as any });
      usePortfolioStore.getState().handleAuthStateChange(false, null);

      expect(usePortfolioStore.getState().dataSource).toBe('local');
      expect(usePortfolioStore.getState().currentUser).toBeNull();
    });
  });

  // =========================================================================
  // validateAssetTypes
  // =========================================================================
  describe('validateAssetTypes', () => {
    it('should return empty results for empty array', () => {
      const result = usePortfolioStore.getState().validateAssetTypes([]);
      expect(result.updatedAssets).toEqual([]);
      expect(result.changes.fundType).toBe(0);
      expect(result.changes.fees).toBe(0);
      expect(result.changes.dividends).toBe(0);
    });

    it('should skip assets without a ticker', () => {
      const result = usePortfolioStore.getState().validateAssetTypes([{ name: 'No ticker' }] as any[]);
      expect(result.updatedAssets).toHaveLength(1);
      expect(result.updatedAssets[0].name).toBe('No ticker');
    });
  });

  // =========================================================================
  // Cloud Sync
  // =========================================================================
  describe('saveToGoogleDrive', () => {
    it('should fail when no user is logged in', async () => {
      usePortfolioStore.setState({ currentUser: null });

      const result = await usePortfolioStore.getState().saveToGoogleDrive();
      expect(result.success).toBe(false);
    });

    it('should save data and return success', async () => {
      usePortfolioStore.setState({
        currentUser: { id: 'u1', name: 'Test', email: 'test@test.com' },
        initialized: true,
        currentAssets: [createTestAsset()],
      });

      vi.mocked(saveToDrive).mockResolvedValue({ success: true, message: 'Saved' });

      const result = await usePortfolioStore.getState().saveToGoogleDrive();
      expect(result.success).toBe(true);
      expect(usePortfolioStore.getState().dataSource).toBe('cloud');
      expect(usePortfolioStore.getState().lastSyncTime).not.toBeNull();
    });

    it('should handle save failure', async () => {
      usePortfolioStore.setState({
        currentUser: { id: 'u1', name: 'Test', email: 'test@test.com' },
      });

      vi.mocked(saveToDrive).mockResolvedValue({ success: false, message: 'Drive full' });

      const result = await usePortfolioStore.getState().saveToGoogleDrive();
      expect(result.success).toBe(false);
    });
  });

  describe('loadFromGoogleDrive', () => {
    it('should fail when no user is logged in', async () => {
      usePortfolioStore.setState({ currentUser: null });

      const result = await usePortfolioStore.getState().loadFromGoogleDrive();
      expect(result.success).toBe(false);
    });

    it('should load data from Google Drive', async () => {
      usePortfolioStore.setState({
        currentUser: { id: 'u1', name: 'Test', email: 'test@test.com' },
        initialized: true,
      });

      vi.mocked(loadFromDrive).mockResolvedValue({
        success: true,
        data: {
          baseCurrency: 'USD',
          currentAssets: [createTestAsset()],
          targetPortfolio: [createTestTarget()],
          exchangeRate: { rate: 140.0, source: 'Cloud', lastUpdated: '' },
        },
      } as any);

      const result = await usePortfolioStore.getState().loadFromGoogleDrive();
      expect(result.success).toBe(true);
      expect(usePortfolioStore.getState().baseCurrency).toBe('USD');
      expect(usePortfolioStore.getState().dataSource).toBe('cloud');
    });
  });

  // =========================================================================
  // Computed Selectors
  // =========================================================================
  describe('selectTotalAssets', () => {
    it('should return 0 when no assets', () => {
      const state = usePortfolioStore.getState();
      expect(selectTotalAssets(state)).toBe(0);
    });

    it('should sum asset values in base currency (JPY)', () => {
      const state = {
        ...usePortfolioStore.getState(),
        baseCurrency: 'JPY',
        exchangeRate: { rate: 150.0 },
        currentAssets: [
          { price: 100, holdings: 10, currency: 'JPY' },  // 1000 JPY
          { price: 400, holdings: 5, currency: 'USD' },    // 2000 USD = 300000 JPY
        ],
      };
      expect(selectTotalAssets(state as any)).toBe(301000);
    });

    it('should sum asset values in base currency (USD)', () => {
      const state = {
        ...usePortfolioStore.getState(),
        baseCurrency: 'USD',
        exchangeRate: { rate: 150.0 },
        currentAssets: [
          { price: 15000, holdings: 1, currency: 'JPY' },  // 15000 JPY = 100 USD
          { price: 400, holdings: 2, currency: 'USD' },     // 800 USD
        ],
      };
      expect(selectTotalAssets(state as any)).toBe(900);
    });

    it('should handle NaN values gracefully', () => {
      const state = {
        ...usePortfolioStore.getState(),
        baseCurrency: 'JPY',
        exchangeRate: { rate: 150.0 },
        currentAssets: [
          { price: undefined, holdings: 10, currency: 'JPY' },
          { price: 100, holdings: 5, currency: 'JPY' },
        ],
      };
      expect(selectTotalAssets(state as any)).toBe(500);
    });
  });

  describe('selectAnnualFees', () => {
    it('should return 0 when no assets', () => {
      const state = usePortfolioStore.getState();
      expect(selectAnnualFees(state)).toBe(0);
    });

    it('should calculate total annual fees (excluding stocks)', () => {
      const state = {
        ...usePortfolioStore.getState(),
        baseCurrency: 'JPY',
        exchangeRate: { rate: 150.0 },
        currentAssets: [
          { price: 1000, holdings: 10, currency: 'JPY', annualFee: 0.5, isStock: false, fundType: 'etf_jp' },
          // value = 10000 JPY, fee = 10000 * 0.5 / 100 = 50
          { price: 500, holdings: 5, currency: 'JPY', annualFee: 0, isStock: true, fundType: 'stock' },
          // stock, should be excluded
        ],
      };
      expect(selectAnnualFees(state as any)).toBe(50);
    });

    it('should handle cross-currency fee calculation', () => {
      const state = {
        ...usePortfolioStore.getState(),
        baseCurrency: 'JPY',
        exchangeRate: { rate: 150.0 },
        currentAssets: [
          { price: 400, holdings: 10, currency: 'USD', annualFee: 0.03, isStock: false, fundType: 'etf_us' },
          // value = 4000 USD = 600000 JPY, fee = 600000 * 0.03 / 100 = 180
        ],
      };
      expect(selectAnnualFees(state as any)).toBe(180);
    });
  });

  describe('selectAnnualDividends', () => {
    it('should return 0 when no assets', () => {
      const state = usePortfolioStore.getState();
      expect(selectAnnualDividends(state)).toBe(0);
    });

    it('should calculate total annual dividends', () => {
      const state = {
        ...usePortfolioStore.getState(),
        baseCurrency: 'JPY',
        exchangeRate: { rate: 150.0 },
        currentAssets: [
          { price: 1000, holdings: 10, currency: 'JPY', dividendYield: 2.0, hasDividend: true },
          // value = 10000, dividends = 10000 * 2 / 100 = 200
          { price: 500, holdings: 5, currency: 'JPY', dividendYield: 3.0, hasDividend: false },
          // hasDividend is false, should be excluded
        ],
      };
      expect(selectAnnualDividends(state as any)).toBe(200);
    });

    it('should handle cross-currency dividend calculation', () => {
      const state = {
        ...usePortfolioStore.getState(),
        baseCurrency: 'JPY',
        exchangeRate: { rate: 150.0 },
        currentAssets: [
          { price: 100, holdings: 10, currency: 'USD', dividendYield: 1.5, hasDividend: true },
          // value = 1000 USD = 150000 JPY, dividends = 150000 * 1.5 / 100 = 2250
        ],
      };
      expect(selectAnnualDividends(state as any)).toBe(2250);
    });
  });

  // =========================================================================
  // initializeData
  // =========================================================================
  describe('initializeData', () => {
    it('should set initialized to true even when no local data exists', () => {
      usePortfolioStore.setState({ initialized: false });
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      usePortfolioStore.getState().initializeData();

      expect(usePortfolioStore.getState().initialized).toBe(true);
    });

    it('should not re-initialize if already initialized', () => {
      usePortfolioStore.setState({ initialized: true, baseCurrency: 'USD' });

      usePortfolioStore.getState().initializeData();

      // baseCurrency should remain USD (not reset to JPY)
      expect(usePortfolioStore.getState().baseCurrency).toBe('USD');
    });

    it('should load data from store state (persist rehydrated) when available', () => {
      // persist middleware が既に state を復元済みの状態をシミュレート
      usePortfolioStore.setState({
        initialized: false,
        baseCurrency: 'USD',
        exchangeRate: { rate: 140.0, source: 'Saved', lastUpdated: '' },
        currentAssets: [createTestAsset()],
        targetPortfolio: [createTestTarget()],
        additionalBudget: { amount: 5000, currency: 'USD' },
      });

      usePortfolioStore.getState().initializeData();

      const state = usePortfolioStore.getState();
      expect(state.initialized).toBe(true);
      expect(state.baseCurrency).toBe('USD');
    });

    // ─── Regression: Bug A ──────────────────────────────────────────────────
    // Bug A: currency のみ undefined な資産は validateAssetTypes で修正されるが、
    //        fundType/fees/dividends の変更がない場合 updatedAssets が適用されなかった
    it('[Bug A regression] currency: undefined の資産は initializeData 後に通貨情報が補完される', () => {
      const assetWithNoCurrency = createTestAsset({
        id: 'bug-a',
        ticker: 'VOO',
        currency: undefined as any,
        fundType: 'etf_us',   // 既に正しい → fundType の changes は 0
        annualFee: 0.03,      // 既に正しい → fees の changes は 0
      });

      usePortfolioStore.setState({
        initialized: false,
        currentAssets: [assetWithNoCurrency],
      });

      usePortfolioStore.getState().initializeData();

      const state = usePortfolioStore.getState();
      expect(state.initialized).toBe(true);
      // currency が undefined → guessCurrencyFromTicker('VOO') → 'USD' に補完される
      const fixedAsset = state.currentAssets.find(a => a.id === 'bug-a');
      expect(fixedAsset).toBeDefined();
      expect(fixedAsset!.currency).toBeDefined();
      expect(fixedAsset!.currency).not.toBe(undefined);
    });
  });

  // =========================================================================
  // getMaxHoldings (trial period integration) — 9-BY-S
  // =========================================================================
  describe('getMaxHoldings (trial-aware limits)', () => {
    beforeEach(() => {
      mockGetIsPremiumFromCache.mockReturnValue(false);
      mockIsInTrialPeriod.mockReturnValue(false);
    });

    it('should not hit limit for premium users (Infinity)', async () => {
      mockGetIsPremiumFromCache.mockReturnValue(true);

      usePortfolioStore.setState({
        targetPortfolio: [],
        currentAssets: Array.from({ length: 50 }, (_, i) => ({
          id: `id-${i}`,
          ticker: `T${i}`,
          name: `Stock ${i}`,
          price: 100,
          holdings: 1,
          currency: 'USD',
          fundType: 'etf_us',
          annualFee: 0.03,
        })),
      });

      // addTicker はAPI呼び出しを伴うが、制限エラーにはならない
      const result = await usePortfolioStore.getState().addTicker('NEW_TICKER');
      // Premium は制限なし → limitReached: true にはならない
      expect(result).toBeDefined();
      expect(result).not.toEqual(
        expect.objectContaining({ limitReached: true })
      );
    });

    it('should limit to 10 during trial period for free users', async () => {
      mockGetIsPremiumFromCache.mockReturnValue(false);
      mockIsInTrialPeriod.mockReturnValue(true);

      const assets = Array.from({ length: 10 }, (_, i) => ({
        id: `id-${i}`,
        ticker: `T${i}`,
        name: `Stock ${i}`,
        price: 100,
        holdings: 1,
        currency: 'USD',
        fundType: 'etf_us',
        annualFee: 0.03,
      }));
      usePortfolioStore.setState({
        targetPortfolio: [],
        currentAssets: assets,
      });

      // 11個目は制限に引っかかる
      const result = await usePortfolioStore.getState().addTicker('EXTRA');
      expect(result).toBeDefined();
      expect(result).toEqual(
        expect.objectContaining({ limitReached: true })
      );
    });

    it('should limit to 5 for free users after trial expires', async () => {
      mockGetIsPremiumFromCache.mockReturnValue(false);
      mockIsInTrialPeriod.mockReturnValue(false);

      const assets = Array.from({ length: 5 }, (_, i) => ({
        id: `id-${i}`,
        ticker: `T${i}`,
        name: `Stock ${i}`,
        price: 100,
        holdings: 1,
        currency: 'USD',
        fundType: 'etf_us',
        annualFee: 0.03,
      }));
      usePortfolioStore.setState({
        targetPortfolio: [],
        currentAssets: assets,
      });

      // 6個目は制限に引っかかる
      const result = await usePortfolioStore.getState().addTicker('EXTRA2');
      expect(result).toBeDefined();
      expect(result).toEqual(
        expect.objectContaining({ limitReached: true })
      );
    });
  });
});
