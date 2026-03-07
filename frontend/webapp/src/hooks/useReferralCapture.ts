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
import { useEffect } from 'react';
import { useReferralStore } from '../stores/referralStore';
import { useAuthStore } from '../stores/authStore';

/**
 * リファラルコードをURLから自動キャプチャし、
 * ログイン後に自動適用するフック
 */
export const useReferralCapture = (): void => {
  const captureFromUrl = useReferralStore((s) => s.captureFromUrl);
  const getCapturedCode = useReferralStore((s) => s.getCapturedCode);
  const applyCode = useReferralStore((s) => s.applyCode);
  const applied = useReferralStore((s) => s.applied);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // URL から ?ref= パラメータをキャプチャ
  useEffect(() => {
    captureFromUrl();
  }, [captureFromUrl]);

  // ログイン後に自動適用
  useEffect(() => {
    if (!isAuthenticated || applied) return;

    const code = getCapturedCode();
    if (!code) return;

    // 非同期で適用（結果はストアで管理）
    applyCode(code);
  }, [isAuthenticated, applied, getCapturedCode, applyCode]);
};

export default useReferralCapture;
