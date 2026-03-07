/**
 * ReferralStore — リファラルプログラム状態管理
 *
 * Zustand store でリファラルコード、統計情報、適用状態を管理する。
 * persist middleware で sessionStorage に保存。
 *
 * @file src/stores/referralStore.ts
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getReferralCode as fetchReferralCodeApi,
  getReferralStats as fetchReferralStatsApi,
  applyReferralCode as applyReferralCodeApi,
} from '../services/referralService';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';
import type { ReferralCode, ReferralStats } from '../types/referral.types';

// ─── Types ───────────────────────────────────────────

interface ReferralState {
  // Data
  referralCode: ReferralCode | null;
  stats: ReferralStats | null;
  loading: boolean;
  applied: boolean;
  capturedCode: string | null;

  // Actions
  fetchCode: () => Promise<void>;
  fetchStats: () => Promise<void>;
  applyCode: (code: string) => Promise<{ success: boolean; message?: string }>;
  captureFromUrl: () => void;
  getCapturedCode: () => string | null;
  clearCapturedCode: () => void;
}

// ─── Constants ───────────────────────────────────────

const REFERRAL_STORAGE_KEY = 'pfwise-referral-code';

// ─── Store ───────────────────────────────────────────

export const useReferralStore = create<ReferralState>()(
  persist(
    (set, get) => ({
      referralCode: null,
      stats: null,
      loading: false,
      applied: false,
      capturedCode: null,

      fetchCode: async () => {
        if (get().loading) return;
        set({ loading: true });

        try {
          const code = await fetchReferralCodeApi();
          set({ referralCode: code, loading: false });
        } catch {
          // サイレントフェイル — バックエンド未デプロイ時を考慮
          set({ loading: false });
        }
      },

      fetchStats: async () => {
        set({ loading: true });

        try {
          const stats = await fetchReferralStatsApi();
          set({ stats, loading: false });
        } catch {
          // サイレントフェイル
          set({ loading: false });
        }
      },

      applyCode: async (code: string) => {
        set({ loading: true });

        try {
          const result = await applyReferralCodeApi(code);
          set({ applied: true, loading: false, capturedCode: null });

          // sessionStorage からもクリア
          try {
            sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
          } catch {
            // sessionStorage が使用不可の場合は無視
          }

          trackEvent(AnalyticsEvents.REFERRAL_CODE_APPLY, { code });
          return { success: true, message: result.message };
        } catch (err: any) {
          set({ loading: false });
          return {
            success: false,
            message: err.message || 'リファラルコードの適用に失敗しました',
          };
        }
      },

      captureFromUrl: () => {
        try {
          const params = new URLSearchParams(window.location.search);
          const refCode = params.get('ref');

          if (refCode && refCode.trim().length > 0) {
            const normalizedCode = refCode.trim().toUpperCase();
            set({ capturedCode: normalizedCode });

            // sessionStorage にも保存（ページ遷移に備えて）
            try {
              sessionStorage.setItem(REFERRAL_STORAGE_KEY, normalizedCode);
            } catch {
              // sessionStorage が使用不可の場合は無視
            }

            trackEvent(AnalyticsEvents.REFERRAL_SIGNUP, { code: normalizedCode });
          }
        } catch {
          // URL解析失敗時は無視
        }
      },

      getCapturedCode: () => {
        const storeCode = get().capturedCode;
        if (storeCode) return storeCode;

        // sessionStorage からフォールバック取得
        try {
          return sessionStorage.getItem(REFERRAL_STORAGE_KEY);
        } catch {
          return null;
        }
      },

      clearCapturedCode: () => {
        set({ capturedCode: null });
        try {
          sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
        } catch {
          // 無視
        }
      },
    }),
    {
      name: 'pfwise-referral',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        capturedCode: state.capturedCode,
        applied: state.applied,
      }),
    }
  )
);
