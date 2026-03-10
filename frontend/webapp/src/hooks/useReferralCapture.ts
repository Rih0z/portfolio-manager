/**
 * useReferralCapture — リファラルコード自動キャプチャフック
 *
 * URL の ?ref= パラメータを読み取り、sessionStorage に保存する。
 * ログイン後に自動的にリファラルコードを適用する。
 *
 * 使用方法:
 *   App.tsx で useReferralCapture() を呼び出す。
 *   （ただし App.tsx 自体は変更せず、フックのみ作成）
 *
 * @file src/hooks/useReferralCapture.ts
 */
import { useEffect, useRef } from 'react';
import { useApplyReferral } from './queries';
import { useAuthStore } from '../stores/authStore';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';

const REFERRAL_STORAGE_KEY = 'pfwise-referral-code';
const REFERRAL_APPLIED_KEY = 'pfwise-referral-applied';

/** sessionStorage からキャプチャ済みコードを取得 */
function getCapturedCode(): string | null {
  try {
    return sessionStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** sessionStorage にコードを保存 */
function setCapturedCode(code: string): void {
  try {
    sessionStorage.setItem(REFERRAL_STORAGE_KEY, code);
  } catch {
    // sessionStorage が使用不可の場合は無視
  }
}

/** sessionStorage からコードを削除 */
function clearCapturedCode(): void {
  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // 無視
  }
}

/** 適用済みフラグの取得 */
function isAlreadyApplied(): boolean {
  try {
    return sessionStorage.getItem(REFERRAL_APPLIED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** 適用済みフラグの設定 */
function markAsApplied(): void {
  try {
    sessionStorage.setItem(REFERRAL_APPLIED_KEY, 'true');
  } catch {
    // 無視
  }
}

/**
 * リファラルコードをURLから自動キャプチャし、
 * ログイン後に自動適用するフック
 */
export const useReferralCapture = (): void => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const applyReferralMutation = useApplyReferral();
  const appliedRef = useRef(false);

  // URL から ?ref= パラメータをキャプチャ
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');

      if (refCode && refCode.trim().length > 0) {
        const normalizedCode = refCode.trim().toUpperCase();
        setCapturedCode(normalizedCode);
        trackEvent(AnalyticsEvents.REFERRAL_SIGNUP, { code: normalizedCode });
      }
    } catch {
      // URL解析失敗時は無視
    }
  }, []);

  // ログイン後に自動適用
  useEffect(() => {
    if (!isAuthenticated || appliedRef.current || isAlreadyApplied()) return;

    const code = getCapturedCode();
    if (!code) return;

    applyReferralMutation.mutate(code, {
      onSuccess: () => {
        appliedRef.current = true;
        clearCapturedCode();
        markAsApplied();
        trackEvent(AnalyticsEvents.REFERRAL_CODE_APPLY, { code });
      },
      onError: () => {
        appliedRef.current = false;
      },
    });
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useReferralCapture;
