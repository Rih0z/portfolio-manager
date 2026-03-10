/**
 * ポートフォリオ関連の型定義
 */

export interface BaseAsset {
  id: string;
  ticker: string;
  name: string;
  price: number;
  holdings: number;
  currency: string;
  lastUpdated?: string;
  source?: string;
}

export interface Asset extends BaseAsset {
  fundType: string;
  annualFee: number;
  feeSource?: string;
  feeIsEstimated?: boolean;
  isStock?: boolean;
  isMutualFund?: boolean;
  hasDividend?: boolean;
  dividendYield?: number;
  dividendFrequency?: string;
  dividendIsEstimated?: boolean;
  purchasePrice?: number;
  purchaseDate?: string;
  /** 表示シンボル (tickerと同じ場合が多い) */
  symbol?: string;
  region?: string;
}

/** portfolioStore で管理する保有銘柄 */
export type CurrentAsset = Asset;

export interface TargetAllocation {
  id: string;
  ticker: string;
  name: string;
  targetPercentage: number;
}

/** 認証済みユーザー情報 */
export interface UserData {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/** 操作結果の共通型 */
export interface OperationResult {
  success: boolean;
  message: string;
  limitReached?: boolean;
}

/** クラウド同期結果 */
export interface SyncResult extends OperationResult {
  suggestSaving?: boolean;
}

/** addTicker の戻り値 */
export type AddTickerResult = OperationResult;

/** importData の戻り値 */
export type ImportDataResult = OperationResult;

export interface ExchangeRate {
  rate: number;
  source: string;
  lastUpdated: string;
  isDefault?: boolean;
  isStale?: boolean;
}

export interface AdditionalBudget {
  amount: number;
  currency: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface SimulationPurchase {
  ticker: string;
  shares: number;
  amount: number;
  percentage: number;
}

export interface SimulationAllocation {
  ticker: string;
  newPercentage: number;
  targetPercentage: number;
  difference: number;
}

export interface SimulationResult {
  purchases: SimulationPurchase[];
  totalPurchaseAmount: number;
  remainingBudget: number;
  newAllocations: SimulationAllocation[];
  projectedTotalAssets: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ValidationChanges {
  fundType: number;
  fees: number;
  dividends: number;
  currency?: number;
  fundTypeDetails?: { ticker: string; name: string; oldType: string; newType: string }[];
  feeDetails?: { ticker: string; name: string; oldFee: number; newFee: number }[];
}

export interface ValidateResult {
  updatedAssets: CurrentAsset[];
  changes: ValidationChanges;
}

/** calculateSimulation の各行結果 */
export interface SimulationItem {
  id: string;
  ticker: string;
  name: string;
  currentAllocation: number;
  targetAllocation: number;
  diff: number;
  currentValue: number;
  purchaseAmount: number;
  price: number;
  purchaseShares: number;
  currency: string;
  isMutualFund?: boolean;
  source?: string;
}

/** ポートフォリオエクスポートデータ */
export interface PortfolioExport {
  baseCurrency: string;
  exchangeRate: ExchangeRate;
  lastUpdated: string | null;
  currentAssets: CurrentAsset[];
  targetPortfolio: TargetAllocation[];
  additionalBudget: AdditionalBudget;
  aiPromptTemplate: string | null;
  version?: string;
  timestamp?: string;
}

export interface ApiConfig {
  marketDataApiUrl: string;
  apiStage: string;
  googleClientId: string;
  features: {
    useProxy: boolean;
    useMockApi: boolean;
    useDirectApi: boolean;
  };
}
