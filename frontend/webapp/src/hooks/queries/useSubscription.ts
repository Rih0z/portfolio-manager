/**
 * サブスクリプション管理フック（TanStack Query）
 *
 * subscriptionService の各関数をラップし、
 * ステータス取得・Checkout作成・Portal作成を提供する。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSubscriptionStatus,
  createCheckoutSession,
  createPortalSession,
} from '../../services/subscriptionService';
import type { SubscriptionStatus } from '../../services/subscriptionService';

export const subscriptionKeys = {
  all: ['subscription'] as const,
  status: () => ['subscription', 'status'] as const,
};

export function useSubscriptionStatus(options?: { enabled?: boolean }) {
  return useQuery<SubscriptionStatus>({
    queryKey: subscriptionKeys.status(),
    queryFn: getSubscriptionStatus,
    staleTime: 10 * 60 * 1000,       // 10分
    gcTime: 30 * 60 * 1000,          // 30分
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plan: 'monthly' | 'annual' = 'monthly') =>
      createCheckoutSession(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

export function useCreatePortal() {
  return useMutation({
    mutationFn: createPortalSession,
  });
}
