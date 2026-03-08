/**
 * 為替レート取得フック（TanStack Query）
 *
 * marketDataService.fetchExchangeRate をラップし、
 * キャッシュ・自動再取得・エラーハンドリングを提供する。
 */
import { useQuery } from '@tanstack/react-query';
import { fetchExchangeRate } from '../../services/marketDataService';

export interface ExchangeRateData {
  rate: number;
  source: string;
  lastUpdated: string;
  isDefault?: boolean;
  isStale?: boolean;
}

export const exchangeRateKeys = {
  all: ['exchangeRate'] as const,
  pair: (from: string, to: string) => ['exchangeRate', from, to] as const,
};

export function useExchangeRate(
  fromCurrency: string = 'USD',
  toCurrency: string = 'JPY',
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<ExchangeRateData>({
    queryKey: exchangeRateKeys.pair(fromCurrency, toCurrency),
    queryFn: async () => {
      const result = await fetchExchangeRate(fromCurrency, toCurrency);
      return {
        rate: result.rate,
        source: result.source,
        lastUpdated: result.lastUpdated,
        isDefault: result.isDefault,
        isStale: result.isStale,
      };
    },
    staleTime: 5 * 60 * 1000,       // 5分
    gcTime: 30 * 60 * 1000,          // 30分
    refetchOnWindowFocus: false,
    retry: 2,
    ...options,
  });
}
