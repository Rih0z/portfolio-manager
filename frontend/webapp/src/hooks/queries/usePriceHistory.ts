/**
 * 価格履歴取得フック（TanStack Query）
 *
 * priceHistoryService.fetchPriceHistory をラップし、
 * 個別ティッカーの価格履歴キャッシュを提供する。
 */
import { useQuery, useQueries } from '@tanstack/react-query';
import {
  fetchPriceHistory,
  type PriceHistoryResponse,
  type PricePeriod,
} from '../../services/priceHistoryService';

export const priceHistoryKeys = {
  all: ['priceHistory'] as const,
  ticker: (ticker: string, period: PricePeriod) =>
    ['priceHistory', ticker, period] as const,
};

export function usePriceHistory(
  ticker: string,
  period: PricePeriod = '1m',
  options?: { enabled?: boolean }
) {
  return useQuery<PriceHistoryResponse | null>({
    queryKey: priceHistoryKeys.ticker(ticker, period),
    queryFn: () => fetchPriceHistory(ticker, period),
    enabled: !!ticker && (options?.enabled !== false),
    staleTime: 30 * 60 * 1000,       // 30分
    gcTime: 60 * 60 * 1000,          // 1時間
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

export function usePriceHistories(
  tickers: string[],
  period: PricePeriod = '1m',
  options?: { enabled?: boolean }
) {
  return useQueries({
    queries: tickers.map((ticker) => ({
      queryKey: priceHistoryKeys.ticker(ticker, period),
      queryFn: () => fetchPriceHistory(ticker, period),
      enabled: !!ticker && (options?.enabled !== false),
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });
}
