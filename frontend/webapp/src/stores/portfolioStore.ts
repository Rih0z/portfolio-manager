/**
 * PortfolioStore - ポートフォリオデータ + クラウド同期
 *
 * Zustand store for portfolio state management.
 * Handles asset management, target allocations, currency settings,
 * Google Drive sync, and localStorage persistence.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  fetchTickerData,
  fetchExchangeRate,
  fetchFundInfo,
  fetchDividendData,
} from '../services/api';
import { saveToDrive, loadFromDrive } from '../services/googleDriveService';
import { fetchMultipleStocks } from '../services/marketDataService';
import { fetchServerPortfolio, saveServerPortfolio } from '../services/portfolioSyncService';
import { getAuthToken } from '../utils/apiUtils';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';
import logger from '../utils/logger';
import {
  FUND_TYPES,
  guessFundType,
  estimateAnnualFee,
  estimateDividendYield,
  US_ETF_LIST,
  TICKER_SPECIFIC_FEES,
  TICKER_SPECIFIC_DIVIDENDS
} from '../utils/fundUtils';
import { requestManager, debouncedRefreshMarketData, requestDeduplicator } from '../utils/requestThrottle';
import { shouldUpdateExchangeRate, clearExchangeRateCache } from '../utils/exchangeRateDebounce';
import { getJapaneseStockName } from '../utils/japaneseStockNames';
import { useUIStore } from './uiStore';

// --- 暗号化/復号化ユーティリティ ---
const encryptData = (data: any): string | null => {
  try {
    const jsonString = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonString));
  } catch (error) {
    logger.error('データの暗号化に失敗しました', error);
    return null;
  }
};

const decryptData = (encryptedData: string): any | null => {
  try {
    const jsonString = decodeURIComponent(atob(encryptedData));
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') throw new Error('無効なデータ形式です');
    return data;
  } catch (error: any) {
    try {
      const jsonString = atob(encryptedData);
      return JSON.parse(jsonString);
    } catch (fallbackError) {
      logger.error('復号化に失敗しました', fallbackError);
      return null;
    }
  }
};

interface PortfolioState {
  // --- State ---
  initialized: boolean;
  baseCurrency: string;
  exchangeRate: any;
  lastUpdated: string | null;
  currentAssets: any[];
  targetPortfolio: any[];
  additionalBudget: { amount: number; currency: string };
  aiPromptTemplate: any;
  dataSource: string;
  lastSyncTime: string | null;
  currentUser: any;
  serverVersion: number | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'conflict';
  lastServerSync: string | null;

  // --- Actions ---
  addTicker: (ticker: string) => Promise<any>;
  removeTicker: (id: string) => void;
  updateHoldings: (id: string, holdings: number | string) => void;
  updateTargetAllocation: (id: string, percentage: number | string) => void;
  updateAnnualFee: (id: string, fee: number | string) => void;
  updateDividendInfo: (id: string, dividendYield: number | string, hasDividend?: boolean, frequency?: string) => void;
  setBaseCurrency: (currency: string) => void;
  toggleCurrency: () => void;
  setAdditionalBudget: (amount: number | string, currency?: string) => void;
  setAiPromptTemplate: (template: any) => void;
  updateAiPromptTemplate: (template: any) => void;
  updateExchangeRate: (forceUpdate?: boolean) => Promise<void>;
  resetExchangeRate: () => void;
  refreshMarketPrices: () => Promise<any>;
  calculateSimulation: () => any[];
  executePurchase: (tickerId: string, units: number | string) => void;
  executeBatchPurchase: (simulationResult: any[]) => void;
  importData: (data: any) => any;
  exportData: () => any;
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string, exchangeRateObj?: any) => number;
  calculatePurchaseShares: (purchaseAmount: number, price: number) => number;
  validateAssetTypes: (assets: any[]) => { updatedAssets: any[]; changes: any };

  // Cloud Sync
  saveToGoogleDrive: (userData?: any) => Promise<any>;
  loadFromGoogleDrive: (userData?: any) => Promise<any>;
  handleAuthStateChange: (isAuthenticated: boolean, user: any) => void;

  // Local Storage (legacy Base64 format)
  saveToLocalStorage: () => boolean;
  loadFromLocalStorage: () => any | null;
  clearLocalStorage: () => boolean;
  initializeData: () => void;

  // Server Sync
  syncToServer: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  resolveConflict: (strategy: 'server' | 'local') => Promise<void>;
}

// Helper: UI notification
const notify = (message: string, type: string = 'info') => useUIStore.getState().addNotification(message, type);

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  // --- Initial State ---
  initialized: false,
  baseCurrency: 'JPY',
  exchangeRate: { rate: 150.0, source: 'Default', lastUpdated: new Date().toISOString() },
  lastUpdated: null,
  currentAssets: [],
  targetPortfolio: [],
  additionalBudget: { amount: 300000, currency: 'JPY' },
  aiPromptTemplate: null,
  dataSource: 'local',
  lastSyncTime: null,
  currentUser: null,
  serverVersion: null,
  syncStatus: 'idle',
  lastServerSync: null,

  // --- Validate Asset Types ---
  validateAssetTypes: (assets: any[]) => {
    if (!Array.isArray(assets) || assets.length === 0) {
      return { updatedAssets: [], changes: { fundType: 0, fees: 0, dividends: 0 } };
    }

    let fundTypeChanges = 0;
    let feeChanges = 0;
    let dividendChanges = 0;
    const fundTypeChangeDetails: any[] = [];
    const feeChangeDetails: any[] = [];

    const validatedAssets = assets.map((asset: any) => {
      if (!asset.ticker) return asset;
      const ticker = asset.ticker.toUpperCase();
      let name = asset.name || '';

      const japaneseName = getJapaneseStockName(ticker);
      if (japaneseName !== ticker && (!name || name === ticker)) name = japaneseName;

      const correctFundType = guessFundType(ticker, name);
      const correctIsStock = correctFundType === FUND_TYPES.STOCK;
      const fundTypeIsWrong = asset.fundType !== correctFundType || asset.isStock !== correctIsStock;

      let correctFee: number;
      let feeSource: string;
      let feeIsEstimated: boolean;

      if (correctIsStock) {
        correctFee = 0; feeSource = '個別株'; feeIsEstimated = false;
      } else if (TICKER_SPECIFIC_FEES[ticker]) {
        correctFee = TICKER_SPECIFIC_FEES[ticker]; feeSource = 'ティッカー固有の情報'; feeIsEstimated = false;
      } else {
        const feeInfo = estimateAnnualFee(ticker, name);
        correctFee = feeInfo.fee; feeSource = feeInfo.source; feeIsEstimated = feeInfo.isEstimated;
      }

      const feeIsWrong = Math.abs(asset.annualFee - correctFee) > 0.001 ||
        asset.feeSource !== feeSource || asset.feeIsEstimated !== feeIsEstimated;

      const dividendInfo = estimateDividendYield(ticker, name);
      const dividendIsWrong = Math.abs(asset.dividendYield - dividendInfo.yield) > 0.001 ||
        asset.hasDividend !== dividendInfo.hasDividend ||
        asset.dividendFrequency !== dividendInfo.dividendFrequency;

      if (fundTypeIsWrong) { fundTypeChanges++; fundTypeChangeDetails.push({ ticker, name: asset.name, oldType: asset.fundType, newType: correctFundType }); }
      if (feeIsWrong) { feeChanges++; feeChangeDetails.push({ ticker, name: asset.name, oldFee: asset.annualFee, newFee: correctFee }); }
      if (dividendIsWrong) dividendChanges++;

      const nameIsWrong = name !== asset.name;
      if (fundTypeIsWrong || feeIsWrong || dividendIsWrong || nameIsWrong) {
        return {
          ...asset, name, fundType: correctFundType, isStock: correctIsStock,
          annualFee: correctFee, feeSource, feeIsEstimated,
          dividendYield: dividendInfo.yield, hasDividend: dividendInfo.hasDividend,
          dividendFrequency: dividendInfo.dividendFrequency, dividendIsEstimated: dividendInfo.isEstimated,
        };
      }
      return asset;
    });

    return {
      updatedAssets: validatedAssets,
      changes: { fundType: fundTypeChanges, fees: feeChanges, dividends: dividendChanges, fundTypeDetails: fundTypeChangeDetails, feeDetails: feeChangeDetails }
    };
  },

  // --- Notifications helper ---
  addTicker: async (ticker: string) => {
    const { targetPortfolio, currentAssets, saveToLocalStorage } = get();

    const exists = [...targetPortfolio, ...currentAssets].some(
      (item: any) => item.ticker?.toLowerCase() === ticker.toLowerCase()
    );
    if (exists) {
      notify('既に追加されている銘柄です', 'warning');
      return { success: false, message: '既に追加されている銘柄です' };
    }

    useUIStore.getState().setLoading(true);

    try {
      const tickerResult: any = await requestManager.request('alphaVantage', () => fetchTickerData(ticker), { priority: 1 });

      if (!tickerResult.success) {
        if (tickerResult.errorType === 'RATE_LIMIT') {
          notify('APIリクエスト制限に達しました。しばらく待ってから再試行してください。', 'error');
        } else {
          notify(`銘柄「${ticker}」の情報取得でエラーが発生しました: ${tickerResult.message}`, 'warning');
        }
        if (!tickerResult.data) {
          notify(`銘柄「${ticker}」を追加できませんでした`, 'error');
          return { success: false, message: '銘柄の追加に失敗しました' };
        }
        notify(`銘柄「${ticker}」は最新の株価情報を取得できませんでした。保存済みのバックアップデータを使用して追加します。`, 'warning');
      }

      if (tickerResult.data?.source === 'Fallback') {
        notify(`銘柄「${ticker}」の株価情報は最新の市場価格ではなく、バックアップデータから取得した推定値です。`, 'warning');
      }

      const tickerData = tickerResult.data;
      const japaneseName = getJapaneseStockName(ticker);
      if (japaneseName !== ticker) tickerData.name = japaneseName;

      const fundInfoResult: any = await requestManager.request('default', () => fetchFundInfo(ticker, tickerData.name));
      const dividendResult: any = await requestManager.request('default', () => fetchDividendData(ticker));

      const upperTicker = ticker.toUpperCase();
      let fundType: string;
      if (US_ETF_LIST.includes(upperTicker)) {
        fundType = FUND_TYPES.ETF_US;
      } else {
        fundType = tickerData.fundType || fundInfoResult.fundType;
        if (!fundType || fundType === 'unknown') fundType = guessFundType(ticker, tickerData.name || '');
      }
      const isStock = fundType === FUND_TYPES.STOCK;

      set(state => ({
        targetPortfolio: [...state.targetPortfolio, {
          id: tickerData.id, name: tickerData.name, ticker: tickerData.ticker, targetPercentage: 0
        }],
        currentAssets: [...state.currentAssets, {
          ...tickerData, holdings: 0, fundType, isStock,
          annualFee: isStock ? 0 : (tickerData.annualFee || fundInfoResult.annualFee || 0),
          feeSource: isStock ? '個別株' : (tickerData.feeSource || fundInfoResult.feeSource || 'Estimated'),
          feeIsEstimated: isStock ? false : (tickerData.feeIsEstimated || fundInfoResult.feeIsEstimated || true),
          region: tickerData.region || fundInfoResult.region || 'unknown',
          dividendYield: dividendResult.data.dividendYield,
          hasDividend: dividendResult.data.hasDividend,
          dividendFrequency: dividendResult.data.dividendFrequency,
          dividendIsEstimated: dividendResult.data.dividendIsEstimated
        }]
      }));

      notify(`銘柄「${tickerData.name || ticker}」を追加しました`, 'success');
      setTimeout(() => get().saveToLocalStorage(), 100);
      return { success: true, message: '銘柄を追加しました' };
    } catch (error: any) {
      notify(`銘柄「${ticker}」の追加に失敗しました: ${error.message}`, 'error');
      return { success: false, message: '銘柄の追加に失敗しました' };
    } finally {
      useUIStore.getState().setLoading(false);
    }
  },

  removeTicker: (id: string) => {
    set(state => ({
      targetPortfolio: state.targetPortfolio.filter((item: any) => item.id !== id),
      currentAssets: state.currentAssets.filter((item: any) => item.id !== id)
    }));
    setTimeout(() => get().saveToLocalStorage(), 100);
  },

  updateHoldings: (id: string, holdings: number | string) => {
    set(state => ({
      currentAssets: state.currentAssets.map((item: any) =>
        item.id === id ? { ...item, holdings: parseFloat(parseFloat(String(holdings)).toFixed(4)) || 0 } : item
      )
    }));
    setTimeout(() => get().saveToLocalStorage(), 100);
  },

  updateTargetAllocation: (id: string, percentage: number | string) => {
    set(state => ({
      targetPortfolio: state.targetPortfolio.map((item: any) =>
        item.id === id ? { ...item, targetPercentage: parseFloat(String(percentage)) } : item
      )
    }));
    setTimeout(() => get().saveToLocalStorage(), 100);
  },

  updateAnnualFee: (id: string, fee: number | string) => {
    set(state => ({
      currentAssets: state.currentAssets.map((item: any) => {
        if (item.id !== id) return item;
        if (item.isStock || item.fundType === FUND_TYPES.STOCK) {
          return { ...item, annualFee: 0, feeSource: '個別株', feeIsEstimated: false };
        }
        return { ...item, annualFee: parseFloat(parseFloat(String(fee)).toFixed(2)) || 0, feeSource: 'ユーザー設定', feeIsEstimated: false };
      })
    }));
    setTimeout(() => get().saveToLocalStorage(), 100);
  },

  updateDividendInfo: (id: string, dividendYield: number | string, hasDividend: boolean = true, frequency: string = 'quarterly') => {
    set(state => ({
      currentAssets: state.currentAssets.map((item: any) =>
        item.id === id ? {
          ...item,
          dividendYield: parseFloat(parseFloat(String(dividendYield)).toFixed(2)) || 0,
          hasDividend, dividendFrequency: frequency, dividendIsEstimated: false
        } : item
      )
    }));
    setTimeout(() => get().saveToLocalStorage(), 100);
  },

  setBaseCurrency: (currency: string) => {
    set({ baseCurrency: currency });
    setTimeout(() => get().saveToLocalStorage(), 0);
  },

  toggleCurrency: () => {
    set(state => ({ baseCurrency: state.baseCurrency === 'JPY' ? 'USD' : 'JPY' }));
    setTimeout(() => get().saveToLocalStorage(), 0);
  },

  setAdditionalBudget: (amount: number | string, currency?: string) => {
    set({ additionalBudget: { amount: parseFloat(String(amount)) || 0, currency: currency || 'JPY' } });
    setTimeout(() => get().saveToLocalStorage(), 100);
  },

  setAiPromptTemplate: (template: any) => set({ aiPromptTemplate: template }),

  updateAiPromptTemplate: (template: any) => {
    set({ aiPromptTemplate: template });
    setTimeout(() => get().saveToLocalStorage(), 100);
  },

  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string, exchangeRateObj?: any): number => {
    if (fromCurrency === toCurrency) return amount;
    const rate = (exchangeRateObj || get().exchangeRate).rate;
    if (fromCurrency === 'JPY' && toCurrency === 'USD') return amount / rate;
    if (fromCurrency === 'USD' && toCurrency === 'JPY') return amount * rate;
    throw new Error(`Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`);
  },

  calculatePurchaseShares: (purchaseAmount: number, price: number): number => {
    if (price <= 0 || purchaseAmount <= 0) return 0;
    return Math.floor((purchaseAmount / price) * 100) / 100;
  },

  // --- Exchange Rate ---
  updateExchangeRate: async (forceUpdate: boolean = false) => {
    if (!shouldUpdateExchangeRate(forceUpdate)) return;

    const { baseCurrency, exchangeRate: currentRate } = get();

    try {
      const cacheKey = `exchangeRate_${baseCurrency}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached && !forceUpdate) {
        try {
          const cachedData = JSON.parse(cached);
          const cacheAge = Date.now() - new Date(cachedData.timestamp).getTime();
          if (cachedData.data && typeof cachedData.data.rate === 'number' && cachedData.data.rate > 0 && cacheAge < 24 * 60 * 60 * 1000) {
            set({ exchangeRate: cachedData.data });
            return;
          }
        } catch { localStorage.removeItem(cacheKey); }
      }

      const result: any = await requestManager.request('exchangeRate', () => fetchExchangeRate('USD', 'JPY'));
      if (result.success) {
        const rateData = { rate: result.rate, source: result.source, lastUpdated: result.lastUpdated };
        set({ exchangeRate: rateData });
        if (result.isDefault || result.isStale) {
          notify(result.isDefault ? 'デフォルトの為替レート（150円/ドル）を使用しています。' : '為替レートが古い可能性があります。', 'warning');
        }
        localStorage.setItem(cacheKey, JSON.stringify({ data: rateData, timestamp: new Date().toISOString() }));
      } else if (result.error) {
        notify(`為替レートの取得に失敗しました。デフォルト値（${currentRate.rate}円/ドル）を使用します。5分後に再試行します。`, 'warning');
        setTimeout(() => get().updateExchangeRate(), 5 * 60 * 1000);
      }
    } catch (error: any) {
      notify(`為替レートの更新中にエラーが発生しました。デフォルト値（${currentRate.rate}円/ドル）を使用します。`, 'error');
    }
  },

  resetExchangeRate: () => {
    ['JPY', 'USD'].forEach(c => localStorage.removeItem(`exchangeRate_${c}`));
    const defaultRate = { rate: 150.0, lastUpdated: new Date().toISOString(), isDefault: true, source: 'manual-reset' };
    set({ exchangeRate: defaultRate });
    notify('為替レートをデフォルト値（150円/ドル）にリセットしました', 'info');
    setTimeout(() => get().updateExchangeRate(true), 1000);
    setTimeout(() => get().saveToLocalStorage(), 500);
  },

  // --- Market Data Refresh ---
  refreshMarketPrices: async () => {
    const refreshInternal = async () => {
      useUIStore.getState().setLoading(true);
      try {
        const { currentAssets, validateAssetTypes, saveToLocalStorage } = get();
        let errorCount = 0;
        let fallbackCount = 0;

        const tickers = currentAssets.map((a: any) => a.ticker);
        const batchData: any = await fetchMultipleStocks(tickers);

        // degraded フラグの検出（予算超過時のキャッシュデータ）
        if (batchData?.degraded) {
          notify('キャッシュデータを表示中。最新データではない可能性があります。', 'warning');
        }

        const updatedAssets = await Promise.all(
          currentAssets.map(async (asset: any) => {
            try {
              const stockData = batchData.data?.[asset.ticker];
              if (!stockData) { errorCount++; return asset; }

              const newFundType = stockData.fundType || asset.fundType;
              const isStock = newFundType === FUND_TYPES.STOCK;
              if (stockData.source === 'Fallback') fallbackCount++;

              return {
                ...asset,
                price: stockData.price, source: stockData.source, lastUpdated: stockData.lastUpdated,
                fundType: newFundType, isStock,
                annualFee: isStock ? 0 : stockData.annualFee,
                feeSource: isStock ? '個別株' : stockData.feeSource,
                feeIsEstimated: isStock ? false : stockData.feeIsEstimated,
                region: stockData.region || asset.region,
                dividendYield: stockData.dividendYield || asset.dividendYield || 0,
                hasDividend: stockData.hasDividend !== undefined ? stockData.hasDividend : asset.hasDividend,
                dividendFrequency: stockData.dividendFrequency || asset.dividendFrequency || 'Annual',
                dividendIsEstimated: stockData.dividendIsEstimated || false,
              };
            } catch { errorCount++; return asset; }
          })
        );

        const { updatedAssets: validatedAssets, changes } = validateAssetTypes(updatedAssets);
        set({ currentAssets: validatedAssets, lastUpdated: new Date().toISOString() });

        if (errorCount > 0) notify(`${errorCount}銘柄のデータ更新でエラーが発生しました`, 'error');
        if (fallbackCount > 0) notify(`${fallbackCount}銘柄はバックアップデータを使用しています`, 'warning');
        notify('市場データを更新しました', 'success');

        saveToLocalStorage();
        // 認証済みの場合、debounced サーバー同期
        if (getAuthToken()) {
          setTimeout(() => get().syncToServer(), 5000);
        }
        return { success: true, message: '市場データを更新しました' };
      } catch (error: any) {
        notify(`市場データの更新に失敗しました: ${error.message}`, 'error');
        return { success: false, message: '市場データの更新に失敗しました' };
      } finally {
        useUIStore.getState().setLoading(false);
      }
    };

    return debouncedRefreshMarketData(refreshInternal);
  },

  // --- Simulation ---
  calculateSimulation: () => {
    const { currentAssets, targetPortfolio, additionalBudget, baseCurrency, exchangeRate, convertCurrency, calculatePurchaseShares } = get();

    const totalCurrentAssets = currentAssets.reduce((sum: number, asset: any) => {
      let val = asset.price * asset.holdings;
      if (asset.currency !== baseCurrency) val = convertCurrency(val, asset.currency, baseCurrency);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    let budgetInBase = additionalBudget.amount;
    if (additionalBudget.currency !== baseCurrency) {
      budgetInBase = convertCurrency(additionalBudget.amount, additionalBudget.currency, baseCurrency);
    }
    const totalWithBudget = totalCurrentAssets + budgetInBase;

    const results = targetPortfolio.map((target: any) => {
      const asset = currentAssets.find((a: any) => a.ticker === target.ticker);
      if (!asset) return null;

      let currentValue = asset.price * asset.holdings;
      if (asset.currency !== baseCurrency) currentValue = convertCurrency(currentValue, asset.currency, baseCurrency);

      const targetAllocation = target.targetPercentage || 0;
      const currentAllocation = totalCurrentAssets > 0 ? (currentValue / totalCurrentAssets) * 100 : 0;
      const diff = targetAllocation - currentAllocation;

      if (diff > 0) {
        const idealPurchase = (diff / 100) * totalWithBudget;
        let purchaseAmount = idealPurchase;
        if (baseCurrency !== asset.currency) purchaseAmount = convertCurrency(idealPurchase, baseCurrency, asset.currency);
        const purchaseShares = calculatePurchaseShares(purchaseAmount, asset.price);

        return {
          id: asset.id, ticker: asset.ticker, name: asset.name,
          currentAllocation, targetAllocation, diff, currentValue,
          purchaseAmount, price: asset.price, purchaseShares,
          currency: asset.currency, isMutualFund: asset.isMutualFund, source: asset.source
        };
      }
      return null;
    }).filter(Boolean);

    return results.sort((a: any, b: any) => {
      const aBase = a.currency !== baseCurrency ? convertCurrency(a.purchaseAmount, a.currency, baseCurrency) : a.purchaseAmount;
      const bBase = b.currency !== baseCurrency ? convertCurrency(b.purchaseAmount, b.currency, baseCurrency) : b.purchaseAmount;
      return bBase - aBase;
    });
  },

  executePurchase: (tickerId: string, units: number | string) => {
    set(state => ({
      currentAssets: state.currentAssets.map((a: any) =>
        a.id === tickerId ? { ...a, holdings: parseFloat((a.holdings + parseFloat(String(units))).toFixed(4)) } : a
      )
    }));
    setTimeout(() => get().saveToLocalStorage(), 100);
  },

  executeBatchPurchase: (simulationResult: any[]) => {
    simulationResult.forEach((r: any) => {
      if (r.purchaseShares > 0) get().executePurchase(r.id, r.purchaseShares);
    });
    get().saveToLocalStorage();
  },

  // --- Import/Export ---
  importData: (data: any) => {
    if (!data) return { success: false, message: 'データが無効です' };
    try {
      if (typeof data === 'string') data = JSON.parse(data);

      let importDataStructure = data;
      if (data.portfolioData && typeof data.portfolioData === 'object') {
        importDataStructure = {
          baseCurrency: data.portfolioData.baseCurrency || data.baseCurrency || 'JPY',
          exchangeRate: data.portfolioData.exchangeRate || data.exchangeRate,
          currentAssets: data.portfolioData.assets || data.portfolioData.currentAssets || [],
          targetPortfolio: data.portfolioData.targetAllocation || data.portfolioData.targetPortfolio || [],
          additionalBudget: data.portfolioData.additionalBudget || data.additionalBudget,
          aiPromptTemplate: data.portfolioData.aiPromptTemplate || data.aiPromptTemplate
        };
      }
      if (!importDataStructure.baseCurrency) importDataStructure.baseCurrency = 'JPY';

      const requiredFields = ['currentAssets', 'targetPortfolio'];
      const missingFields = requiredFields.filter(f => !(f in importDataStructure));
      if (missingFields.length > 0) throw new Error(`必須フィールドがありません: ${missingFields.join(', ')}`);

      data = importDataStructure;

      const updates: Partial<PortfolioState> = {};
      if (data.baseCurrency) updates.baseCurrency = data.baseCurrency;
      if (data.exchangeRate) updates.exchangeRate = data.exchangeRate;

      if (Array.isArray(data.currentAssets)) {
        const { updatedAssets, changes } = get().validateAssetTypes(data.currentAssets);
        updates.currentAssets = updatedAssets;
        if (changes.fundType > 0) notify(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
        if (changes.fees > 0) notify(`${changes.fees}件の銘柄で手数料情報を修正しました`, 'info');
      }

      if (Array.isArray(data.targetPortfolio)) updates.targetPortfolio = data.targetPortfolio;

      if (data.additionalBudget !== undefined) {
        if (typeof data.additionalBudget === 'number') {
          updates.additionalBudget = { amount: data.additionalBudget, currency: data.baseCurrency || 'JPY' };
        } else if (typeof data.additionalBudget === 'object') {
          updates.additionalBudget = data.additionalBudget;
        }
      }
      if (data.aiPromptTemplate) updates.aiPromptTemplate = data.aiPromptTemplate;

      set(updates as any);
      setTimeout(() => get().saveToLocalStorage(), 100);
      trackEvent(AnalyticsEvents.CSV_IMPORT, { assetCount: (updates as any).currentAssets?.length || 0 });
      return { success: true, message: 'データをインポートしました' };
    } catch (error: any) {
      notify(`データのインポートに失敗しました: ${error.message}`, 'error');
      return { success: false, message: `データのインポートに失敗しました: ${error.message}` };
    }
  },

  exportData: () => {
    const { baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget, aiPromptTemplate } = get();
    return { baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget, aiPromptTemplate };
  },

  // --- Local Storage (legacy Base64) ---
  saveToLocalStorage: () => {
    const state = get();
    if (!state.initialized) return false;
    try {
      const data = {
        baseCurrency: state.baseCurrency, exchangeRate: state.exchangeRate, lastUpdated: state.lastUpdated,
        currentAssets: state.currentAssets, targetPortfolio: state.targetPortfolio,
        additionalBudget: state.additionalBudget, aiPromptTemplate: state.aiPromptTemplate,
        version: '1.0.0', timestamp: new Date().toISOString()
      };
      const encrypted = encryptData(data);
      if (!encrypted) throw new Error('暗号化に失敗');
      localStorage.setItem('portfolioData', encrypted);
      return true;
    } catch (error) {
      logger.error('ローカルストレージへの保存に失敗しました', error);
      return false;
    }
  },

  loadFromLocalStorage: () => {
    try {
      const encrypted = localStorage.getItem('portfolioData');
      if (!encrypted) return null;
      const data = decryptData(encrypted);
      if (!data) return null;

      const requiredFields = ['baseCurrency', 'currentAssets', 'targetPortfolio'];
      if (requiredFields.some(f => !(f in data))) return null;

      // 為替レート整合性チェック
      if (!data.exchangeRate || typeof data.exchangeRate !== 'object' || !data.exchangeRate.rate || typeof data.exchangeRate.rate !== 'number') {
        data.exchangeRate = { rate: 150.0, lastUpdated: new Date().toISOString(), isDefault: true, source: 'fallback' };
      }
      return data;
    } catch { return null; }
  },

  clearLocalStorage: () => {
    try {
      localStorage.removeItem('portfolioData');
      notify('ローカルストレージをクリアしました', 'info');
      return true;
    } catch { return false; }
  },

  // --- Cloud Sync ---
  saveToGoogleDrive: async (userData?: any) => {
    const state = get();
    const user = userData || state.currentUser;
    if (!user) {
      notify('Googleアカウントにログインしていないため、クラウド保存できません', 'warning');
      return { success: false, message: 'ログインしていません' };
    }
    try {
      const portfolioData = {
        baseCurrency: state.baseCurrency, exchangeRate: state.exchangeRate, lastUpdated: state.lastUpdated,
        currentAssets: state.currentAssets, targetPortfolio: state.targetPortfolio,
        additionalBudget: state.additionalBudget, aiPromptTemplate: state.aiPromptTemplate,
        version: '1.0.0', timestamp: new Date().toISOString()
      };
      const result = await saveToDrive(portfolioData);
      if (result.success) {
        set({ lastSyncTime: new Date().toISOString(), dataSource: 'cloud' });
        notify('データをクラウドに保存しました', 'success');
        return { success: true, message: 'データを保存しました' };
      }
      notify(`クラウド保存に失敗しました: ${result.message}`, 'error');
      return { success: false, message: result.message };
    } catch (error: any) {
      notify('クラウドへの保存に失敗しました', 'error');
      return { success: false, message: 'クラウド保存に失敗しました' };
    }
  },

  loadFromGoogleDrive: async (userData?: any) => {
    const state = get();
    const user = userData || state.currentUser;
    if (!user) {
      notify('Googleアカウントにログインしていないため、クラウドから読み込めません', 'warning');
      return { success: false, message: 'ログインしていません' };
    }
    try {
      const result: any = await loadFromDrive('latest');
      if (result.success && result.data) {
        const cloudData = result.data;
        const requiredFields = ['baseCurrency', 'currentAssets', 'targetPortfolio'];
        const missingFields = requiredFields.filter(f => !(f in cloudData));
        if (missingFields.length > 0) {
          notify('クラウドデータの形式が不正です', 'warning');
          return { success: false, message: 'クラウドデータの形式が不正です' };
        }

        const updates: any = {};
        if (cloudData.baseCurrency) updates.baseCurrency = cloudData.baseCurrency;
        if (cloudData.exchangeRate) updates.exchangeRate = cloudData.exchangeRate;
        if (cloudData.lastUpdated) updates.lastUpdated = cloudData.lastUpdated;

        if (cloudData.additionalBudget !== undefined) {
          if (typeof cloudData.additionalBudget === 'number') {
            updates.additionalBudget = { amount: cloudData.additionalBudget, currency: cloudData.baseCurrency || 'JPY' };
          } else if (typeof cloudData.additionalBudget === 'object') {
            updates.additionalBudget = cloudData.additionalBudget;
          }
        }
        if (cloudData.aiPromptTemplate) updates.aiPromptTemplate = cloudData.aiPromptTemplate;

        if (Array.isArray(cloudData.currentAssets)) {
          const { updatedAssets, changes } = get().validateAssetTypes(cloudData.currentAssets);
          updates.currentAssets = updatedAssets;
          if (changes.fundType > 0) notify(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
          if (changes.fees > 0) notify(`${changes.fees}件の銘柄で手数料情報を修正しました`, 'info');
        }
        if (Array.isArray(cloudData.targetPortfolio)) updates.targetPortfolio = cloudData.targetPortfolio;

        updates.lastSyncTime = new Date().toISOString();
        updates.dataSource = 'cloud';
        set(updates);

        notify('クラウドからデータを読み込みました', 'success');
        setTimeout(() => get().saveToLocalStorage(), 100);
        return { success: true, message: 'クラウドからデータを読み込みました' };
      } else {
        const message = result.message || 'クラウドにデータがありません';
        notify(`${message}。現在のデータをクラウドに保存しますか？`, 'info');
        return { success: false, message, suggestSaving: true };
      }
    } catch (error: any) {
      notify(`クラウドからの読み込みに失敗しました: ${error.message}`, 'error');
      return { success: false, message: `クラウド読み込みに失敗しました: ${error.message}` };
    }
  },

  handleAuthStateChange: (isAuthenticated: boolean, user: any) => {
    if (isAuthenticated && user) {
      set({ dataSource: 'cloud', currentUser: user });
    } else {
      set({ dataSource: 'local', currentUser: null });
    }
  },

  // --- Initialize ---
  initializeData: () => {
    const state = get();
    if (state.initialized) return;

    try {
      const localData = state.loadFromLocalStorage();
      if (localData) {
        const updates: any = {};
        if (localData.baseCurrency) updates.baseCurrency = localData.baseCurrency;
        if (localData.exchangeRate) {
          if (!localData.exchangeRate.rate) localData.exchangeRate.rate = 150.0;
          updates.exchangeRate = localData.exchangeRate;
        }
        if (localData.lastUpdated) updates.lastUpdated = localData.lastUpdated;
        if (localData.aiPromptTemplate) updates.aiPromptTemplate = localData.aiPromptTemplate;

        if (localData.additionalBudget !== undefined) {
          if (typeof localData.additionalBudget === 'number') {
            updates.additionalBudget = { amount: localData.additionalBudget, currency: localData.baseCurrency || 'JPY' };
          } else if (typeof localData.additionalBudget === 'object') {
            updates.additionalBudget = localData.additionalBudget;
          }
        }

        if (Array.isArray(localData.currentAssets)) {
          const { updatedAssets, changes } = get().validateAssetTypes(localData.currentAssets);
          updates.currentAssets = updatedAssets;
          if (changes.fundType > 0) notify(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
          if (changes.fees > 0) notify(`${changes.fees}件の銘柄で手数料情報を修正しました`, 'info');
          if (changes.dividends > 0) notify(`${changes.dividends}件の銘柄で配当情報を修正しました`, 'info');

          if (changes.fundType > 0 || changes.fees > 0 || changes.dividends > 0) {
            setTimeout(() => get().saveToLocalStorage(), 500);
          }
        }

        if (Array.isArray(localData.targetPortfolio)) updates.targetPortfolio = localData.targetPortfolio;

        updates.initialized = true;
        set(updates);
        notify('前回のデータを読み込みました', 'info');
      } else {
        set({ initialized: true });
      }

      setTimeout(() => get().updateExchangeRate(), 500);
    } catch (error: any) {
      notify(`データの初期化中にエラーが発生しました: ${error.message}`, 'error');
      set({ initialized: true });
    }
  },

  // --- Server Sync ---
  syncToServer: async () => {
    if (!getAuthToken()) return;
    const state = get();
    if (state.syncStatus === 'syncing') return;

    set({ syncStatus: 'syncing' });
    try {
      const result = await saveServerPortfolio(
        {
          currentAssets: state.currentAssets,
          targetPortfolio: state.targetPortfolio,
          baseCurrency: state.baseCurrency,
          exchangeRate: state.exchangeRate,
          additionalBudget: state.additionalBudget,
          aiPromptTemplate: state.aiPromptTemplate
        },
        state.serverVersion
      );
      set({
        serverVersion: result.version,
        lastServerSync: result.updatedAt,
        syncStatus: 'idle'
      });
      trackEvent(AnalyticsEvents.PORTFOLIO_SYNC, { direction: 'to_server' });
    } catch (error: any) {
      if (error.code === 'VERSION_CONFLICT') {
        set({ syncStatus: 'conflict' });
        notify('ポートフォリオが別のセッションで更新されています。最新データを読み込んでください。', 'warning');
      } else {
        set({ syncStatus: 'error' });
      }
    }
  },

  syncFromServer: async () => {
    if (!getAuthToken()) return;
    set({ syncStatus: 'syncing' });
    try {
      const serverData = await fetchServerPortfolio();
      if (!serverData) {
        set({ syncStatus: 'idle' });
        return;
      }

      const state = get();
      // サーバーデータが新しければサーバー優先
      const serverTime = new Date(serverData.updatedAt).getTime();
      const localTime = state.lastUpdated ? new Date(state.lastUpdated).getTime() : 0;

      if (serverTime > localTime) {
        const updates: any = {
          serverVersion: serverData.version,
          lastServerSync: serverData.updatedAt,
          syncStatus: 'idle'
        };

        if (Array.isArray(serverData.currentAssets)) {
          const { updatedAssets } = get().validateAssetTypes(serverData.currentAssets);
          updates.currentAssets = updatedAssets;
        }
        if (Array.isArray(serverData.targetPortfolio)) updates.targetPortfolio = serverData.targetPortfolio;
        if (serverData.baseCurrency) updates.baseCurrency = serverData.baseCurrency;
        if (serverData.exchangeRate) updates.exchangeRate = serverData.exchangeRate;
        if (serverData.additionalBudget) updates.additionalBudget = serverData.additionalBudget;
        if (serverData.aiPromptTemplate) updates.aiPromptTemplate = serverData.aiPromptTemplate;
        if (serverData.updatedAt) updates.lastUpdated = serverData.updatedAt;

        set(updates);
        get().saveToLocalStorage();
        notify('サーバーからデータを同期しました', 'success');
      } else {
        set({
          serverVersion: serverData.version,
          lastServerSync: serverData.updatedAt,
          syncStatus: 'idle'
        });
      }
      trackEvent(AnalyticsEvents.PORTFOLIO_SYNC, { direction: 'from_server' });
    } catch (error: any) {
      set({ syncStatus: 'error' });
    }
  },

  resolveConflict: async (strategy: 'server' | 'local') => {
    if (strategy === 'server') {
      await get().syncFromServer();
    } else {
      // ローカル優先: サーバーに強制保存（version=nullで新規扱い）
      set({ serverVersion: null, syncStatus: 'idle' });
      await get().syncToServer();
    }
  },
}));

// --- Computed selectors ---
export const selectTotalAssets = (state: PortfolioState) => {
  return state.currentAssets.reduce((sum: number, asset: any) => {
    let val = asset.price * asset.holdings;
    if (asset.currency !== state.baseCurrency) {
      if (state.baseCurrency === 'JPY' && asset.currency === 'USD') val *= state.exchangeRate.rate;
      else if (state.baseCurrency === 'USD' && asset.currency === 'JPY') val /= state.exchangeRate.rate;
    }
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
};

export const selectAnnualFees = (state: PortfolioState) => {
  return state.currentAssets.reduce((sum: number, asset: any) => {
    if (asset.isStock || asset.fundType === FUND_TYPES.STOCK) return sum;
    let val = asset.price * asset.holdings;
    if (asset.currency !== state.baseCurrency) {
      if (state.baseCurrency === 'JPY' && asset.currency === 'USD') val *= state.exchangeRate.rate;
      else if (state.baseCurrency === 'USD' && asset.currency === 'JPY') val /= state.exchangeRate.rate;
    }
    return sum + (val * (asset.annualFee || 0) / 100);
  }, 0);
};

export const selectAnnualDividends = (state: PortfolioState) => {
  return state.currentAssets.reduce((sum: number, asset: any) => {
    if (!asset.hasDividend) return sum;
    let val = asset.price * asset.holdings;
    if (asset.currency !== state.baseCurrency) {
      if (state.baseCurrency === 'JPY' && asset.currency === 'USD') val *= state.exchangeRate.rate;
      else if (state.baseCurrency === 'USD' && asset.currency === 'JPY') val /= state.exchangeRate.rate;
    }
    return sum + (val * (asset.dividendYield || 0) / 100);
  }, 0);
};
