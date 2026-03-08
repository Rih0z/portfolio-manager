/**
 * 株価一括取得フック（TanStack Query）
 *
 * marketDataService.fetchMultipleStocks をラップし、
 * ティッカー配列に対するバッチ取得・キャッシュを提供する。
 */
import { useQuery } from '@tanstack/react-query';
import { fetchMultipleStocks } from '../../services/marketDataService';

export const stockPriceKeys = {
  all: ['stockPrices'] as const,
  batch: (tickers: string[]) => ['stockPrices', ...tickers.sort()] as const,
};

export interface StockPriceData {
  [ticker: string]: {
    price: number;
    source: string;
    lastUpdated: string;
    fundType?: string;
    annualFee?: number;
    feeSource?: string;
    feeIsEstimated?: boolean;
    region?: string;
    dividendYield?: number;
    hasDividend?: boolean;
    dividendFrequency?: string;
    dividendIsEstimated?: boolean;
  };
}

export function useStockPrices(
  tickers: string[],
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<StockPriceData>({
    queryKey: stockPriceKeys.batch(tickers),
    queryFn: async () => {
      if (tickers.length === 0) return {};
      const result = await fetchMultipleStocks(tickers);
      return result?.data || {};
    },
    enabled: tickers.length > 0 && (options?.enabled !== false),
    staleTime: 1 * 60 * 1000,        // 1分
    gcTime: 10 * 60 * 1000,          // 10分
    refetchOnWindowFocus: false,
    retry: 2,
    ...options,
  });
}
