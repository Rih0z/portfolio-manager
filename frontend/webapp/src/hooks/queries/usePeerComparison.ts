/**
 * ピア比較取得フック（TanStack Query）
 *
 * socialService.getPeerComparisonApi をラップし、
 * 年齢グループ別のピア比較データを提供する。
 */
import { useQuery } from '@tanstack/react-query';
import { getPeerComparisonApi } from '../../services/socialService';

export const peerComparisonKeys = {
  all: ['peerComparison'] as const,
  byAge: (ageGroup: string) => ['peerComparison', ageGroup] as const,
};

export function usePeerComparison(
  ageGroup: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: peerComparisonKeys.byAge(ageGroup),
    queryFn: () => getPeerComparisonApi(ageGroup),
    enabled: !!ageGroup && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000,         // 10分
    gcTime: 30 * 60 * 1000,            // 30分
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}
