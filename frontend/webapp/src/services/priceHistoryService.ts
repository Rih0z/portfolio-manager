import { authFetch } from '../utils/apiUtils';
import { getErrorMessage, getErrorStatus } from '../utils/errorUtils';
import logger from '../utils/logger';

export interface PricePoint {
  date: string;
  close: number;
  source: string;
}

export interface PriceChange {
  amount: number;
  percent: number;
}

export interface PriceHistoryResponse {
  ticker: string;
  currency: string | null;
  period: string;
  prices: PricePoint[];
  change: {
    dayOverDay: PriceChange | null;
    yearToDate: PriceChange | null;
  };
}

export type PricePeriod = '1w' | '1m' | '3m' | '6m' | '1y' | 'ytd';

/**
 * 単一ティッカーの価格履歴を取得する
 */
export const fetchPriceHistory = async (
  ticker: string,
  period: PricePeriod = '1m'
): Promise<PriceHistoryResponse | null> => {
  try {
    const result = await authFetch('api/price-history', 'get', { ticker, period });
    if (result?.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error: unknown) {
    if (getErrorStatus(error) !== 401) {
      logger.warn(`Price history fetch failed for ${ticker}:`, getErrorMessage(error));
    }
    return null;
  }
};

/**
 * 複数ティッカーの価格履歴を並列取得する（最大5並列）
 */
const MAX_CONCURRENCY = 5;

export const fetchMultiplePriceHistories = async (
  tickers: string[],
  period: PricePeriod = '1m'
): Promise<Record<string, PriceHistoryResponse>> => {
  const results: Record<string, PriceHistoryResponse> = {};

  // MAX_CONCURRENCY 個ずつバッチ処理
  for (let i = 0; i < tickers.length; i += MAX_CONCURRENCY) {
    const batch = tickers.slice(i, i + MAX_CONCURRENCY);
    const promises = batch.map(async (ticker) => {
      const data = await fetchPriceHistory(ticker, period);
      if (data) {
        results[ticker] = data;
      }
    });
    await Promise.all(promises);
  }

  return results;
};
