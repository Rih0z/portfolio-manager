/**
 * SubscriptionStore — サブスクリプション状態管理
 *
 * Zustand store でプランタイプ、使用量制限、Stripe 操作を管理。
 * authStore と連携し、JWT の planType を初期値として使用する。
 *
 * @file src/stores/subscriptionStore.ts
 */
import { create } from 'zustand';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  type SubscriptionStatus,
} from '../services/subscriptionService';

interface SubscriptionState {
  planType: 'free' | 'standard';
  subscription: SubscriptionStatus['subscription'];
  limits: Record<string, any>;
  loading: boolean;
  error: string | null;

  // Computed
  isPremium: () => boolean;
  canUseFeature: (feature: string) => boolean;

  // Actions
  fetchStatus: () => Promise<void>;
  startCheckout: (plan?: 'monthly' | 'annual') => Promise<void>;
  openPortal: () => Promise<void>;
  setPlanType: (planType: 'free' | 'standard') => void;
}

export const useSubscriptionStore = create<SubscriptionState>()((set, get) => ({
  planType: 'free',
  subscription: null,
  limits: {},
  loading: false,
  error: null,

  isPremium: () => get().planType === 'standard',

  canUseFeature: (feature: string) => {
    const { planType, limits } = get();
    if (planType === 'standard') return true;

    // Free プランの制限チェック
    const featureLimits: Record<string, boolean> = {
      unlimitedHoldings: false,
      realtimeData: false,
      unlimitedSimulation: false,
      unlimitedAiPrompt: false,
      fullPfScore: false,
      jsonExport: false,
      pdfExport: false,
      autoBackup: false,
      adFree: false,
    };

    return featureLimits[feature] ?? true;
  },

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const status = await getSubscriptionStatus();
      set({
        planType: status.planType,
        subscription: status.subscription,
        limits: status.limits,
        loading: false,
      });
    } catch {
      // バックエンド未デプロイ時はサイレントフェイル（Free プランをデフォルト維持）
      set({ loading: false });
    }
  },

  startCheckout: async (plan = 'monthly') => {
    set({ loading: true, error: null });
    try {
      const { checkoutUrl } = await createCheckoutSession(plan);
      // Stripe Checkout ページにリダイレクト
      window.location.href = checkoutUrl;
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  openPortal: async () => {
    set({ loading: true, error: null });
    try {
      const { portalUrl } = await createPortalSession();
      window.location.href = portalUrl;
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setPlanType: (planType) => set({ planType }),
}));
