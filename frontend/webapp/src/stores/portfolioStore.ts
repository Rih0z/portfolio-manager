/**
 * PortfolioStore - ポートフォリオデータ + クラウド同期
 *
 * Zustand store for portfolio state management.
 * Handles asset management, target allocations, currency settings,
 * Google Drive sync, and localStorage persistence.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CurrentAsset,
  TargetAllocation,
  ExchangeRate,
  UserData,
  OperationResult,
  SyncResult,
  ValidateResult,
  SimulationItem,
  PortfolioExport,
} from '../types/portfolio.types';
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
import { getErrorMessage } from '../utils/errorUtils';
import { useUIStore } from './uiStore';
import { getIsPremiumFromCache } from '../hooks/queries';

// ─── Holdings Plan Limits ─────────────────────────────
const MAX_HOLDINGS_FREE = 5;
const MAX_HOLDINGS_STANDARD = Infinity;

// --- データデシリアライズ ---
// 旧フォーマット（Base64/Base64+URI）からの後方互換読み取り（persist migration で使用）
const decryptData = (storedData: string): PortfolioExport | null => {
  // まずプレーンJSONとしてパースを試行（v2フォーマット）
  try {
    const data = JSON.parse(storedData);
    if (data && typeof data === 'object') return data;
  } catch { /* v1フォーマット（Base64）の可能性 — フォールバック */ }

  // 旧フォーマット: Base64 + encodeURIComponent
  try {
    const jsonString = decodeURIComponent(atob(storedData));
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') throw new Error('無効なデータ形式です');
    return data;
  } catch {
    // 旧フォーマット: Base64のみ（encodeURIComponent なし）
    try {
      const jsonString = atob(storedData);
      return JSON.parse(jsonString);
    } catch (fallbackError) {
      logger.error('デシリアライズに失敗しました', fallbackError);
      return null;
    }
  }
};

// ─── Zustand persist Storage Adapter ─────────────────────────────────────────
// 旧 Base64/プレーンJSON フォーマット → Zustand persist フォーマットへのマイグレーション対応
const portfolioPersistStorage = {
  getItem: (name: string): string | null => {
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      // Zustand persist フォーマット { state: ..., version: ... } かチェック
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'state' in parsed) return raw;
      } catch { /* fall through to old format handling */ }
      // 旧フォーマット（プレーンJSON or Base64）→ persist フォーマットにラップ
      const oldData = decryptData(raw);
      if (!oldData) return null;
      return JSON.stringify({ state: oldData, version: 0 });
    } catch { return null; }
  },
  setItem: (name: string, value: string): void => localStorage.setItem(name, value),
  removeItem: (name: string): void => localStorage.removeItem(name),
};

interface PortfolioState {
  // --- State ---
  initialized: boolean;
  baseCurrency: string;
  exchangeRate: ExchangeRate;
  lastUpdated: string | null;
  currentAssets: CurrentAsset[];
  targetPortfolio: TargetAllocation[];
  additionalBudget: { amount: number; currency: string };
  aiPromptTemplate: string | null;
  dataSource: string;
  lastSyncTime: string | null;
  currentUser: UserData | null;
  serverVersion: number | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'conflict';
  lastServerSync: string | null;

