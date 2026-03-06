import { fetchWithRetry } from '../utils/apiUtils';

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
    const result = await fetchWithRetry('api/price-history', { ticker, period });
    if (result?.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    console.warn(`Price history fetch failed for ${ticker}:`, error);
    return null;
  }
};

/**
 * 複数ティッカーの価格履歴を並列取得する
 */
export const fetchMultiplePriceHistories = async (
  tickers: string[],
  period: PricePeriod = '1m'
): Promise<Record<string, PriceHistoryResponse>> => {
  const results: Record<string, PriceHistoryResponse> = {};

  const promises = tickers.map(async (ticker) => {
    const data = await fetchPriceHistory(ticker, period);
    if (data) {
      results[ticker] = data;
    }
  });

  await Promise.all(promises);
  return results;
};
