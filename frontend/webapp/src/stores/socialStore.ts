/**
 * SocialStore — ソーシャルポートフォリオ状態管理
 *
 * Zustand store でポートフォリオ共有 CRUD、ピア比較、
 * プラン制限チェックを管理する。
 *
 * @file src/stores/socialStore.ts
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createShareApi,
  deleteShareApi,
  getUserSharesApi,
  getPeerComparisonApi,
} from '../services/socialService';
import type {
  SharedPortfolio,
  PeerComparison,
} from '../types/social.types';
import { SOCIAL_LIMITS } from '../types/social.types';
import { useSubscriptionStore } from './subscriptionStore';
import { useUIStore } from './uiStore';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';
import { getErrorMessage } from '../utils/errorUtils';

// ─── Types ───────────────────────────────────────────

interface CreateShareInput {
  displayName: string;
  ageGroup: string;
  allocationSnapshot: { category: string; percentage: number }[];
  portfolioScore: number;
  assetCount: number;
}

interface SocialState {
  shares: SharedPortfolio[];
  peerComparison: PeerComparison | null;
  loading: boolean;
  peerLoading: boolean;
  error: string | null;

  // Actions
  createShare: (input: CreateShareInput) => Promise<SharedPortfolio | null>;
  deleteShare: (shareId: string) => Promise<boolean>;
  fetchUserShares: () => Promise<void>;
  fetchPeerComparison: (ageGroup: string) => Promise<void>;

  // Computed
  getShareCount: () => number;
  getMaxShares: () => number;
  canCreateShare: () => boolean;
  getTtlDays: () => number;
}

// ─── Store ───────────────────────────────────────────

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      shares: [],
      peerComparison: null,
      loading: false,
      peerLoading: false,
      error: null,

      createShare: async (input: CreateShareInput): Promise<SharedPortfolio | null> => {
        // プラン制限チェック
        if (!get().canCreateShare()) {
          const maxShares = get().getMaxShares();
          const uiStore = useUIStore.getState();
          uiStore.addNotification(
            maxShares === SOCIAL_LIMITS.FREE.maxShares
              ? 'Standardプランにアップグレードすると最大5件の共有が可能です'
              : '共有数の上限に達しています',
            'warning'
          );
          return null;
        }

        set({ loading: true, error: null });

        try {
          const share = await createShareApi(input);
          set((state) => ({
            shares: [...state.shares, share],
            loading: false,
          }));
          trackEvent(AnalyticsEvents.SHARE_CREATE, { ageGroup: input.ageGroup });
          return share;
        } catch (error: unknown) {
          const message = getErrorMessage(error) || '共有の作成に失敗しました';
          set({ loading: false, error: message });
          const uiStore = useUIStore.getState();
          uiStore.addNotification(message, 'error');
          return null;
        }
      },

      deleteShare: async (shareId: string): Promise<boolean> => {
        set({ loading: true, error: null });

        try {
          await deleteShareApi(shareId);
          set((state) => ({
            shares: state.shares.filter((s) => s.shareId !== shareId),
            loading: false,
          }));
          trackEvent(AnalyticsEvents.SHARE_DELETE, { shareId });
          const uiStore = useUIStore.getState();
          uiStore.addNotification('共有を削除しました', 'success');
          return true;
        } catch (error: unknown) {
          const message = getErrorMessage(error) || '共有の削除に失敗しました';
          set({ loading: false, error: message });
          const uiStore = useUIStore.getState();
          uiStore.addNotification(message, 'error');
          return false;
        }
      },

      fetchUserShares: async () => {
        set({ loading: true, error: null });

        try {
          const result = await getUserSharesApi();
          set({
            shares: result.shares,
            loading: false,
          });
        } catch (error: unknown) {
          set({ loading: false, error: getErrorMessage(error) || '共有一覧の取得に失敗しました' });
        }
      },

      fetchPeerComparison: async (ageGroup: string) => {
        set({ peerLoading: true, error: null });

        try {
          const comparison = await getPeerComparisonApi(ageGroup);
          set({
            peerComparison: comparison,
            peerLoading: false,
          });
          trackEvent(AnalyticsEvents.PEER_COMPARISON_VIEW, { ageGroup });
        } catch (error: unknown) {
          set({ peerLoading: false, error: getErrorMessage(error) || 'ピア比較の取得に失敗しました' });
        }
      },

      getShareCount: () => get().shares.length,

      getMaxShares: () => {
        const sub = useSubscriptionStore.getState();
        return sub.isPremium()
          ? SOCIAL_LIMITS.STANDARD.maxShares
          : SOCIAL_LIMITS.FREE.maxShares;
      },

      canCreateShare: () => {
        return get().shares.length < get().getMaxShares();
      },

      getTtlDays: () => {
        const sub = useSubscriptionStore.getState();
        return sub.isPremium()
          ? SOCIAL_LIMITS.STANDARD.ttlDays
          : SOCIAL_LIMITS.FREE.ttlDays;
      },
    }),
    {
      name: 'pfwise-social',
      partialize: (state) => ({ shares: state.shares }),
    }
  )
);
