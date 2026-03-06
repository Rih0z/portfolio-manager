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
  lastUpdated: string;
  source: string;
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
}

export interface TargetAllocation {
  id: string;
  ticker: string;
  targetPercentage: number;
}

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