  // --- Actions ---
  addTicker: (ticker: string) => Promise<OperationResult>;
  removeTicker: (id: string) => void;
  updateHoldings: (id: string, holdings: number | string) => void;
  updatePurchasePrice: (id: string, price: number) => void;
  updateTargetAllocation: (id: string, percentage: number | string) => void;
  updateAnnualFee: (id: string, fee: number | string) => void;
  updateDividendInfo: (id: string, dividendYield: number | string, hasDividend?: boolean, frequency?: string) => void;
  setBaseCurrency: (currency: string) => void;
  toggleCurrency: () => void;
  setAdditionalBudget: (amount: number | string, currency?: string) => void;
  setAiPromptTemplate: (template: string | null) => void;
  updateAiPromptTemplate: (template: string | null) => void;
  updateExchangeRate: (forceUpdate?: boolean) => Promise<void>;
  resetExchangeRate: () => void;
  refreshMarketPrices: () => Promise<OperationResult>;
  calculateSimulation: () => SimulationItem[];
  executePurchase: (tickerId: string, units: number | string) => void;
  executeBatchPurchase: (simulationResult: SimulationItem[]) => void;
  importData: (data: unknown) => OperationResult;
  exportData: () => PortfolioExport;
  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string, exchangeRateObj?: ExchangeRate) => number;
  calculatePurchaseShares: (purchaseAmount: number, price: number) => number;
  validateAssetTypes: (assets: CurrentAsset[]) => ValidateResult;

  // Cloud Sync
  saveToGoogleDrive: (userData?: UserData) => Promise<SyncResult>;
  loadFromGoogleDrive: (userData?: UserData) => Promise<SyncResult>;
  handleAuthStateChange: (isAuthenticated: boolean, user: UserData | null) => void;

  // Local Storage (legacy Base64 format)
  saveToLocalStorage: () => boolean;
  loadFromLocalStorage: () => PortfolioExport | null;
  clearLocalStorage: () => boolean;
  initializeData: () => void;

  // Server Sync
  syncToServer: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  resolveConflict: (strategy: 'server' | 'local') => Promise<void>;
}

// Helper: UI notification
const notify = (message: string, type: string = 'info') => useUIStore.getState().addNotification(message, type);

