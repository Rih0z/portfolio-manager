/**
 * リファラル管理フック（TanStack Query）
 *
 * referralService の各関数をラップし、
 * リファラルコード取得・統計・適用を提供する。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReferralCode,
  getReferralStats,
  applyReferralCode,
} from '../../services/referralService';

export const referralKeys = {
  all: ['referral'] as const,
  code: () => ['referral', 'code'] as const,
  stats: () => ['referral', 'stats'] as const,
};

export function useReferralCode(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: referralKeys.code(),
    queryFn: getReferralCode,
    staleTime: Infinity,                // コードは不変
    gcTime: 60 * 60 * 1000,            // 1時間
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

export function useReferralStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: referralKeys.stats(),
    queryFn: getReferralStats,
    staleTime: 5 * 60 * 1000,          // 5分
    gcTime: 15 * 60 * 1000,            // 15分
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

export function useApplyReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => applyReferralCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referralKeys.all });
    },
  });
}
