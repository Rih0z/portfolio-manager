/**
 * サブスクリプション管理フック（TanStack Query）
 *
 * subscriptionService の各関数をラップし、
 * ステータス取得・Checkout作成・Portal作成を提供する。
 * コンポーネントからは useIsPremium / useCanUseFeature で
 * プラン状態に依存するロジックを参照する。
 *
 * 非React文脈（Zustandストア間クロスアクセス等）では
 * getIsPremiumFromCache() を使い queryClient キャッシュから直接読み取る。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSubscriptionStatus,
  createCheckoutSession,
  createPortalSession,
} from '../../services/subscriptionService';
import type { SubscriptionStatus } from '../../services/subscriptionService';
import { queryClient } from '../../providers/QueryProvider';

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

// ─── 便利フック ─────────────────────────────────────────

/** Reactコンポーネント用: プレミアムプラン判定 */
export function useIsPremium(): boolean {
  const { data } = useSubscriptionStatus();
  return data?.planType === 'standard';
}

/** Reactコンポーネント用: 機能利用可否判定 */
const FREE_FEATURE_LIMITS: Record<string, boolean> = {
  unlimitedHoldings: false,
  realtimeData: false,
  unlimitedSimulation: false,
  unlimitedAiPrompt: false,
  fullPfScore: false,
  jsonExport: false,
  pdfExport: false,
  autoBackup: false,
  adFree: false,
  goalTracking: true, // Free: 1ゴールまで（制限はgoalStoreで管理）
};

export function useCanUseFeature(feature: string): boolean {
  const isPremium = useIsPremium();
  if (isPremium) return true;
  return FREE_FEATURE_LIMITS[feature] ?? true;
}

// ─── 非Reactコンテキスト用ヘルパー ──────────────────────

/**
 * Zustandストア等の非React文脈から queryClient キャッシュを直接参照し
 * プレミアム判定を行う。キャッシュ未ロード時は false（Free相当）を返す。
 */
export function getIsPremiumFromCache(): boolean {
  const data = queryClient.getQueryData<SubscriptionStatus>(
    subscriptionKeys.status(),
  );
  return data?.planType === 'standard';
}