export const usePortfolioStore = create<PortfolioState>()(
  persist(
  (set, get) => ({
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
  validateAssetTypes: (assets: CurrentAsset[]) => {
    if (!Array.isArray(assets) || assets.length === 0) {
      return { updatedAssets: [], changes: { fundType: 0, fees: 0, dividends: 0, currency: 0 } };
    }

    let fundTypeChanges = 0;
    let feeChanges = 0;
    let dividendChanges = 0;
    let currencyChanges = 0;
    const fundTypeChangeDetails: Array<{ ticker: string; name: string; oldType: string; newType: string }> = [];
    const feeChangeDetails: Array<{ ticker: string; name: string; oldFee: number; newFee: number }> = [];

    // ティッカーパターンから通貨を推定するヘルパー関数
    const guessCurrencyFromTicker = (t: string): string => {
      // 日本の投資信託（8桁数字 or 7桁+英字）
      if (/^\d{7,8}[A-Z]?$/i.test(t)) return 'JPY';
      // 日本株（4桁.T or 4桁数字のみ）
      if (/^\d{4}(\.T)?$/.test(t)) return 'JPY';
      // 英字1-5文字 = 米国市場
      if (/^[A-Z]{1,5}$/.test(t)) return 'USD';
      return 'JPY';
    };

    const validatedAssets = assets.map((asset: CurrentAsset) => {
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
      const dividendIsWrong = Math.abs((asset.dividendYield ?? 0) - dividendInfo.yield) > 0.001 ||
        asset.hasDividend !== dividendInfo.hasDividend ||
        asset.dividendFrequency !== dividendInfo.dividendFrequency;

      // 通貨の検証
      const correctCurrency = guessCurrencyFromTicker(ticker);
      const currencyIsWrong = !asset.currency || asset.currency !== correctCurrency;

      if (fundTypeIsWrong) { fundTypeChanges++; fundTypeChangeDetails.push({ ticker, name: asset.name, oldType: asset.fundType, newType: correctFundType }); }
      if (feeIsWrong) { feeChanges++; feeChangeDetails.push({ ticker, name: asset.name, oldFee: asset.annualFee, newFee: correctFee }); }
      if (dividendIsWrong) dividendChanges++;
      if (currencyIsWrong) currencyChanges++;

      const nameIsWrong = name !== asset.name;
      if (fundTypeIsWrong || feeIsWrong || dividendIsWrong || nameIsWrong || currencyIsWrong) {
        return {
          ...asset, name, fundType: correctFundType, isStock: correctIsStock,
          annualFee: correctFee, feeSource, feeIsEstimated,
          dividendYield: dividendInfo.yield, hasDividend: dividendInfo.hasDividend,
          dividendFrequency: dividendInfo.dividendFrequency, dividendIsEstimated: dividendInfo.isEstimated,
          currency: correctCurrency,
        };
      }
      return asset;
    });

    return {
      updatedAssets: validatedAssets,
      changes: { fundType: fundTypeChanges, fees: feeChanges, dividends: dividendChanges, currency: currencyChanges, fundTypeDetails: fundTypeChangeDetails, feeDetails: feeChangeDetails }
    };
  },

  // --- Notifications helper ---
  addTicker: async (ticker: string) => {
    const { targetPortfolio, currentAssets } = get();

    // プラン制限チェック
    const maxHoldings = getIsPremiumFromCache() ? MAX_HOLDINGS_STANDARD : MAX_HOLDINGS_FREE;
    const currentCount = new Set(
      [...targetPortfolio, ...currentAssets]
        .map(item => item.ticker?.toLowerCase())
        .filter(Boolean)
    ).size;
    if (currentCount >= maxHoldings) {
      notify(
        `Freeプランでは最大${MAX_HOLDINGS_FREE}銘柄まで登録できます。Standardプランにアップグレードすると無制限に追加できます。`,
        'warning'
      );
      return { success: false, message: '銘柄数の上限に達しています', limitReached: true };
    }

    const exists = [...targetPortfolio, ...currentAssets].some(
      item => item.ticker?.toLowerCase() === ticker.toLowerCase()
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
      return { success: true, message: '銘柄を追加しました' };
    } catch (error: unknown) {
      notify(`銘柄「${ticker}」の追加に失敗しました: ${getErrorMessage(error)}`, 'error');
      return { success: false, message: '銘柄の追加に失敗しました' };
    } finally {
      useUIStore.getState().setLoading(false);
    }
  },

  removeTicker: (id: string) => {
    set(state => ({
      targetPortfolio: state.targetPortfolio.filter(item => item.id !== id),
      currentAssets: state.currentAssets.filter(item => item.id !== id)
    }));
  },

  updateHoldings: (id: string, holdings: number | string) => {
    set(state => ({
      currentAssets: state.currentAssets.map(item =>
        item.id === id ? { ...item, holdings: parseFloat(parseFloat(String(holdings)).toFixed(4)) || 0 } : item
      )
    }));
  },

  updatePurchasePrice: (id: string, price: number) => {
    set(state => ({
      currentAssets: state.currentAssets.map(item =>
        item.id === id ? { ...item, purchasePrice: price } : item
      )
    }));
  },

  updateTargetAllocation: (id: string, percentage: number | string) => {
    set(state => ({
      targetPortfolio: state.targetPortfolio.map(item =>
        item.id === id ? { ...item, targetPercentage: parseFloat(String(percentage)) } : item
      )
    }));
  },

  updateAnnualFee: (id: string, fee: number | string) => {
    set(state => ({
      currentAssets: state.currentAssets.map(item => {
        if (item.id !== id) return item;
        if (item.isStock || item.fundType === FUND_TYPES.STOCK) {
          return { ...item, annualFee: 0, feeSource: '個別株', feeIsEstimated: false };
        }
        return { ...item, annualFee: parseFloat(parseFloat(String(fee)).toFixed(2)) || 0, feeSource: 'ユーザー設定', feeIsEstimated: false };
      })
    }));
  },

  updateDividendInfo: (id: string, dividendYield: number | string, hasDividend: boolean = true, frequency: string = 'quarterly') => {
    set(state => ({
      currentAssets: state.currentAssets.map(item =>
        item.id === id ? {
          ...item,
          dividendYield: parseFloat(parseFloat(String(dividendYield)).toFixed(2)) || 0,
          hasDividend, dividendFrequency: frequency, dividendIsEstimated: false
        } : item
      )
    }));
  },

  setBaseCurrency: (currency: string) => {
    set({ baseCurrency: currency });
  },

  toggleCurrency: () => {
    set(state => ({ baseCurrency: state.baseCurrency === 'JPY' ? 'USD' : 'JPY' }));
  },

  setAdditionalBudget: (amount: number | string, currency?: string) => {
    set({ additionalBudget: { amount: parseFloat(String(amount)) || 0, currency: currency || 'JPY' } });
  },

  setAiPromptTemplate: (template: string | null) => set({ aiPromptTemplate: template }),

  updateAiPromptTemplate: (template: string | null) => {
    set({ aiPromptTemplate: template });
  },

  convertCurrency: (amount: number, fromCurrency: string, toCurrency: string, exchangeRateObj?: ExchangeRate): number => {
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
      } else if (result.rate && typeof result.rate === 'number' && result.rate > 0) {
        // API失敗でもフォールバックレートが返されている場合はキャッシュして使用
        const rateData = { rate: result.rate, source: result.source || 'Fallback', lastUpdated: result.lastUpdated || new Date().toISOString() };
        set({ exchangeRate: rateData });
        // フォールバック値は短めにキャッシュ（1時間）
        localStorage.setItem(cacheKey, JSON.stringify({ data: rateData, timestamp: new Date().toISOString() }));
        notify(`為替レートの取得に失敗しました。フォールバック値（${result.rate}円/ドル）を使用します。`, 'warning');
        // 1時間後に再試行（フォールバック値をキャッシュしているので頻繁なリトライは不要）
        setTimeout(() => get().updateExchangeRate(true), 60 * 60 * 1000);
      } else if (result.error) {
        notify(`為替レートの取得に失敗しました。デフォルト値（${currentRate.rate}円/ドル）を使用します。5分後に再試行します。`, 'warning');
        setTimeout(() => get().updateExchangeRate(), 5 * 60 * 1000);
      }
    } catch (error: unknown) {
      notify(`為替レートの更新中にエラーが発生しました。デフォルト値（${currentRate.rate}円/ドル）を使用します。`, 'error');
    }
  },

  resetExchangeRate: () => {
    ['JPY', 'USD'].forEach(c => localStorage.removeItem(`exchangeRate_${c}`));
    const defaultRate = { rate: 150.0, lastUpdated: new Date().toISOString(), isDefault: true, source: 'manual-reset' };
    set({ exchangeRate: defaultRate });
    notify('為替レートをデフォルト値（150円/ドル）にリセットしました', 'info');
    setTimeout(() => get().updateExchangeRate(true), 1000);
  },

  // --- Market Data Refresh ---
  refreshMarketPrices: async () => {
    const refreshInternal = async () => {
      useUIStore.getState().setLoading(true);
      try {
        const { currentAssets, validateAssetTypes } = get();
        let errorCount = 0;
        let fallbackCount = 0;

        const tickers = currentAssets.map(a => a.ticker);
        const batchData = await fetchMultipleStocks(tickers);

        // degraded フラグの検出（予算超過時のキャッシュデータ）
        if (batchData?.degraded) {
          notify('キャッシュデータを表示中。最新データではない可能性があります。', 'warning');
        }

        const updatedAssets = await Promise.all(
          currentAssets.map(async (asset: CurrentAsset) => {
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

        // 認証済みの場合、debounced サーバー同期
        if (getAuthToken()) {
          setTimeout(() => get().syncToServer(), 5000);
        }
        return { success: true, message: '市場データを更新しました' };
      } catch (error: unknown) {
        notify(`市場データの更新に失敗しました: ${getErrorMessage(error)}`, 'error');
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

    const totalCurrentAssets = currentAssets.reduce((sum: number, asset: CurrentAsset) => {
      let val = asset.price * asset.holdings;
      if (asset.currency !== baseCurrency) val = convertCurrency(val, asset.currency, baseCurrency);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    let budgetInBase = additionalBudget.amount;
    if (additionalBudget.currency !== baseCurrency) {
      budgetInBase = convertCurrency(additionalBudget.amount, additionalBudget.currency, baseCurrency);
    }
    const totalWithBudget = totalCurrentAssets + budgetInBase;

    const results = targetPortfolio.map((target: TargetAllocation) => {
      const asset = currentAssets.find(a => a.ticker === target.ticker);
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
    }).filter((r): r is NonNullable<typeof r> => r !== null) as SimulationItem[];

    return results.sort((a: SimulationItem, b: SimulationItem) => {
      const aBase = a.currency !== baseCurrency ? convertCurrency(a.purchaseAmount, a.currency, baseCurrency) : a.purchaseAmount;
      const bBase = b.currency !== baseCurrency ? convertCurrency(b.purchaseAmount, b.currency, baseCurrency) : b.purchaseAmount;
      return bBase - aBase;
    });
  },

  executePurchase: (tickerId: string, units: number | string) => {
    set(state => ({
      currentAssets: state.currentAssets.map(a =>
        a.id === tickerId ? { ...a, holdings: parseFloat((a.holdings + parseFloat(String(units))).toFixed(4)) } : a
      )
    }));
  },

  executeBatchPurchase: (simulationResult: SimulationItem[]) => {
    simulationResult.forEach((r: SimulationItem) => {
      if (r.purchaseShares > 0) get().executePurchase(r.id, r.purchaseShares);
    });
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
        // プラン制限チェック
        const maxHoldings = getIsPremiumFromCache() ? MAX_HOLDINGS_STANDARD : MAX_HOLDINGS_FREE;
        if (data.currentAssets.length > maxHoldings) {
          notify(
            `Freeプランでは最大${MAX_HOLDINGS_FREE}銘柄まで登録できます。インポートデータの先頭${MAX_HOLDINGS_FREE}銘柄のみ取り込みます。`,
            'warning'
          );
          data.currentAssets = data.currentAssets.slice(0, maxHoldings);
          if (Array.isArray(data.targetPortfolio)) {
            const importedTickers = new Set(data.currentAssets.map((a: any) => a.ticker?.toLowerCase()));
            data.targetPortfolio = data.targetPortfolio.filter(
              (t: any) => importedTickers.has(t.ticker?.toLowerCase())
            );
          }
        }

        const { updatedAssets, changes } = get().validateAssetTypes(data.currentAssets);
        updates.currentAssets = updatedAssets;
        if (changes.fundType > 0) notify(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
        if (changes.fees > 0) notify(`${changes.fees}件の銘柄で手数料情報を修正しました`, 'info');
        if ((changes.currency ?? 0) > 0) notify(`${changes.currency}件の銘柄で通貨情報を修正しました`, 'info');
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
      trackEvent(AnalyticsEvents.CSV_IMPORT, { assetCount: (updates as any).currentAssets?.length || 0 });
      return { success: true, message: 'データをインポートしました' };
    } catch (error: unknown) {
      notify(`データのインポートに失敗しました: ${getErrorMessage(error)}`, 'error');
      return { success: false, message: `データのインポートに失敗しました: ${getErrorMessage(error)}` };
    }
  },

  exportData: () => {
    const { baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget, aiPromptTemplate } = get();
    return { baseCurrency, exchangeRate, lastUpdated, currentAssets, targetPortfolio, additionalBudget, aiPromptTemplate };
  },

  // --- Local Storage (persist middleware が自動管理) ---
  // saveToLocalStorage: persist middleware が state 変更を自動保存するため no-op
  saveToLocalStorage: () => true,

  // loadFromLocalStorage: 現在の store state から PortfolioExport 形式で返却
  loadFromLocalStorage: () => {
    try {
      const state = get();
      const hasData = state.currentAssets.length > 0 || state.targetPortfolio.length > 0;
      if (!hasData) return null;
      return {
        baseCurrency: state.baseCurrency,
        exchangeRate: state.exchangeRate,
        lastUpdated: state.lastUpdated,
        currentAssets: state.currentAssets,
        targetPortfolio: state.targetPortfolio,
        additionalBudget: state.additionalBudget,
        aiPromptTemplate: state.aiPromptTemplate,
      };
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
      notify(`クラウド保存に失敗しました: ${result.message ?? ''}`, 'error');
      return { success: false, message: result.message ?? 'クラウド保存に失敗しました' };
    } catch (error: unknown) {
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
        return { success: true, message: 'クラウドからデータを読み込みました' };
      } else {
        const message = result.message || 'クラウドにデータがありません';
        notify(`${message}。現在のデータをクラウドに保存しますか？`, 'info');
        return { success: false, message, suggestSaving: true };
      }
    } catch (error: unknown) {
      notify(`クラウドからの読み込みに失敗しました: ${getErrorMessage(error)}`, 'error');
      return { success: false, message: `クラウド読み込みに失敗しました: ${getErrorMessage(error)}` };
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
      // persist middleware が既に localStorage からデータを復元済み
      // state.currentAssets / targetPortfolio 等は既に正しい値を持つ
      const hasData = state.currentAssets.length > 0
        || state.targetPortfolio.length > 0
        || state.baseCurrency !== 'JPY'
        || !!state.aiPromptTemplate;

      if (hasData) {
        const updates: any = {};

        // exchangeRate 整合性チェック（旧フォーマットからのマイグレーション後の保険）
        if (!state.exchangeRate?.rate || typeof state.exchangeRate.rate !== 'number') {
          updates.exchangeRate = { rate: 150.0, lastUpdated: new Date().toISOString(), isDefault: true, source: 'fallback' };
        }

        // レガシー additionalBudget フォーマット対応（数値 → オブジェクト）
        if (typeof (state.additionalBudget as unknown) === 'number') {
          updates.additionalBudget = { amount: state.additionalBudget as unknown as number, currency: state.baseCurrency || 'JPY' };
        }

        // アセット種別バリデーション
        if (state.currentAssets.length > 0) {
          const { updatedAssets, changes } = get().validateAssetTypes(state.currentAssets);
          if (changes.fundType > 0 || changes.fees > 0 || changes.dividends > 0) {
            updates.currentAssets = updatedAssets;
            if (changes.fundType > 0) notify(`${changes.fundType}件の銘柄で種別情報を修正しました`, 'info');
            if (changes.fees > 0) notify(`${changes.fees}件の銘柄で手数料情報を修正しました`, 'info');
            if (changes.dividends > 0) notify(`${changes.dividends}件の銘柄で配当情報を修正しました`, 'info');
          }
        }

        set({ ...updates, initialized: true });
        notify('前回のデータを読み込みました', 'info');
      } else {
        set({ initialized: true });
      }

      setTimeout(() => get().updateExchangeRate(), 500);
    } catch (error: unknown) {
      notify(`データの初期化中にエラーが発生しました: ${getErrorMessage(error)}`, 'error');
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
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'VERSION_CONFLICT') {
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
        notify('サーバーからデータを同期しました', 'success');
      } else {
        set({
          serverVersion: serverData.version,
          lastServerSync: serverData.updatedAt,
          syncStatus: 'idle'
        });
      }
      trackEvent(AnalyticsEvents.PORTFOLIO_SYNC, { direction: 'from_server' });
    } catch (error: unknown) {
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
  }),
  {
    name: 'portfolioData',
    storage: createJSONStorage(() => portfolioPersistStorage),
    partialize: (state) => ({
      baseCurrency: state.baseCurrency,
      exchangeRate: state.exchangeRate,
      lastUpdated: state.lastUpdated,
      currentAssets: state.currentAssets,
      targetPortfolio: state.targetPortfolio,
      additionalBudget: state.additionalBudget,
      aiPromptTemplate: state.aiPromptTemplate,
    }),
    version: 1,
    migrate: (persisted: unknown, version: number): unknown => {
      const data = (persisted ?? {}) as Partial<PortfolioExport>;
      if ((version ?? 0) < 1) {
        // v0 → v1: exchangeRate 整合性チェック（旧フォーマットからのマイグレーション）
        if (!data.exchangeRate?.rate || typeof data.exchangeRate.rate !== 'number') {
          data.exchangeRate = { rate: 150.0, lastUpdated: new Date().toISOString(), isDefault: true, source: 'fallback' };
        }
      }
      return data;
    },
  }
));

// --- Computed selectors ---
export const selectTotalAssets = (state: PortfolioState) => {
  return state.currentAssets.reduce((sum: number, asset: CurrentAsset) => {
    let val = asset.price * asset.holdings;
    if (asset.currency !== state.baseCurrency) {
      if (state.baseCurrency === 'JPY' && asset.currency === 'USD') val *= state.exchangeRate.rate;
      else if (state.baseCurrency === 'USD' && asset.currency === 'JPY') val /= state.exchangeRate.rate;
    }
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
};

export const selectAnnualFees = (state: PortfolioState) => {
  return state.currentAssets.reduce((sum: number, asset: CurrentAsset) => {
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
  return state.currentAssets.reduce((sum: number, asset: CurrentAsset) => {
    if (!asset.hasDividend) return sum;
    let val = asset.price * asset.holdings;
    if (asset.currency !== state.baseCurrency) {
      if (state.baseCurrency === 'JPY' && asset.currency === 'USD') val *= state.exchangeRate.rate;
      else if (state.baseCurrency === 'USD' && asset.currency === 'JPY') val /= state.exchangeRate.rate;
    }
    return sum + (val * (asset.dividendYield || 0) / 100);
  }, 0);
};
